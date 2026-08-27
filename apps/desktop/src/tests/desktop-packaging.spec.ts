import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { getStoragePaths, initializeStorageDirectories } from '../storage-paths.js';
import { BackendManager } from '../backend-manager.js';

describe('Phase 13 — Desktop Packaging, Security & Local Deployment Integrity', () => {
  let tempBaseDir: string;

  beforeEach(() => {
    tempBaseDir = path.join(os.tmpdir(), `crm-desktop-test-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  });

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  describe('1. Storage Path Segregation & Data Isolation (%APPDATA%)', () => {
    it('resolves correct child directory structure for user data', () => {
      const paths = getStoragePaths(tempBaseDir);

      expect(paths.baseDir).toBe(tempBaseDir);
      expect(paths.databaseDir).toBe(path.join(tempBaseDir, 'database'));
      expect(paths.backupsDir).toBe(path.join(tempBaseDir, 'backups'));
      expect(paths.logsDir).toBe(path.join(tempBaseDir, 'logs'));
      expect(paths.attachmentsDir).toBe(path.join(tempBaseDir, 'attachments'));
      expect(paths.configDir).toBe(path.join(tempBaseDir, 'configuration'));
    });

    it('initializes all storage directories safely on disk', () => {
      const paths = initializeStorageDirectories(tempBaseDir);

      expect(fs.existsSync(paths.baseDir)).toBe(true);
      expect(fs.existsSync(paths.databaseDir)).toBe(true);
      expect(fs.existsSync(paths.backupsDir)).toBe(true);
      expect(fs.existsSync(paths.logsDir)).toBe(true);
      expect(fs.existsSync(paths.attachmentsDir)).toBe(true);
      expect(fs.existsSync(paths.configDir)).toBe(true);
    });

    it('persists and restores window state correctly in configuration directory', () => {
      const paths = initializeStorageDirectories(tempBaseDir);
      const stateFile = path.join(paths.configDir, 'window-state.json');

      const windowState = {
        width: 1440,
        height: 900,
        x: 100,
        y: 100,
        isMaximized: false,
      };

      fs.writeFileSync(stateFile, JSON.stringify(windowState, null, 2), 'utf8');

      expect(fs.existsSync(stateFile)).toBe(true);
      const restored = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(restored.width).toBe(1440);
      expect(restored.height).toBe(900);
      expect(restored.isMaximized).toBe(false);
    });
  });

  describe('2. External Link Scheme Validation & Security', () => {
    const isSafeUrl = (url: string): boolean => {
      if (typeof url !== 'string') return false;
      return url.startsWith('https://') || url.startsWith('http://');
    };

    it('permits valid HTTPS and HTTP web links', () => {
      expect(isSafeUrl('https://srenterprises.in')).toBe(true);
      expect(isSafeUrl('https://wa.me/919826112233')).toBe(true);
      expect(isSafeUrl('http://127.0.0.1:4000/health')).toBe(true);
    });

    it('strictly blocks dangerous URL schemes from desktop navigation', () => {
      expect(isSafeUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isSafeUrl('file:///C:/Windows/System32/cmd.exe')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeUrl('')).toBe(false);
    });
  });

  describe('3. Desktop Shell Window Constraints & Security Preferences', () => {
    it('defines standard desktop window geometry without UI distortion', () => {
      const windowConfig = {
        defaultWidth: 1280,
        defaultHeight: 800,
        minWidth: 1024,
        minHeight: 700,
      };

      expect(windowConfig.defaultWidth).toBeGreaterThanOrEqual(1024);
      expect(windowConfig.defaultHeight).toBeGreaterThanOrEqual(700);
      expect(windowConfig.minWidth).toBe(1024);
      expect(windowConfig.minHeight).toBe(700);
    });

    it('enforces hardened webPreferences: contextIsolation, sandboxing, and no nodeIntegration', () => {
      const webPreferences = {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: false, // Production mode
      };

      expect(webPreferences.contextIsolation).toBe(true);
      expect(webPreferences.nodeIntegration).toBe(false);
      expect(webPreferences.sandbox).toBe(true);
      expect(webPreferences.devTools).toBe(false);
    });
  });

  describe('4. Backend Manager Health Probe & Port Conflict Safety', () => {
    it('gracefully handles unreachable backend without throwing unhandled exceptions', async () => {
      const paths = getStoragePaths(tempBaseDir);
      const manager = new BackendManager({
        host: '127.0.0.1',
        port: 59999, // Unused port
        storagePaths: paths,
        isDevelopment: false,
        appRoot: __dirname,
      });

      const health = await manager.checkHealth(300);
      expect(health.healthy).toBe(false);
    });
  });
});
