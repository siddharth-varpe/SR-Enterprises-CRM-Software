import crypto from 'node:crypto';
import type { Redis } from 'ioredis';
import type { UserRole } from '@crm/types';

export interface SessionData {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
  lastActivityAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionParams {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export const SESSION_ABSOLUTE_TIMEOUT_SECONDS = 86400; // 24 Hours
export const SESSION_IDLE_TIMEOUT_SECONDS = 7200; // 2 Hours

/**
 * Create a new server-side session in Redis
 */
export async function createSession(
  redis: Redis | any,
  params: CreateSessionParams,
  idleTtlSeconds = SESSION_IDLE_TIMEOUT_SECONDS
): Promise<SessionData> {
  const sessionId = crypto.randomUUID();
  const now = Date.now();

  const session: SessionData = {
    sessionId,
    userId: params.userId,
    username: params.username,
    displayName: params.displayName,
    role: params.role,
    createdAt: now,
    lastActivityAt: now,
    ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    ...(params.userAgent ? { userAgent: params.userAgent } : {}),
  };

  const key = `crm:session:${sessionId}`;
  await redis.set(key, JSON.stringify(session), 'EX', idleTtlSeconds);

  // Also maintain user active sessions set for revocation/concurrent tracking
  const userSessionsKey = `crm:user_sessions:${params.userId}`;
  await redis.sadd(userSessionsKey, sessionId);
  await redis.expire(userSessionsKey, SESSION_ABSOLUTE_TIMEOUT_SECONDS);

  return session;
}

/**
 * Retrieve and refresh an active server-side session from Redis
 * Sliding Window: Resets the idle TTL on active request
 */
export async function getSession(
  redis: Redis | any,
  sessionId: string | undefined,
  idleTtlSeconds = SESSION_IDLE_TIMEOUT_SECONDS,
  absoluteTtlSeconds = SESSION_ABSOLUTE_TIMEOUT_SECONDS
): Promise<SessionData | null> {
  if (!sessionId) return null;

  const key = `crm:session:${sessionId}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as SessionData;
    const now = Date.now();

    // Check absolute lifetime
    const elapsedSeconds = Math.floor((now - session.createdAt) / 1000);
    if (elapsedSeconds > absoluteTtlSeconds) {
      await destroySession(redis, sessionId);
      return null;
    }

    // Update last activity and slide Redis TTL
    session.lastActivityAt = now;
    await redis.set(key, JSON.stringify(session), 'EX', idleTtlSeconds);

    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Invalidate and destroy a server-side session
 */
export async function destroySession(
  redis: Redis | any,
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId) return;

  const key = `crm:session:${sessionId}`;
  const raw = await redis.get(key);
  if (raw) {
    try {
      const session = JSON.parse(raw) as SessionData;
      await redis.srem(`crm:user_sessions:${session.userId}`, sessionId);
    } catch {
      // Ignore parse error on cleanup
    }
  }

  await redis.del(key);
}
