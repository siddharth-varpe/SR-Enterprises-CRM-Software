import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

export interface AppStoragePaths {
  baseDir: string;
  databaseDir: string;
  backupsDir: string;
  logsDir: string;
  attachmentsDir: string;
  configDir: string;
}

/**
 * Resolves standard OS application data location for SR Enterprises CRM.
 * Windows: %APPDATA%\SR-Enterprises-CRM
 * macOS: ~/Library/Application Support/SR-Enterprises-CRM
 * Linux: ~/.config/sr-enterprises-crm
 */
export function getStoragePaths(customBaseDir?: string): AppStoragePaths {
  let baseDir = customBaseDir;

  if (!baseDir) {
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      baseDir = path.join(appData, 'SR-Enterprises-CRM');
    } else if (process.platform === 'darwin') {
      baseDir = path.join(os.homedir(), 'Library', 'Application Support', 'SR-Enterprises-CRM');
    } else {
      baseDir = path.join(os.homedir(), '.config', 'sr-enterprises-crm');
    }
  }

  const databaseDir = path.join(baseDir, 'database');
  const backupsDir = path.join(baseDir, 'backups');
  const logsDir = path.join(baseDir, 'logs');
  const attachmentsDir = path.join(baseDir, 'attachments');
  const configDir = path.join(baseDir, 'configuration');

  return {
    baseDir,
    databaseDir,
    backupsDir,
    logsDir,
    attachmentsDir,
    configDir,
  };
}

/**
 * Initializes and ensures all required user data storage directories exist safely
 */
export function initializeStorageDirectories(customBaseDir?: string): AppStoragePaths {
  const paths = getStoragePaths(customBaseDir);

  const dirsToCreate = [
    paths.baseDir,
    paths.databaseDir,
    paths.backupsDir,
    paths.logsDir,
    paths.attachmentsDir,
    paths.configDir,
  ];

  for (const dir of dirsToCreate) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  return paths;
}
