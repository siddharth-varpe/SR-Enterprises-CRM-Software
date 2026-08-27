import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { reminderTypeEnum, reminderStatusEnum, servicePriorityEnum } from './enums';
import { customers } from './customers';
import { invoices } from './invoices';
import { payments } from './payments';
import { users } from './users';

/**
 * Reminders Table (Actionable Follow-ups for Invoices, Payments & Services)
 */
export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reminderNumber: text('reminder_number').notNull().unique(), // e.g. REM-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    reminderType: reminderTypeEnum('reminder_type').default('PAYMENT_FOLLOW_UP').notNull(),
    reminderDate: timestamp('reminder_date', { withTimezone: true, mode: 'date' }).notNull(),
    reminderTime: text('reminder_time'), // e.g. '10:00 AM'
    priority: servicePriorityEnum('priority').default('NORMAL').notNull(),
    status: reminderStatusEnum('status').default('PENDING').notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('reminders_reminder_number_idx').on(table.reminderNumber),
    index('reminders_customer_id_idx').on(table.customerId),
    index('reminders_invoice_id_idx').on(table.invoiceId),
    index('reminders_date_idx').on(table.reminderDate),
    index('reminders_status_idx').on(table.status),
    index('reminders_priority_idx').on(table.priority),
  ]
);
