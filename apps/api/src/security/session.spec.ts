import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, getSession, destroySession } from './session';

class MockRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private sets = new Map<string, Set<string>>();

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

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key)!;
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let rem = 0;
    for (const m of members) {
      if (set.delete(m)) rem++;
    }
    return rem;
  }

  async expire(_key: string, _ttl: number): Promise<number> {
    return 1;
  }
}

describe('Phase 2 — Redis Server-Side Session Store', () => {
  let mockRedis: MockRedis;

  beforeEach(() => {
    mockRedis = new MockRedis();
  });

  it('should create an active session in Redis with opaque UUID and user metadata', async () => {
    const session = await createSession(mockRedis as any, {
      userId: 'user-uuid-123',
      username: 'sr_admin',
      displayName: 'SR Administrator',
      role: 'Super Admin',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest Agent',
    });

    expect(session.sessionId).toBeDefined();
    expect(session.username).toBe('sr_admin');
    expect(session.role).toBe('Super Admin');

    const retrieved = await getSession(mockRedis as any, session.sessionId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe('user-uuid-123');
    expect(retrieved?.role).toBe('Super Admin');
  });

  it('should destroy session on logout', async () => {
    const session = await createSession(mockRedis as any, {
      userId: 'user-uuid-456',
      username: 'staff_member',
      displayName: 'Staff User',
      role: 'Staff',
    });

    // Verify session exists
    expect(await getSession(mockRedis as any, session.sessionId)).not.toBeNull();

    // Destroy session
    await destroySession(mockRedis as any, session.sessionId);

    // Verify session destroyed
    expect(await getSession(mockRedis as any, session.sessionId)).toBeNull();
  });

  it('should reject session if absolute lifetime is exceeded', async () => {
    const session = await createSession(mockRedis as any, {
      userId: 'user-uuid-789',
      username: 'tech_user',
      displayName: 'Technician',
      role: 'Technician',
    });

    // Manually backdate createdAt past absolute lifetime (e.g. 25 hours ago)
    const storedRaw = await mockRedis.get(`crm:session:${session.sessionId}`);
    const stored = JSON.parse(storedRaw!);
    stored.createdAt = Date.now() - 25 * 3600 * 1000;
    await mockRedis.set(`crm:session:${session.sessionId}`, JSON.stringify(stored));

    // Retrieval should reject and purge expired session
    const retrieved = await getSession(mockRedis as any, session.sessionId, 7200, 86400);
    expect(retrieved).toBeNull();
  });
});
