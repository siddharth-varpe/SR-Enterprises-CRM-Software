import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { StorageEngine } from './storage-engine';

describe('StorageEngine Unit Tests', () => {
  const testStorageDir = path.join(process.cwd(), 'storage', 'test-docs');
  let storage: StorageEngine;

  beforeEach(() => {
    storage = new StorageEngine(testStorageDir);
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  describe('Path Traversal & Filename Sanitization', () => {
    it('detects and rejects path traversal sequences', () => {
      expect(storage.isSafeFilename('../malicious.exe')).toBe(false);
      expect(storage.isSafeFilename('..\\malicious.exe')).toBe(false);
      expect(storage.isSafeFilename('folder/file.pdf')).toBe(false);
      expect(storage.isSafeFilename('file\0name.pdf')).toBe(false);
      expect(storage.isSafeFilename('C:\\boot.ini')).toBe(false);
      expect(storage.isSafeFilename('invoice.pdf')).toBe(true);
    });

    it('sanitizes dangerous original filenames safely', () => {
      const sanitized = storage.sanitizeOriginalFilename('../../dangerous<script>file.pdf');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized.endsWith('file.pdf')).toBe(true);
    });
  });

  describe('File Extension & Magic Bytes Validation', () => {
    it('validates allowed vs blocked file extensions', () => {
      expect(storage.validateExtension('pdf').valid).toBe(true);
      expect(storage.validateExtension('png').valid).toBe(true);
      expect(storage.validateExtension('jpg').valid).toBe(true);
      expect(storage.validateExtension('docx').valid).toBe(true);
      expect(storage.validateExtension('exe').valid).toBe(false);
      expect(storage.validateExtension('bat').valid).toBe(false);
      expect(storage.validateExtension('ps1').valid).toBe(false);
      expect(storage.validateExtension('zip').valid).toBe(false);
    });

    it('validates PDF magic bytes (%PDF-)', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4 sample content');
      const invalidPdfBuffer = Buffer.from('NOT A PDF');

      expect(storage.validateMagicBytes(validPdfBuffer, 'pdf')).toBe(true);
      expect(storage.validateMagicBytes(invalidPdfBuffer, 'pdf')).toBe(false);
    });

    it('validates PNG magic bytes', () => {
      const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const invalidPngBuffer = Buffer.from([0x00, 0x11, 0x22]);

      expect(storage.validateMagicBytes(validPngBuffer, 'png')).toBe(true);
      expect(storage.validateMagicBytes(invalidPngBuffer, 'png')).toBe(false);
    });

    it('validates JPEG magic bytes', () => {
      const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const invalidJpgBuffer = Buffer.from([0x12, 0x34, 0x56]);

      expect(storage.validateMagicBytes(validJpgBuffer, 'jpg')).toBe(true);
      expect(storage.validateMagicBytes(invalidJpgBuffer, 'jpg')).toBe(false);
    });
  });

  describe('File Storage, SHA-256 & Reading', () => {
    it('calculates cryptographic SHA-256 hash correctly', () => {
      const sample = Buffer.from('SR Enterprises Test File Content');
      const hash = storage.calculateSha256(sample);
      expect(hash).toBe('f98fa165e79acc852af74591e9cfa33370190284e47e014f8bb6f66d49554145');
    });

    it('stores and reads file buffer atomically', async () => {
      const sample = Buffer.from('%PDF-1.4 Invoice Data');
      const stored = await storage.storeFile(sample, 'pdf');

      expect(stored.storedFilename).toMatch(/\.pdf$/);
      expect(fs.existsSync(stored.absolutePath)).toBe(true);

      const readBuffer = await storage.readFile(stored.storagePath);
      expect(readBuffer.toString()).toBe(sample.toString());

      await storage.deleteFile(stored.storagePath);
      expect(fs.existsSync(stored.absolutePath)).toBe(false);
    });
  });
});
