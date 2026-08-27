import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { BackupService } from './backup.service';
import { RestoreService } from './restore.service';
import { BackupValidator } from './backup-validator';
import { StorageEngine } from '../documents/storage-engine';

describe('RestoreService Unit Tests', () => {
  const testBackupDir = path.join(process.cwd(), 'storage', 'test-restore-backups');
  const testDocDir = path.join(process.cwd(), 'storage', 'test-restore-docs');
  let storage: StorageEngine;
  let backupService: BackupService;
  let validator: BackupValidator;
  let restoreService: RestoreService;

  beforeEach(() => {
    storage = new StorageEngine(testDocDir);
    backupService = new BackupService(testBackupDir, storage);
    validator = new BackupValidator();
    restoreService = new RestoreService(backupService, validator, storage);
  });

  afterEach(() => {
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testDocDir)) {
      fs.rmSync(testDocDir, { recursive: true, force: true });
    }
  });

  it('rejects restore execution without explicit confirmation flag', async () => {
    await expect(
      restoreService.executeRestore('some-backup-id', { confirmAction: false })
    ).rejects.toThrow(/confirmation.*required/);
  });

  it('verifies restore safety guard when backup file is missing or invalid', async () => {
    await expect(
      restoreService.executeRestore('non-existent-backup-id', { confirmAction: true })
    ).rejects.toThrow(/not found on storage/);
  });
});
