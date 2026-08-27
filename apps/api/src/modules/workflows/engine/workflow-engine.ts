import { eq, and, asc, desc, sql, lt, or } from 'drizzle-orm';
import { db } from '../../../database/client';
import {
  outboxEvents,
  workflowDefinitions,
  workflowExecutions,
  type DbWorkflowDefinition,
} from '../../../database/schema/index';
import { ConditionEvaluator } from './condition-evaluator';
import { WorkflowActionRegistry } from './action-registry';
import type {
  DomainEvent,
  DomainEventType,
  WorkflowDefinition,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from '@crm/types';
import crypto from 'crypto';

export class WorkflowEngine {
  private static inMemoryWorkflows: WorkflowDefinition[] = [];

  /**
   * Publish a domain event to the transactional Outbox
   */
  public static async publishEvent<T = any>(
    event: DomainEvent<T>,
    database = db
  ): Promise<string> {
    const eventId = event.eventId || crypto.randomUUID();

    try {
      await database
        .insert(outboxEvents)
        .values({
          eventId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload as Record<string, any>,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 3,
        })
        .onConflictDoNothing();
    } catch {
      // In-memory or fallback
    }

    return eventId;
  }

  /**
   * Process a single event directly across all active workflows
   */
  public static async dispatchDirect(event: DomainEvent): Promise<{
    workflowsEvaluated: number;
    workflowsExecuted: number;
    executionIds: string[];
    errors: string[];
  }> {
    const matchingWorkflows = await this.getMatchingWorkflows(event.eventType);
    const executionIds: string[] = [];
    const errors: string[] = [];
    let executedCount = 0;

    for (const workflow of matchingWorkflows) {
      if (!workflow.isActive) continue;

      const isMatch = ConditionEvaluator.evaluate(workflow.conditions, {
        ...event,
        payload: event.payload,
      });

      if (!isMatch) continue;

      executedCount++;
      const startTime = Date.now();
      const execId = crypto.randomUUID();
      executionIds.push(execId);

      // Create execution log
      try {
        await db.insert(workflowExecutions).values({
          id: execId,
          workflowId: workflow.id,
          workflowName: workflow.name,
          eventId: event.eventId,
          eventType: event.eventType,
          status: 'RUNNING',
          startedAt: new Date(),
        });
      } catch {
        // In-memory mode
      }

      let workflowFailed = false;
      let failureError = '';

      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        if (!action) continue;

        const idempotencyKey = `${event.eventId}:${workflow.id}:${action.type}:${i}`;

        const result = await WorkflowActionRegistry.execute({
          workflowExecutionId: execId,
          event,
          action,
          idempotencyKey,
          actorId: event.actorId,
        });

        if (result.status === 'FAILED') {
          workflowFailed = true;
          failureError = result.error || 'Action execution failed';
          errors.push(`Workflow [${workflow.name}] Action [${action.type}] error: ${failureError}`);
        }
      }

      const durationMs = Date.now() - startTime;

      try {
        await db
          .update(workflowExecutions)
          .set({
            status: workflowFailed ? 'FAILED' : 'COMPLETED',
            error: workflowFailed ? failureError : null,
            completedAt: new Date(),
            durationMs,
          })
          .where(eq(workflowExecutions.id, execId));
      } catch {
        // In-memory mode
      }
    }

    return {
      workflowsEvaluated: matchingWorkflows.length,
      workflowsExecuted: executedCount,
      executionIds,
      errors,
    };
  }

  /**
   * Process pending Outbox events with retry and dead-letter classification
   */
  public static async processOutbox(batchSize = 25): Promise<{
    processedCount: number;
    successCount: number;
    failureCount: number;
    deadLetterCount: number;
  }> {
    let pendingEvents: any[] = [];

    try {
      pendingEvents = await db
        .select()
        .from(outboxEvents)
        .where(
          or(
            eq(outboxEvents.status, 'PENDING'),
            and(eq(outboxEvents.status, 'FAILED'), lt(outboxEvents.attempts, outboxEvents.maxAttempts))
          )
        )
        .orderBy(asc(outboxEvents.createdAt))
        .limit(batchSize);
    } catch {
      return { processedCount: 0, successCount: 0, failureCount: 0, deadLetterCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;
    let deadLetterCount = 0;

    for (const record of pendingEvents) {
      const attempts = (record.attempts || 0) + 1;
      const maxAttempts = record.maxAttempts || 3;

      // Mark as PROCESSING
      await db
        .update(outboxEvents)
        .set({ status: 'PROCESSING', attempts })
        .where(eq(outboxEvents.id, record.id));

      const domainEvent: DomainEvent = {
        eventId: record.eventId,
        eventType: record.eventType,
        aggregateType: record.aggregateType,
        aggregateId: record.aggregateId,
        payload: record.payload,
        timestamp: record.createdAt?.toISOString() || new Date().toISOString(),
      };

      try {
        const dispatchResult = await this.dispatchDirect(domainEvent);

        if (dispatchResult.errors.length > 0) {
          const isDeadLetter = attempts >= maxAttempts;
          await db
            .update(outboxEvents)
            .set({
              status: isDeadLetter ? 'DEAD_LETTER' : 'FAILED',
              lastError: dispatchResult.errors.join('; '),
              processedAt: isDeadLetter ? new Date() : null,
            })
            .where(eq(outboxEvents.id, record.id));

          if (isDeadLetter) {
            deadLetterCount++;
          } else {
            failureCount++;
          }
        } else {
          await db
            .update(outboxEvents)
            .set({
              status: 'PROCESSED',
              processedAt: new Date(),
              lastError: null,
            })
            .where(eq(outboxEvents.id, record.id));
          successCount++;
        }
      } catch (err: any) {
        const isDeadLetter = attempts >= maxAttempts;
        await db
          .update(outboxEvents)
          .set({
            status: isDeadLetter ? 'DEAD_LETTER' : 'FAILED',
            lastError: err.message,
            processedAt: isDeadLetter ? new Date() : null,
          })
          .where(eq(outboxEvents.id, record.id));

        if (isDeadLetter) {
          deadLetterCount++;
        } else {
          failureCount++;
        }
      }
    }

    return {
      processedCount: pendingEvents.length,
      successCount,
      failureCount,
      deadLetterCount,
    };
  }

  /**
   * Recover stale or stuck executions
   */
  public static async recoverStuckExecutions(stuckMinutes = 15): Promise<number> {
    const threshold = new Date(Date.now() - stuckMinutes * 60 * 1000);

    try {
      const stuck = await db
        .select()
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.status, 'RUNNING'),
            lt(workflowExecutions.startedAt, threshold)
          )
        );

      if (stuck.length === 0) return 0;

      for (const item of stuck) {
        await db
          .update(workflowExecutions)
          .set({
            status: 'FAILED',
            error: `Execution timed out after ${stuckMinutes} minutes of inactivity`,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, item.id));
      }

      return stuck.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get active workflows for an event type (sorted by priority)
   */
  public static async getMatchingWorkflows(
    eventType: DomainEventType
  ): Promise<WorkflowDefinition[]> {
    try {
      const records = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.eventType, eventType),
            eq(workflowDefinitions.isActive, true)
          )
        )
        .orderBy(asc(workflowDefinitions.priority));

      if (records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || undefined,
          eventType: r.eventType,
          conditions: r.conditions,
          actions: r.actions,
          priority: r.priority,
          isActive: r.isActive,
          version: r.version,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      // In-memory mode
    }

    return this.inMemoryWorkflows.filter((w) => w.eventType === eventType && w.isActive);
  }

  /**
   * Create a new workflow definition
   */
  public static async createWorkflow(
    req: CreateWorkflowRequest
  ): Promise<WorkflowDefinition> {
    const id = crypto.randomUUID();
    const now = new Date();

    const newDef: DbWorkflowDefinition = {
      id,
      name: req.name,
      description: req.description || null,
      eventType: req.eventType,
      conditions: req.conditions,
      actions: req.actions,
      priority: req.priority ?? 10,
      isActive: req.isActive ?? true,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const [inserted] = await db.insert(workflowDefinitions).values(newDef).returning();
      if (inserted) {
        return {
          id: inserted.id,
          name: inserted.name,
          description: inserted.description || undefined,
          eventType: inserted.eventType,
          conditions: inserted.conditions,
          actions: inserted.actions,
          priority: inserted.priority,
          isActive: inserted.isActive,
          version: inserted.version,
          createdAt: inserted.createdAt.toISOString(),
          updatedAt: inserted.updatedAt.toISOString(),
        };
      }
    } catch {
      // In-memory fallback
    }

    const memoryItem: WorkflowDefinition = {
      id,
      name: req.name,
      description: req.description,
      eventType: req.eventType,
      conditions: req.conditions,
      actions: req.actions,
      priority: req.priority ?? 10,
      isActive: req.isActive ?? true,
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.inMemoryWorkflows.push(memoryItem);
    return memoryItem;
  }

  /**
   * List all workflow definitions
   */
  public static async listWorkflows(): Promise<WorkflowDefinition[]> {
    try {
      const records = await db
        .select()
        .from(workflowDefinitions)
        .orderBy(asc(workflowDefinitions.priority), desc(workflowDefinitions.createdAt));

      if (records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || undefined,
          eventType: r.eventType,
          conditions: r.conditions,
          actions: r.actions,
          priority: r.priority,
          isActive: r.isActive,
          version: r.version,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      // In-memory
    }

    return this.inMemoryWorkflows;
  }

  /**
   * Register default business workflows if none exist
   */
  public static async seedDefaultWorkflows(): Promise<void> {
    const existing = await this.listWorkflows();
    if (existing.length > 0) return;

    // 1. Sale Confirmed -> Auto Invoice & Inventory & Notification
    await this.createWorkflow({
      name: 'Sale Confirmation Automation',
      description: 'Generates invoice, notifies customer and deducts stock on sale confirmation',
      eventType: 'SaleConfirmed',
      priority: 10,
      isActive: true,
      conditions: {
        logic: 'AND',
        conditions: [{ field: 'payload.totalAmount', operator: 'greater_than', value: 0 }],
      },
      actions: [
        { type: 'GENERATE_INVOICE', params: {} },
        { type: 'UPDATE_INVENTORY', params: { operation: 'DEDUCT' } },
        { type: 'CREATE_NOTIFICATION', params: { title: 'Sale Confirmed', priority: 'NORMAL' } },
      ],
    });

    // 2. Service Request Assigned -> Auto Job Card
    await this.createWorkflow({
      name: 'Service Assignment Job Card Automation',
      description: 'Auto-creates a job card when a technician is assigned to a service request',
      eventType: 'ServiceRequestAssigned',
      priority: 10,
      isActive: true,
      conditions: {
        logic: 'AND',
        conditions: [{ field: 'payload.technicianId', operator: 'exists' }],
      },
      actions: [
        { type: 'CREATE_JOB_CARD', params: {} },
        { type: 'CREATE_NOTIFICATION', params: { title: 'Technician Assigned', priority: 'HIGH' } },
      ],
    });

    // 3. Payment Received -> Follow-up reminder & Receipt notification
    await this.createWorkflow({
      name: 'Payment Receipt Automation',
      description: 'Notifies customer and records transaction upon payment receipt',
      eventType: 'PaymentReceived',
      priority: 10,
      isActive: true,
      conditions: {
        logic: 'AND',
        conditions: [{ field: 'payload.amount', operator: 'greater_than', value: 0 }],
      },
      actions: [
        { type: 'CREATE_NOTIFICATION', params: { title: 'Payment Received', priority: 'NORMAL' } },
      ],
    });
  }
}
