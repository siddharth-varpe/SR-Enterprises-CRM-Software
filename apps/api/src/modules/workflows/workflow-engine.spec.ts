import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowEngine } from './engine/workflow-engine';
import type { DomainEvent, CreateWorkflowRequest } from '@crm/types';

describe('WorkflowEngine & Outbox Processing', () => {
  beforeEach(async () => {
    await WorkflowEngine.seedDefaultWorkflows();
  });

  it('publishes domain event to Outbox with generated or custom eventId', async () => {
    const event: DomainEvent = {
      eventId: 'evt-unit-test-1',
      eventType: 'SaleConfirmed',
      aggregateType: 'SALE',
      aggregateId: 'sale-999',
      payload: { totalAmount: 12000, customerId: 'cust-1' },
      timestamp: new Date().toISOString(),
    };

    const eventId = await WorkflowEngine.publishEvent(event);
    expect(eventId).toBe('evt-unit-test-1');
  });

  it('evaluates and executes matching workflows on direct dispatch', async () => {
    const event: DomainEvent = {
      eventId: 'evt-direct-1',
      eventType: 'SaleConfirmed',
      aggregateType: 'SALE',
      aggregateId: 'sale-100',
      payload: { totalAmount: 15000, customerId: 'cust-100' },
      timestamp: new Date().toISOString(),
    };

    const result = await WorkflowEngine.dispatchDirect(event);
    expect(result.workflowsExecuted).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBe(0);
  });

  it('skips workflow execution when conditions do not match', async () => {
    const event: DomainEvent = {
      eventId: 'evt-zero-amount',
      eventType: 'SaleConfirmed',
      aggregateType: 'SALE',
      aggregateId: 'sale-zero',
      payload: { totalAmount: 0, customerId: 'cust-0' }, // condition requires totalAmount > 0
      timestamp: new Date().toISOString(),
    };

    const result = await WorkflowEngine.dispatchDirect(event);
    expect(result.workflowsExecuted).toBe(0);
  });

  it('allows creating custom dynamic workflow definitions', async () => {
    const customWorkflow: CreateWorkflowRequest = {
      name: 'High Value Payment Alert',
      eventType: 'PaymentReceived',
      priority: 5,
      isActive: true,
      conditions: {
        logic: 'AND',
        conditions: [{ field: 'payload.amount', operator: 'greater_than', value: 50000 }],
      },
      actions: [
        { type: 'CREATE_NOTIFICATION', params: { title: 'VIP Payment Received', priority: 'HIGH' } },
      ],
    };

    const created = await WorkflowEngine.createWorkflow(customWorkflow);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('High Value Payment Alert');

    const all = await WorkflowEngine.listWorkflows();
    expect(all.some((w) => w.id === created.id)).toBe(true);
  });
});
