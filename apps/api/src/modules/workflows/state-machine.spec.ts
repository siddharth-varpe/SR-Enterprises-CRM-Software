import { describe, it, expect } from 'vitest';
import { StateMachine } from './engine/state-machine';

describe('StateMachine Engine', () => {
  describe('Sales State Transitions', () => {
    it('allows DRAFT -> COMPLETED and DRAFT -> CANCELLED', () => {
      expect(StateMachine.canTransition('SALE', 'DRAFT', 'COMPLETED')).toBe(true);
      expect(StateMachine.canTransition('SALE', 'DRAFT', 'CANCELLED')).toBe(true);
    });

    it('allows COMPLETED -> CANCELLED', () => {
      expect(StateMachine.canTransition('SALE', 'COMPLETED', 'CANCELLED')).toBe(true);
    });

    it('rejects illegal transitions like CANCELLED -> COMPLETED or CANCELLED -> DRAFT', () => {
      expect(StateMachine.canTransition('SALE', 'CANCELLED', 'COMPLETED')).toBe(false);
      expect(StateMachine.canTransition('SALE', 'CANCELLED', 'DRAFT')).toBe(false);
    });

    it('throws descriptive error on validateTransition failure', () => {
      expect(() => {
        StateMachine.validateTransition('SALE', 'CANCELLED', 'COMPLETED');
      }).toThrowError(/Illegal state transition for SALE/);
    });
  });

  describe('Invoice State Transitions', () => {
    it('allows DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID', () => {
      expect(StateMachine.canTransition('INVOICE', 'DRAFT', 'ISSUED')).toBe(true);
      expect(StateMachine.canTransition('INVOICE', 'ISSUED', 'PARTIALLY_PAID')).toBe(true);
      expect(StateMachine.canTransition('INVOICE', 'PARTIALLY_PAID', 'PAID')).toBe(true);
    });

    it('allows ISSUED -> OVERDUE and OVERDUE -> PAID', () => {
      expect(StateMachine.canTransition('INVOICE', 'ISSUED', 'OVERDUE')).toBe(true);
      expect(StateMachine.canTransition('INVOICE', 'OVERDUE', 'PAID')).toBe(true);
    });

    it('rejects DRAFT -> PAID direct jump without issuing', () => {
      expect(StateMachine.canTransition('INVOICE', 'DRAFT', 'PAID')).toBe(false);
    });
  });

  describe('Job Card & Service Transitions', () => {
    it('allows SCHEDULED -> ASSIGNED -> IN_PROGRESS -> COMPLETED for SERVICE', () => {
      expect(StateMachine.canTransition('SERVICE', 'SCHEDULED', 'ASSIGNED')).toBe(true);
      expect(StateMachine.canTransition('SERVICE', 'ASSIGNED', 'IN_PROGRESS')).toBe(true);
      expect(StateMachine.canTransition('SERVICE', 'IN_PROGRESS', 'COMPLETED')).toBe(true);
    });

    it('rejects COMPLETED -> ASSIGNED for JOB_CARD', () => {
      expect(StateMachine.canTransition('JOB_CARD', 'COMPLETED', 'ASSIGNED')).toBe(false);
    });
  });

  describe('Warranty Transitions', () => {
    it('allows ACTIVE -> EXPIRING_SOON -> EXPIRED', () => {
      expect(StateMachine.canTransition('WARRANTY', 'ACTIVE', 'EXPIRING_SOON')).toBe(true);
      expect(StateMachine.canTransition('WARRANTY', 'EXPIRING_SOON', 'EXPIRED')).toBe(true);
    });

    it('allows EXPIRED -> ACTIVE (AMC renewal)', () => {
      expect(StateMachine.canTransition('WARRANTY', 'EXPIRED', 'ACTIVE')).toBe(true);
    });

    it('rejects VOID -> ACTIVE', () => {
      expect(StateMachine.canTransition('WARRANTY', 'VOID', 'ACTIVE')).toBe(false);
    });
  });
});
