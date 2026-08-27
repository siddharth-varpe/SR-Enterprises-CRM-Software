import type { Redis } from 'ioredis';

export interface LockoutCheckResult {
  isLocked: boolean;
  remainingSeconds?: number;
}

export interface FailedAttemptResult {
  isLocked: boolean;
  attempts: number;
  remainingAttempts: number;
  lockoutSeconds?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_LOCKOUT_SECONDS = 900; // 15 minutes

/**
 * Check if a username is currently locked out
 */
export async function checkAccountLockout(
  redis: Redis | any,
  username: string
): Promise<LockoutCheckResult> {
  const normalizedUsername = username.trim().toLowerCase();
  const lockoutKey = `crm:lockout:locked:${normalizedUsername}`;

  const ttl = await redis.ttl(lockoutKey);
  if (ttl > 0) {
    return {
      isLocked: true,
      remainingSeconds: ttl,
    };
  }

  return { isLocked: false };
}

/**
 * Record a failed authentication attempt
 * If failed attempts reach `maxAttempts`, automatically trigger account lockout
 */
export async function recordFailedLogin(
  redis: Redis | any,
  username: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  lockoutSeconds = DEFAULT_LOCKOUT_SECONDS
): Promise<FailedAttemptResult> {
  const normalizedUsername = username.trim().toLowerCase();
  const attemptsKey = `crm:lockout:attempts:${normalizedUsername}`;
  const lockoutKey = `crm:lockout:locked:${normalizedUsername}`;

  // Increment failed attempts counter in Redis
  const attempts = await redis.incr(attemptsKey);

  // Set expiration on attempt counter if newly created
  if (attempts === 1) {
    await redis.expire(attemptsKey, lockoutSeconds);
  }

  if (attempts >= maxAttempts) {
    // Lock the account for the lockout duration
    await redis.set(lockoutKey, '1', 'EX', lockoutSeconds);
    // Reset attempt counter so after lockout expires the user gets fresh attempts
    await redis.del(attemptsKey);

    return {
      isLocked: true,
      attempts,
      remainingAttempts: 0,
      lockoutSeconds,
    };
  }

  const remainingAttempts = Math.max(0, maxAttempts - attempts);
  return {
    isLocked: false,
    attempts,
    remainingAttempts,
  };
}

/**
 * Reset failed login attempts upon successful authentication
 */
export async function resetAccountLockout(
  redis: Redis | any,
  username: string
): Promise<void> {
  const normalizedUsername = username.trim().toLowerCase();
  const attemptsKey = `crm:lockout:attempts:${normalizedUsername}`;
  const lockoutKey = `crm:lockout:locked:${normalizedUsername}`;

  await redis.del(attemptsKey, lockoutKey);
}
