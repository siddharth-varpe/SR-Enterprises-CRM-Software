import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { customerEventTypeEnum } from './enums';
import { customers } from './customers';
import { users } from './users';

/**
 * Customer Activities Table (Append-Only Customer Relationship Timeline)
 */
export const customerActivities = pgTable(
  'customer_activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorName: text('actor_name'),
    eventType: customerEventTypeEnum('event_type').notNull(),
    entityType: text('entity_type').notNull(), // 'SALE', 'INVOICE', 'SERVICE', 'WARRANTY', etc.
    entityId: text('entity_id').notNull(),
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('customer_activities_customer_id_idx').on(table.customerId),
    index('customer_activities_event_type_idx').on(table.eventType),
    index('customer_activities_timestamp_idx').on(table.timestamp),
  ]
);
