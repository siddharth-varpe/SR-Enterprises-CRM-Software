import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeCsvCell, formatCsvRow } from './csv-sanitizer';
import { JobCardsService } from '../modules/job-cards/job-cards.service';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { MetaWhatsAppProvider } from '../modules/whatsapp/whatsapp.provider';
import { recordFailedLogin, checkAccountLockout, resetAccountLockout } from './lockout';
import { createCaptchaChallenge, validateCaptcha } from './captcha';
import crypto from 'node:crypto';

// In-memory Redis Mock for deterministic security testing
class MockRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      expiresAt = Date.now() + args[1] * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const val = current ? parseInt(current, 10) + 1 : 1;
    this.store.set(key, { value: String(val) });
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async getdel(key: string): Promise<string | null> {
    const val = await this.get(key);
    this.store.delete(key);
    return val;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    return Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000));
  }
}

describe('Phase 11 — Security Hardening Test Suite', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = new MockRedis();
  });

  describe('1. Brute-Force & Account Lockout Defense', () => {
    it('should lock an account after 3 failed login attempts', async () => {
      const username = 'test_user';

      // 1st failed attempt
      let res = await recordFailedLogin(mockRedis, username);
      expect(res.isLocked).toBe(false);
      expect(res.remainingAttempts).toBe(2);

      // 2nd failed attempt
      res = await recordFailedLogin(mockRedis, username);
      expect(res.isLocked).toBe(false);
      expect(res.remainingAttempts).toBe(1);

      // 3rd failed attempt -> triggers lockout
      res = await recordFailedLogin(mockRedis, username);
      expect(res.isLocked).toBe(true);
      expect(res.remainingAttempts).toBe(0);

      // Check lockout status
      const lockoutStatus = await checkAccountLockout(mockRedis, username);
      expect(lockoutStatus.isLocked).toBe(true);
      expect(lockoutStatus.remainingSeconds).toBeGreaterThan(0);
    });

    it('should reset lockout counters upon successful authentication', async () => {
      const username = 'reset_user';
      await recordFailedLogin(mockRedis, username);
      await recordFailedLogin(mockRedis, username);

      await resetAccountLockout(mockRedis, username);

      const status = await checkAccountLockout(mockRedis, username);
      expect(status.isLocked).toBe(false);
    });
  });

  describe('2. Single-Use CAPTCHA & Anti-Replay Verification', () => {
    it('should prevent replay attacks by invalidating CAPTCHA upon first verification', async () => {
      const challenge = await createCaptchaChallenge(mockRedis, 300);
      expect(challenge.challengeId).toBeDefined();

      // Retrieve the generated text stored in mockRedis
      const stored = await mockRedis.get(`crm:captcha:${challenge.challengeId}`);
      expect(stored).toBeDefined();

      // 1st validation -> Success
      const firstCheck = await validateCaptcha(mockRedis, challenge.challengeId, stored);
      expect(firstCheck.isValid).toBe(true);

      // 2nd validation (Replay Attempt) -> Must fail immediately
      const replayCheck = await validateCaptcha(mockRedis, challenge.challengeId, stored);
      expect(replayCheck.isValid).toBe(false);
      expect(replayCheck.reason).toBe('EXPIRED');
    });
  });

  describe('3. CSV Formula Injection Sanitization', () => {
    it('should prefix dangerous formula execution characters (=, +, -, @, \\t, \\r) with a single quote', () => {
      expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("\"'=cmd|' /C calc'!A0\"");
      expect(sanitizeCsvCell('+123456789')).toBe("\"'+123456789\"");
      expect(sanitizeCsvCell('-2+3+cmd|')).toBe("\"'-2+3+cmd|\"");
      expect(sanitizeCsvCell('@SUM(1,2)')).toBe("\"'@SUM(1,2)\"");
      expect(sanitizeCsvCell('\tINJECT')).toBe("\"'\tINJECT\"");
      expect(sanitizeCsvCell('\rINJECT')).toBe("\"'\rINJECT\"");
    });

    it('should safely escape normal strings, quotes, and format clean rows', () => {
      expect(sanitizeCsvCell('Commercial RO 50 LPH')).toBe('"Commercial RO 50 LPH"');
      expect(sanitizeCsvCell('Water "Special" Filter')).toBe('"Water ""Special"" Filter"');
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');

      const row = formatCsvRow(['Commercial RO', '=2+2', 5000]);
      expect(row).toBe('"Commercial RO","\'=2+2","5000"\n');
    });
  });

  describe('4. Object-Level Authorization (IDOR Protection)', () => {
    const jobCardsService = new JobCardsService();

    it('should allow Super Admin and Admin to access any Job Card', () => {
      const mockJob = { id: 'job-123', technicianId: 'tech-999' };

      expect(() => {
        (jobCardsService as any).assertJobCardAccess(mockJob, {
          userId: 'admin-001',
          role: 'Super Admin',
        });
      }).not.toThrow();

      expect(() => {
        (jobCardsService as any).assertJobCardAccess(mockJob, {
          userId: 'admin-002',
          role: 'Admin',
        });
      }).not.toThrow();
    });

    it('should allow a Technician to access their own assigned Job Card', () => {
      const mockJob = { id: 'job-123', technicianId: 'tech-100' };

      expect(() => {
        (jobCardsService as any).assertJobCardAccess(mockJob, {
          userId: 'tech-100',
          role: 'Technician',
        });
      }).not.toThrow();
    });

    it('should reject a Technician with 403 Forbidden when attempting to access another technician job card', () => {
      const mockJob = { id: 'job-123', technicianId: 'tech-999' };

      expect(() => {
        (jobCardsService as any).assertJobCardAccess(mockJob, {
          userId: 'tech-100',
          role: 'Technician',
        });
      }).toThrowError(/Access denied: You are not authorized to view or modify this job card./);
    });
  });

  describe('5. Financial Data Protection & Role Scoping', () => {
    const analyticsService = new AnalyticsService();

    it('should authorize Super Admin, Admin, and Staff, while strictly blocking field Technicians', () => {
      expect(analyticsService.checkFinancialPermission('Super Admin')).toBe(true);
      expect(analyticsService.checkFinancialPermission('Admin')).toBe(true);
      expect(analyticsService.checkFinancialPermission('Staff')).toBe(true);
      expect(analyticsService.checkFinancialPermission('Technician')).toBe(false);
    });
  });

  describe('6. Webhook HMAC SHA-256 Signature Verification', () => {
    const appSecret = 'sr_enterprises_test_secret_key_12345';
    const provider = new MetaWhatsAppProvider({
      appSecret,
      phoneNumberId: 'phone_123',
      accessToken: 'token_123',
    });

    it('should accept valid HMAC SHA-256 webhook signatures', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
      const hmac = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
      const signatureHeader = `sha256=${hmac}`;

      const isValid = provider.validateWebhookSignature(payload, signatureHeader);
      expect(isValid).toBe(true);
    });

    it('should reject tampered or forged webhook payloads', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
      const tamperedPayload = JSON.stringify({ object: 'whatsapp_business_account', entry: ['tampered'] });
      const hmac = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
      const signatureHeader = `sha256=${hmac}`;

      const isValid = provider.validateWebhookSignature(tamperedPayload, signatureHeader);
      expect(isValid).toBe(false);
    });

    it('should reject malformed or missing signatures', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });

      expect(provider.validateWebhookSignature(payload, undefined)).toBe(false);
      expect(provider.validateWebhookSignature(payload, 'invalid_format')).toBe(false);
      expect(provider.validateWebhookSignature(payload, 'sha256=invalid_short_hash')).toBe(false);
    });
  });
});
