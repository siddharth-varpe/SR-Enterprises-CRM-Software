import { describe, it, expect } from 'vitest';
import { parseEnv } from './env.js';

describe('Environment Configuration Parser', () => {
  it('should parse valid default environment variables', () => {
    const config = parseEnv({
      NODE_ENV: 'test',
      PORT: '5000',
      COOKIE_SECRET: 'super_secret_cookie_key_16_chars',
      SESSION_SECRET: 'super_secret_session_key_16_chars',
    });

    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(5000);
    expect(config.COOKIE_SECRET).toBe('super_secret_cookie_key_16_chars');
  });

  it('should throw an error on invalid configuration', () => {
    expect(() => {
      parseEnv({
        NODE_ENV: 'invalid_env' as any,
        PORT: 'not-a-number',
      });
    }).toThrow('Environment validation failed');
  });
});
