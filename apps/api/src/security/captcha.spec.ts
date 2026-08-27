import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRandomText,
  renderCaptchaSvg,
  createCaptchaChallenge,
  validateCaptcha,
} from './captcha';

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

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async getdel(key: string): Promise<string | null> {
    const val = await this.get(key);
    this.store.delete(key);
    return val;
  }
}

describe('5-Character Purple CAPTCHA Security Module', () => {
  let mockRedis: MockRedis;

  beforeEach(() => {
    mockRedis = new MockRedis();
  });

  it('should generate a 5-character non-ambiguous random text challenge', () => {
    const text = generateRandomText(5);
    expect(text).toHaveLength(5);
    expect(text).toMatch(/^[23456789ACDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    // Visual ambiguity check: no 0, O, 1, I, l
    expect(text).not.toMatch(/[0O1Il]/);
  });

  it('should render a clean, purple SVG representation with noise', () => {
    const svg = renderCaptchaSvg('74KB9');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('7');
    expect(svg).toContain('4');
    expect(svg).toContain('K');
    expect(svg).toContain('B');
    expect(svg).toContain('9');
    expect(svg).toContain('#5B3EBB');
  });

  it('should create a challenge and store the 5-char answer in Redis with TTL', async () => {
    const challenge = await createCaptchaChallenge(mockRedis as any, 300);

    expect(challenge.challengeId).toBeDefined();
    expect(challenge.svg).toContain('<svg');

    const key = `crm:captcha:${challenge.challengeId}`;
    const stored = await mockRedis.get(key);
    expect(stored).toBeTruthy();
    expect(stored).toHaveLength(5);
  });

  it('should successfully validate matching user input (case-insensitive) and atomically delete the challenge (single-use)', async () => {
    const challenge = await createCaptchaChallenge(mockRedis as any, 300);
    const key = `crm:captcha:${challenge.challengeId}`;
    const storedAnswer = (await mockRedis.get(key))!;

    // Test case-insensitive input
    const result = await validateCaptcha(mockRedis as any, challenge.challengeId, storedAnswer.toLowerCase());
    expect(result.isValid).toBe(true);

    // Single-use check: Trying to validate again must fail because it was deleted
    const replayResult = await validateCaptcha(mockRedis as any, challenge.challengeId, storedAnswer);
    expect(replayResult.isValid).toBe(false);
    expect(replayResult.reason).toBe('EXPIRED');
  });

  it('should reject incorrect CAPTCHA answer and still consume the challenge', async () => {
    const challenge = await createCaptchaChallenge(mockRedis as any, 300);

    const result = await validateCaptcha(mockRedis as any, challenge.challengeId, 'WRONG');
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('MISMATCH');

    // Second attempt fails with expired because it was consumed on first attempt
    const secondResult = await validateCaptcha(mockRedis as any, challenge.challengeId, 'WRONG');
    expect(secondResult.isValid).toBe(false);
    expect(secondResult.reason).toBe('EXPIRED');
  });
});
