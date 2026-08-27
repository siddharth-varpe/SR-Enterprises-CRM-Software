import { describe, it, expect } from 'vitest';
import { formatSequenceNumber } from './sequences';

describe('Phase 1 — Business Sequence Number Generation', () => {
  it('should format business identifiers correctly with default 4-digit padding', () => {
    expect(formatSequenceNumber('CUST', 2026, 1)).toBe('CUST-2026-0001');
    expect(formatSequenceNumber('INV', 2026, 42)).toBe('INV-2026-0042');
    expect(formatSequenceNumber('SALE', 2026, 999)).toBe('SALE-2026-0999');
    expect(formatSequenceNumber('SRV', 2026, 1000)).toBe('SRV-2026-1000');
    expect(formatSequenceNumber('JC', 2026, 10005)).toBe('JC-2026-10005');
    expect(formatSequenceNumber('PAY', 2026, 7)).toBe('PAY-2026-0007');
    expect(formatSequenceNumber('INQ', 2026, 15)).toBe('INQ-2026-0015');
  });

  it('should support custom padding configurations', () => {
    expect(formatSequenceNumber('ORD', 2026, 5, 6)).toBe('ORD-2026-000005');
    expect(formatSequenceNumber('DOC', 2026, 12, 3)).toBe('DOC-2026-012');
  });

  it('should format different year sequences deterministically', () => {
    expect(formatSequenceNumber('CUST', 2025, 300)).toBe('CUST-2025-0300');
    expect(formatSequenceNumber('CUST', 2026, 1)).toBe('CUST-2026-0001');
    expect(formatSequenceNumber('CUST', 2027, 1)).toBe('CUST-2027-0001');
  });
});
