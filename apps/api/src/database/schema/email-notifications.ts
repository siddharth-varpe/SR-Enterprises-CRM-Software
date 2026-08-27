import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { emailEventTypeEnum, emailDeliveryStatusEnum } from './enums';
import { customers } from './customers';

/**
 * Email Notifications Table (Delivery Audit Log & Idempotency Store)
 */
export const emailNotifications = pgTable(
  'email_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    eventType: emailEventTypeEnum('event_type').notNull(),
    referenceType: text('reference_type'), // e.g. 'SALE', 'PAYMENT', 'INVOICE', 'SERVICE', 'WARRANTY', 'SYSTEM'
    referenceId: text('reference_id'),
    idempotencyKey: text('idempotency_key').unique(), // e.g. 'SALE_CONFIRMATION:sale-uuid'
    recipientEmail: text('recipient_email').notNull(),
    recipientName: text('recipient_name'),
    subject: text('subject').notNull(),
    status: emailDeliveryStatusEnum('status').default('PENDING').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    failedAt: timestamp('failed_at', { withTimezone: true, mode: 'date' }),
    lastError: text('last_error'),
    pdfAttached: boolean('pdf_attached').default(false).notNull(),
    pdfFilename: text('pdf_filename'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('email_notifications_customer_id_idx').on(table.customerId),
    index('email_notifications_event_type_idx').on(table.eventType),
    index('email_notifications_reference_idx').on(table.referenceType, table.referenceId),
    index('email_notifications_idempotency_key_idx').on(table.idempotencyKey),
    index('email_notifications_status_idx').on(table.status),
    index('email_notifications_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Email Queue Table (Resilient Local Desktop Background Queue & Retries)
 */
export const emailQueue = pgTable(
  'email_queue',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    notificationId: uuid('notification_id').references(() => emailNotifications.id, { onDelete: 'cascade' }),
    eventType: emailEventTypeEnum('event_type').notNull(),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    recipientEmail: text('recipient_email').notNull(),
    payload: jsonb('payload').notNull(),
    status: emailDeliveryStatusEnum('status').default('PENDING').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('email_queue_status_idx').on(table.status),
    index('email_queue_next_attempt_idx').on(table.nextAttemptAt),
    index('email_queue_event_type_idx').on(table.eventType),
    index('email_queue_reference_idx').on(table.referenceType, table.referenceId),
  ]
);

export type EmailNotificationRecord = typeof emailNotifications.$inferSelect;
export type NewEmailNotificationRecord = typeof emailNotifications.$inferInsert;
export type EmailQueueRecord = typeof emailQueue.$inferSelect;
export type NewEmailQueueRecord = typeof emailQueue.$inferInsert;
