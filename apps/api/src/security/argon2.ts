import argon2 from 'argon2';

/**
 * Recommended Argon2id parameters according to OWASP / security best practices
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 threads
  hashLength: 32,
};

/**
 * Hash a plaintext password using Argon2id
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return argon2.hash(plainText, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against an Argon2id hash
 */
export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  if (!hash || !plainText) {
    return false;
  }
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}
