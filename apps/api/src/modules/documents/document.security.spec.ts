import { describe, it, expect } from 'vitest';
import { StorageEngine } from './storage-engine';

describe('Document Security Hardening Tests', () => {
  const storage = new StorageEngine();

  it('strictly blocks common web shell and script extensions', () => {
    const maliciousExtensions = ['php', 'exe', 'bat', 'cmd', 'ps1', 'vbs', 'js', 'sh', 'zip', 'rar'];
    for (const ext of maliciousExtensions) {
      const validation = storage.validateExtension(ext);
      expect(validation.valid).toBe(false);
    }
  });

  it('rejects double extension evasion attempts and path traversal in filename', () => {
    expect(storage.isSafeFilename('../invoice.pdf.exe')).toBe(false);
    expect(storage.isSafeFilename('..\\..\\windows\\system32\\calc.exe')).toBe(false);
    expect(storage.isSafeFilename('/etc/passwd')).toBe(false);
  });

  it('prevents directory escape when resolving absolute path', () => {
    expect(() => {
      storage.resolveAbsolutePath('../../outside.txt');
    }).toThrow(/Path traversal/);
  });
});
