import { describe, it, expect } from 'vitest';

export interface WarrantyScheduleSpec {
  startDate: Date;
  warrantyDurationMonths: number;
  serviceIntervalMonths: number;
}

export interface GeneratedScheduleItem {
  scheduleIndex: number;
  totalSchedules: number;
  plannedDate: Date;
  targetMonth: string; // YYYY-MM
}

/**
 * Generate Warranty-Driven Service Schedules
 *
 * Example: 24 months warranty with 6 months interval -> exactly 4 scheduled intervals (months 6, 12, 18, 24)
 */
export function generateServiceSchedules(spec: WarrantyScheduleSpec): GeneratedScheduleItem[] {
  const schedules: GeneratedScheduleItem[] = [];
  const totalSchedules = Math.floor(spec.warrantyDurationMonths / spec.serviceIntervalMonths);

  for (let i = 1; i <= totalSchedules; i++) {
    const plannedDate = new Date(spec.startDate);
    plannedDate.setMonth(plannedDate.getMonth() + i * spec.serviceIntervalMonths);

    const year = plannedDate.getFullYear();
    const month = String(plannedDate.getMonth() + 1).padStart(2, '0');
    const targetMonth = `${year}-${month}`;

    schedules.push({
      scheduleIndex: i,
      totalSchedules,
      plannedDate,
      targetMonth,
    });
  }

  return schedules;
}

/**
 * Calculate Warranty Status based on Current Date and Expiration Threshold
 */
export function deriveWarrantyStatus(
  startDate: Date,
  endDate: Date,
  isVoid = false,
  currentDate = new Date(),
  expiringThresholdDays = 30
): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'VOID' {
  if (isVoid) return 'VOID';
  if (currentDate > endDate) return 'EXPIRED';
  if (currentDate < startDate) return 'ACTIVE';

  const diffMs = endDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= expiringThresholdDays && diffDays >= 0) {
    return 'EXPIRING_SOON';
  }

  return 'ACTIVE';
}

describe('Phase 1 — Warranty & Service Schedule Derivation Logic', () => {
  it('should generate exactly 4 service schedules for a 2-year warranty with 6-month interval', () => {
    const startDate = new Date('2026-01-15T00:00:00.000Z');
    const schedules = generateServiceSchedules({
      startDate,
      warrantyDurationMonths: 24,
      serviceIntervalMonths: 6,
    });

    expect(schedules).toHaveLength(4);
    expect(schedules[0]?.scheduleIndex).toBe(1);
    expect(schedules[0]?.totalSchedules).toBe(4);
    expect(schedules[0]?.targetMonth).toBe('2026-07');

    expect(schedules[1]?.scheduleIndex).toBe(2);
    expect(schedules[1]?.targetMonth).toBe('2027-01');

    expect(schedules[2]?.scheduleIndex).toBe(3);
    expect(schedules[2]?.targetMonth).toBe('2027-07');

    expect(schedules[3]?.scheduleIndex).toBe(4);
    expect(schedules[3]?.targetMonth).toBe('2028-01');
  });

  it('should generate 2 service schedules for a 1-year warranty with 6-month interval', () => {
    const startDate = new Date('2026-03-01T00:00:00.000Z');
    const schedules = generateServiceSchedules({
      startDate,
      warrantyDurationMonths: 12,
      serviceIntervalMonths: 6,
    });

    expect(schedules).toHaveLength(2);
    expect(schedules[0]?.scheduleIndex).toBe(1);
    expect(schedules[0]?.totalSchedules).toBe(2);
    expect(schedules[0]?.targetMonth).toBe('2026-09');

    expect(schedules[1]?.scheduleIndex).toBe(2);
    expect(schedules[1]?.targetMonth).toBe('2027-03');
  });

  it('should evaluate warranty status accurately (ACTIVE, EXPIRING_SOON, EXPIRED, VOID)', () => {
    const now = new Date('2026-08-17T12:00:00.000Z');

    // Active warranty (ends in 6 months)
    const activeStart = new Date('2026-01-01T00:00:00.000Z');
    const activeEnd = new Date('2027-01-01T00:00:00.000Z');
    expect(deriveWarrantyStatus(activeStart, activeEnd, false, now)).toBe('ACTIVE');

    // Expiring soon (ends in 15 days)
    const expiringEnd = new Date('2026-09-01T12:00:00.000Z');
    expect(deriveWarrantyStatus(activeStart, expiringEnd, false, now)).toBe('EXPIRING_SOON');

    // Expired warranty (ended 1 month ago)
    const expiredEnd = new Date('2026-07-01T00:00:00.000Z');
    expect(deriveWarrantyStatus(activeStart, expiredEnd, false, now)).toBe('EXPIRED');

    // Voided warranty
    expect(deriveWarrantyStatus(activeStart, activeEnd, true, now)).toBe('VOID');
  });
});
