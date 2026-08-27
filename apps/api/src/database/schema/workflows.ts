import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import type {
  DomainEventType,
  OutboxStatus,
  WorkflowConditionGroup,
  WorkflowActionConfig,
  WorkflowExecutionStatus,
  ActionExecutionStatus,
  WorkflowActionType,
} from '@crm/types';

/**
 * Outbox Events Table (Transactional Event Publishing)
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: text('event_id').notNull().unique(),
    eventType: text('event_type').notNull().$type<DomainEventType>(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').notNull().$type<Record<string, any>>(),
    status: text('status').notNull().default('PENDING').$type<OutboxStatus>(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    lastError: text('last_error'),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('outbox_status_idx').on(table.status),
    index('outbox_event_type_idx').on(table.eventType),
    index('outbox_aggregate_idx').on(table.aggregateType, table.aggregateId),
    index('outbox_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Workflow Definitions Table (Configurable Automation Rules)
 */
export const workflowDefinitions = pgTable(
  'workflow_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    eventType: text('event_type').notNull().$type<DomainEventType>(),
    conditions: jsonb('conditions').notNull().$type<WorkflowConditionGroup>(),
    actions: jsonb('actions').notNull().$type<WorkflowActionConfig[]>(),
    priority: integer('priority').notNull().default(10), // Lower executes first
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('workflow_event_type_idx').on(table.eventType),
    index('workflow_is_active_idx').on(table.isActive),
    index('workflow_priority_idx').on(table.priority),
  ]
);

/**
 * Workflow Executions Table (Top-level workflow run audit)
 */
export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowId: uuid('workflow_id').references(() => workflowDefinitions.id, { onDelete: 'set null' }),
    workflowName: text('workflow_name').notNull(),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull().$type<DomainEventType>(),
    status: text('status').notNull().default('PENDING').$type<WorkflowExecutionStatus>(),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    durationMs: integer('duration_ms'),
  },
  (table) => [
    index('wf_exec_workflow_id_idx').on(table.workflowId),
    index('wf_exec_event_id_idx').on(table.eventId),
    index('wf_exec_status_idx').on(table.status),
    index('wf_exec_started_at_idx').on(table.startedAt),
  ]
);

/**
 * Workflow Action Executions Table (Fine-grained action idempotency & audit)
 */
export const workflowActionExecutions = pgTable(
  'workflow_action_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowExecutionId: uuid('workflow_execution_id')
      .references(() => workflowExecutions.id, { onDelete: 'cascade' })
      .notNull(),
    actionType: text('action_type').notNull().$type<WorkflowActionType>(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    status: text('status').notNull().default('PENDING').$type<ActionExecutionStatus>(),
    resultPayload: jsonb('result_payload').$type<Record<string, any>>(),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('wf_action_exec_wf_id_idx').on(table.workflowExecutionId),
    index('wf_action_idempotency_idx').on(table.idempotencyKey),
    index('wf_action_status_idx').on(table.status),
  ]
);

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;

export type DbWorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type NewDbWorkflowDefinition = typeof workflowDefinitions.$inferInsert;

export type DbWorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewDbWorkflowExecution = typeof workflowExecutions.$inferInsert;

export type DbWorkflowActionExecution = typeof workflowActionExecutions.$inferSelect;
export type NewDbWorkflowActionExecution = typeof workflowActionExecutions.$inferInsert;
