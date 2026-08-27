import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './argon2.js';

describe('Argon2id Security Module', () => {
  it('should hash and verify passwords correctly', async () => {
    const password = 'CorrectHorseBatteryStaple123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');

    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword(hash, 'WrongPassword123!');
    expect(isInvalid).toBe(false);
  });

  it('should fail cleanly on empty passwords', async () => {
    await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
  });
});
