import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { paymentMethodEnum, paymentStatusEnum } from './enums';
import { customers } from './customers';
import { invoices } from './invoices';
import { users } from './users';

/**
 * Payments Table
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentNumber: text('payment_number').notNull().unique(), // e.g. PAY-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    paymentDate: timestamp('payment_date', { withTimezone: true, mode: 'date' }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').default('CASH').notNull(),
    status: paymentStatusEnum('status').default('COMPLETED').notNull(),
    referenceNumber: text('reference_number'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('payments_payment_number_idx').on(table.paymentNumber),
    index('payments_customer_id_idx').on(table.customerId),
    index('payments_invoice_id_idx').on(table.invoiceId),
    index('payments_date_idx').on(table.paymentDate),
    index('payments_status_idx').on(table.status),
  ]
);
