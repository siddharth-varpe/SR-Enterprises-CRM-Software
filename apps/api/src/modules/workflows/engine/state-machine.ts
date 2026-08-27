/**
 * Centralized Deterministic State Machine for SRM Business Entities
 * Prevents illegal state transitions and preserves audit integrity.
 */

export type StateEntity =
  | 'SALE'
  | 'INVOICE'
  | 'PAYMENT'
  | 'SERVICE'
  | 'JOB_CARD'
  | 'WARRANTY'
  | 'INQUIRY';

export const STATE_TRANSITIONS: Record<StateEntity, Record<string, string[]>> = {
  SALE: {
    DRAFT: ['COMPLETED', 'CANCELLED'],
    COMPLETED: ['CANCELLED'],
    CANCELLED: [],
  },
  INVOICE: {
    DRAFT: ['ISSUED', 'CANCELLED'],
    ISSUED: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
    OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
    PAID: ['CANCELLED'], // Exception flow with credit/refund
    CANCELLED: [],
  },
  PAYMENT: {
    PENDING: ['COMPLETED', 'FAILED', 'CANCELLED'],
    COMPLETED: ['REFUNDED'],
    FAILED: ['PENDING', 'CANCELLED'],
    CANCELLED: [],
    REFUNDED: [],
  },
  SERVICE: {
    SCHEDULED: ['ASSIGNED', 'CANCELLED', 'OVERDUE'],
    ASSIGNED: ['IN_PROGRESS', 'SCHEDULED', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'ASSIGNED', 'CANCELLED'],
    OVERDUE: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  },
  JOB_CARD: {
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'ASSIGNED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  },
  WARRANTY: {
    ACTIVE: ['EXPIRING_SOON', 'EXPIRED', 'VOID'],
    EXPIRING_SOON: ['ACTIVE', 'EXPIRED', 'VOID'], // ACTIVE if renewed/AMC
    EXPIRED: ['ACTIVE'], // ACTIVE if AMC renewed
    VOID: [],
  },
  INQUIRY: {
    NEW: ['CONTACTED', 'CLOSED'],
    CONTACTED: ['FOLLOW_UP', 'IN_PROGRESS', 'QUALIFIED', 'CLOSED'],
    FOLLOW_UP: ['CONTACTED', 'IN_PROGRESS', 'QUALIFIED', 'CLOSED'],
    IN_PROGRESS: ['QUALIFIED', 'CONVERTED', 'CLOSED'],
    QUALIFIED: ['CONVERTED', 'CLOSED'],
    CONVERTED: [],
    CLOSED: ['NEW'], // Reopened inquiry
  },
};

export class StateMachine {
  /**
   * Check if a transition from fromState to toState is legally permitted
   */
  public static canTransition(entity: StateEntity, fromState: string, toState: string): boolean {
    if (fromState === toState) {
      return true; // No-op transition
    }

    const transitions = STATE_TRANSITIONS[entity];
    if (!transitions) {
      return false;
    }

    const allowed = transitions[fromState];
    if (!allowed) {
      return false;
    }

    return allowed.includes(toState);
  }

  /**
   * Validate transition and throw a structured error if illegal
   */
  public static validateTransition(
    entity: StateEntity,
    fromState: string,
    toState: string
  ): void {
    if (!this.canTransition(entity, fromState, toState)) {
      throw new Error(
        `Illegal state transition for ${entity}: Cannot transition from '${fromState}' to '${toState}'. Allowed transitions: [${(STATE_TRANSITIONS[entity]?.[fromState] || []).join(', ')}]`
      );
    }
  }

  /**
   * Get all permitted next states from a current state
   */
  public static getAllowedNextStates(entity: StateEntity, currentState: string): string[] {
    return STATE_TRANSITIONS[entity]?.[currentState] || [];
  }
}
