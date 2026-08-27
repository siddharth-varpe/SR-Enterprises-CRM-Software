import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import treeKill from 'tree-kill';
import type { AppStoragePaths } from './storage-paths.js';

export interface BackendOptions {
  port: number;
  host: string;
  storagePaths: AppStoragePaths;
  isDevelopment: boolean;
  appRoot: string;
}

export class BackendManager {
  private childProcess: ChildProcess | null = null;
  private isStopping: boolean = false;
  private options: BackendOptions;

  constructor(options: BackendOptions) {
    this.options = options;
  }

  /**
   * Check if backend health endpoint is responding HTTP 200
   */
  public async checkHealth(timeoutMs: number = 2000): Promise<{ healthy: boolean; status?: string }> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${this.options.host}:${this.options.port}/health`,
        { timeout: timeoutMs },
        (res) => {
          if (res.statusCode === 200) {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                resolve({ healthy: true, status: parsed.status });
              } catch {
                resolve({ healthy: true });
              }
            });
          } else {
            resolve({ healthy: false });
          }
        }
      );

      req.on('error', () => {
        resolve({ healthy: false });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ healthy: false });
      });
    });
  }

  /**
   * Poll health check with exponential retry until healthy or timeout
   */
  public async waitForHealth(maxWaitMs: number = 15000, intervalMs: number = 500): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const health = await this.checkHealth(1500);
      if (health.healthy) {
        return true;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return false;
  }

  /**
   * Start local Fastify backend child process
   */
  public async start(): Promise<boolean> {
    // 1. Check if backend is already running (e.g. during dev mode)
    const initialHealth = await this.checkHealth(1000);
    if (initialHealth.healthy) {
      console.log(`[BackendManager] Local backend is already healthy on http://${this.options.host}:${this.options.port}`);
      return true;
    }

    console.log(`[BackendManager] Starting local backend process on ${this.options.host}:${this.options.port}...`);

    // 2. Resolve backend entrypoint
    const apiDistEntry = path.resolve(this.options.appRoot, '../api/dist/server.js');
    const apiSrcEntry = path.resolve(this.options.appRoot, '../api/src/server.ts');

    let command = process.execPath; // node / electron
    let args: string[] = [];

    if (fs.existsSync(apiDistEntry)) {
      command = 'node';
      args = [apiDistEntry];
    } else if (fs.existsSync(apiSrcEntry)) {
      command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      args = ['tsx', apiSrcEntry];
    } else {
      console.warn('[BackendManager] Backend script not found directly, trying npm workspace script');
      command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
      args = ['--filter', '@crm/api', 'start'];
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(this.options.port),
      HOST: this.options.host,
      NODE_ENV: this.options.isDevelopment ? 'development' : 'production',
      CRM_STORAGE_DIR: this.options.storagePaths.baseDir,
      CRM_ATTACHMENTS_DIR: this.options.storagePaths.attachmentsDir,
      CRM_BACKUPS_DIR: this.options.storagePaths.backupsDir,
      CRM_LOGS_DIR: this.options.storagePaths.logsDir,
    };

    try {
      this.childProcess = spawn(command, args, {
        cwd: path.resolve(this.options.appRoot, '../api'),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true,
      });

      if (this.childProcess.stdout) {
        this.childProcess.stdout.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            console.log(`[Backend Output] ${message}`);
          }
        });
      }

      if (this.childProcess.stderr) {
        this.childProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            console.error(`[Backend Stderr] ${message}`);
          }
        });
      }

      this.childProcess.on('exit', (code, signal) => {
        console.log(`[BackendManager] Backend process exited with code ${code}, signal ${signal}`);
        this.childProcess = null;
      });

      // 3. Wait for backend to pass health check
      const healthy = await this.waitForHealth(20000, 500);
      if (!healthy) {
        console.error('[BackendManager] Backend failed to become healthy within timeout.');
        return false;
      }

      console.log('✅ [BackendManager] Local backend is ready and verified healthy.');
      return true;
    } catch (err) {
      console.error('[BackendManager] Failed to spawn backend process:', err);
      return false;
    }
  }

  /**
   * Gracefully stop the backend child process
   */
  public async stop(): Promise<void> {
    if (this.isStopping || !this.childProcess || !this.childProcess.pid) {
      return;
    }

    this.isStopping = true;
    const pid = this.childProcess.pid;
    console.log(`[BackendManager] Gracefully terminating backend process tree (PID: ${pid})...`);

    return new Promise((resolve) => {
      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          console.warn(`[BackendManager] Tree-kill SIGTERM failed, forcing SIGKILL:`, err);
          treeKill(pid, 'SIGKILL', () => {
            this.childProcess = null;
            this.isStopping = false;
            resolve();
          });
        } else {
          this.childProcess = null;
          this.isStopping = false;
          resolve();
        }
      });
    });
  }
}
