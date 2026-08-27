import { describe, it, expect, beforeEach } from 'vitest';
import { checkAccountLockout, recordFailedLogin, resetAccountLockout } from './lockout';

// In-memory Mock Redis for isolated unit testing
class MockRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async set(key: string, value: string, _mode?: string, ttlSeconds?: number): Promise<'OK'> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async incr(key: string): Promise<number> {
    const cur = await this.get(key);
    const newVal = cur ? parseInt(cur, 10) + 1 : 1;
    await this.set(key, String(newVal));
    return newVal;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + ttlSeconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    const remainingMs = item.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }
}

describe('Phase 2 — 3-Attempt Account Lockout Defense', () => {
  let mockRedis: MockRedis;

  beforeEach(() => {
    mockRedis = new MockRedis();
  });

  it('should allow initial attempts and decrement remaining attempts', async () => {
    const username = 'admin_user';

    // Check initially not locked
    const initialCheck = await checkAccountLockout(mockRedis as any, username);
    expect(initialCheck.isLocked).toBe(false);

    // Attempt 1
    const attempt1 = await recordFailedLogin(mockRedis as any, username, 3, 900);
    expect(attempt1.isLocked).toBe(false);
    expect(attempt1.attempts).toBe(1);
    expect(attempt1.remainingAttempts).toBe(2);

    // Attempt 2
    const attempt2 = await recordFailedLogin(mockRedis as any, username, 3, 900);
    expect(attempt2.isLocked).toBe(false);
    expect(attempt2.attempts).toBe(2);
    expect(attempt2.remainingAttempts).toBe(1);
  });

  it('should trigger account lockout immediately upon 3rd failed attempt', async () => {
    const username = 'target_user';

    // 1st attempt
    await recordFailedLogin(mockRedis as any, username, 3, 900);
    // 2nd attempt
    await recordFailedLogin(mockRedis as any, username, 3, 900);
    // 3rd attempt
    const attempt3 = await recordFailedLogin(mockRedis as any, username, 3, 900);

    expect(attempt3.isLocked).toBe(true);
    expect(attempt3.remainingAttempts).toBe(0);
    expect(attempt3.lockoutSeconds).toBe(900);

    // Check status check recognizes lockout
    const status = await checkAccountLockout(mockRedis as any, username);
    expect(status.isLocked).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(0);
  });

  it('should reset failed attempts upon successful login', async () => {
    const username = 'recovery_user';

    // 2 failed attempts
    await recordFailedLogin(mockRedis as any, username, 3, 900);
    await recordFailedLogin(mockRedis as any, username, 3, 900);

    // Successful login reset
    await resetAccountLockout(mockRedis as any, username);

    // Next failure should start back at attempt 1
    const nextAttempt = await recordFailedLogin(mockRedis as any, username, 3, 900);
    expect(nextAttempt.attempts).toBe(1);
    expect(nextAttempt.remainingAttempts).toBe(2);
    expect(nextAttempt.isLocked).toBe(false);
  });
});
