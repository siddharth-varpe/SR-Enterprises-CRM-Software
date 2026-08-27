import { describe, it, expect } from 'vitest';
import { SearchRouter } from './search.router';

describe('SearchRouter Engine', () => {
  describe('Query Normalization & Phone Formatting', () => {
    it('normalizes extra whitespace and trim', () => {
      const norm = SearchRouter.normalizeQuery('   Rahul    Patil   ');
      expect(norm.clean).toBe('Rahul Patil');
      expect(norm.upper).toBe('RAHUL PATIL');
    });

    it('normalizes Indian mobile numbers (+91, spaces, hyphens)', () => {
      const norm1 = SearchRouter.normalizeQuery('+91 98765-43210');
      expect(norm1.digitsOnly).toBe('919876543210');
      expect(norm1.normalizedPhone).toBe('9876543210');

      const norm2 = SearchRouter.normalizeQuery('09876543210');
      expect(norm2.digitsOnly).toBe('09876543210');
      expect(norm2.normalizedPhone).toBe('9876543210');

      const norm3 = SearchRouter.normalizeQuery('+919876543210');
      expect(norm3.digitsOnly).toBe('919876543210');
      expect(norm3.normalizedPhone).toBe('9876543210');
    });

    it('sanitizes SQL LIKE wildcards (% and _)', () => {
      const sanitized = SearchRouter.sanitizeLikePattern('100%_pure_water');
      expect(sanitized).toBe('100\\%\\_pure\\_water');
    });
  });

  describe('Intent Detection', () => {
    it('detects Invoice intent for INV- pattern', () => {
      const norm = SearchRouter.normalizeQuery('INV-2026-00125');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(true);
      expect(intent.detectedType).toBe('invoice');
      expect(intent.primaryEntities).toContain('invoice');
    });

    it('detects Customer intent for CUST- pattern', () => {
      const norm = SearchRouter.normalizeQuery('CUST-2026-0042');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(true);
      expect(intent.detectedType).toBe('customer');
    });

    it('detects Customer intent for 10-digit phone query', () => {
      const norm = SearchRouter.normalizeQuery('9876543210');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(true);
      expect(intent.detectedType).toBe('customer');
    });

    it('detects Asset intent for SN / ASSET- pattern', () => {
      const norm = SearchRouter.normalizeQuery('SN-RO-98374');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(true);
      expect(intent.detectedType).toBe('asset');
    });

    it('detects Job Card intent for JC- pattern', () => {
      const norm = SearchRouter.normalizeQuery('JC-2026-0001');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(true);
      expect(intent.detectedType).toBe('job_card');
    });

    it('detects Sale intent for SALE- pattern', () => {
      const norm = SearchRouter.normalizeQuery('SALE-2026-0010');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(true);
      expect(intent.detectedType).toBe('sale');
    });

    it('detects general multi-domain intent for common names', () => {
      const norm = SearchRouter.normalizeQuery('Sharma');
      const intent = SearchRouter.detectIntent(norm);
      expect(intent.isSpecificPattern).toBe(false);
      expect(intent.primaryEntities.length).toBeGreaterThan(5);
    });
  });
});
