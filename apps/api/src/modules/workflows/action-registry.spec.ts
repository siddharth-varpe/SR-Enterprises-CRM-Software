import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowActionRegistry } from './engine/action-registry';
import type { DomainEvent, WorkflowActionConfig } from '@crm/types';

describe('WorkflowActionRegistry & Idempotency', () => {
  const dummyEvent: DomainEvent = {
    eventId: 'evt-test-123',
    eventType: 'SaleConfirmed',
    aggregateType: 'SALE',
    aggregateId: 'sale-abc-1',
    payload: {
      saleId: 'sale-abc-1',
      totalAmount: 18500,
      customerId: 'cust-xyz-99',
      productId: 'prod-ro-01',
      quantity: 1,
    },
    timestamp: new Date().toISOString(),
  };

  it('executes registered GENERATE_INVOICE action', async () => {
    const action: WorkflowActionConfig = {
      type: 'GENERATE_INVOICE',
      params: { totalAmount: 18500 },
    };

    const res = await WorkflowActionRegistry.execute({
      workflowExecutionId: 'exec-1',
      event: dummyEvent,
      action,
      idempotencyKey: 'idemp-inv-1',
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.result?.invoiceNumber).toBeDefined();
  });

  it('executes registered UPDATE_STATUS action with valid transition', async () => {
    const action: WorkflowActionConfig = {
      type: 'UPDATE_STATUS',
      params: {
        entity: 'SALE',
        fromStatus: 'DRAFT',
        toStatus: 'COMPLETED',
      },
    };

    const res = await WorkflowActionRegistry.execute({
      workflowExecutionId: 'exec-2',
      event: dummyEvent,
      action,
      idempotencyKey: 'idemp-status-1',
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.result?.transitionValid).toBe(true);
  });

  it('fails UPDATE_STATUS action when illegal transition is attempted', async () => {
    const action: WorkflowActionConfig = {
      type: 'UPDATE_STATUS',
      params: {
        entity: 'SALE',
        fromStatus: 'CANCELLED',
        toStatus: 'COMPLETED',
      },
    };

    const res = await WorkflowActionRegistry.execute({
      workflowExecutionId: 'exec-3',
      event: dummyEvent,
      action,
      idempotencyKey: 'idemp-status-illegal',
    });

    expect(res.status).toBe('FAILED');
    expect(res.error).toMatch(/Illegal state transition/);
  });

  it('executes UPDATE_INVENTORY action idempotently', async () => {
    const action: WorkflowActionConfig = {
      type: 'UPDATE_INVENTORY',
      params: {
        productId: 'prod-ro-01',
        quantity: 1,
        operation: 'DEDUCT',
      },
    };

    const res = await WorkflowActionRegistry.execute({
      workflowExecutionId: 'exec-4',
      event: dummyEvent,
      action,
      idempotencyKey: 'idemp-stock-1',
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.result?.operation).toBe('DEDUCT');
  });
});
