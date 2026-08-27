import { pgTable, text, bigint, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * Business Sequences Table (Concurrency-Safe Number Generation)
 * Used to generate numbers like CUST-2026-0001, INV-2026-0001 atomically
 */
export const businessSequences = pgTable('business_sequences', {
  name: text('name').primaryKey(), // 'CUSTOMER', 'INVOICE', 'SALE', 'SERVICE', 'JOB_CARD', 'PAYMENT', 'INQUIRY'
  prefix: text('prefix').notNull(), // 'CUST', 'INV', 'SALE', 'SRV', 'JC', 'PAY', 'INQ'
  currentVal: bigint('current_val', { mode: 'number' }).default(0).notNull(),
  padding: integer('padding').default(4).notNull(), // Pad with leading zeros (e.g. 4 -> 0001)
  yearReset: boolean('year_reset').default(true).notNull(), // Reset counter when year changes
  currentYear: integer('current_year').default(new Date().getFullYear()).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});
