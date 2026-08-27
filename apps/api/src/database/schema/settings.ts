import { pgTable, text, jsonb, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Application & Business Settings Table
 * Strongly typed key-value / category-value storage with optimistic concurrency locking.
 */
export const appSettings = pgTable('app_settings', {
  category: text('category').primaryKey(), // 'SYSTEM' | 'BUSINESS' | 'TAX' | 'INVOICE' | 'PAYMENT' | 'SALES' | 'SERVICE' | 'JOB_CARD' | 'WARRANTY' | 'INVENTORY' | 'NOTIFICATION' | 'NUMBERING' | 'SECURITY'
  value: jsonb('value').notNull(),
  version: integer('version').default(1).notNull(), // Optimistic locking
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});
