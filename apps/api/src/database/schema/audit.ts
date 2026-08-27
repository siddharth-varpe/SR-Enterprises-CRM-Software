import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { auditActionEnum } from './enums';
import { users } from './users';

/**
 * Audit Logs Table (Immutable Security & Accountability Audit Trail)
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorUsername: text('actor_username'),
    action: auditActionEnum('action').notNull(),
    entityType: text('entity_type').notNull(), // 'CUSTOMER', 'USER', 'INVOICE', 'SETTING'
    entityId: text('entity_id').notNull(),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    changeReason: text('change_reason'),
    requestId: text('request_id'),
    ipAddress: text('ip_address'),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_actor_idx').on(table.actorId),
    index('audit_logs_request_id_idx').on(table.requestId),
    index('audit_logs_timestamp_idx').on(table.timestamp),
  ]
);
