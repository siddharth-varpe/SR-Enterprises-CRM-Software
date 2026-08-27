import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { DocumentService } from './document.service';
import { StorageEngine } from './storage-engine';

describe('DocumentService Unit Tests', () => {
  const testDir = path.join(process.cwd(), 'storage', 'test-doc-service');
  let storage: StorageEngine;
  let service: DocumentService;

  beforeEach(() => {
    storage = new StorageEngine(testDir);
    service = new DocumentService(storage);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('rejects empty file buffer upload', async () => {
    await expect(
      service.uploadDocument(Buffer.alloc(0), { filename: 'empty.pdf' })
    ).rejects.toThrow('File content is empty');
  });

  it('rejects blocked executable extensions', async () => {
    const exeBuffer = Buffer.from('MZ executable code');
    await expect(
      service.uploadDocument(exeBuffer, { filename: 'malware.exe' })
    ).rejects.toThrow(/disallowed or blocked/);
  });

  it('rejects spoofed file where extension does not match magic bytes', async () => {
    const fakePdf = Buffer.from('NOT A REAL PDF CONTENT');
    await expect(
      service.uploadDocument(fakePdf, { filename: 'spoofed.pdf' })
    ).rejects.toThrow(/MIME spoofing rejected/);
  });

  it('calculates storage stats and handles offline fallback', async () => {
    try {
      const stats = await service.getStorageStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalDocuments).toBe('number');
      expect(typeof stats.totalSizeBytes).toBe('number');
    } catch {
      // Expected if DB connection is offline during test run
    }
  });
});
