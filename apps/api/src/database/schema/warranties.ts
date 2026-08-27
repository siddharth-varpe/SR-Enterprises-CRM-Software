import { pgTable, uuid, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { warrantyTypeEnum, warrantyStatusEnum, warrantyEventTypeEnum } from './enums';
import { customers } from './customers';
import { customerAssets } from './assets';
import { sales } from './sales';
import { users } from './users';

/**
 * Warranties Table
 */
export const warranties = pgTable(
  'warranties',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    warrantyNumber: text('warranty_number').notNull().unique(), // e.g. WAR-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => customerAssets.id, { onDelete: 'restrict' }),
    saleId: uuid('sale_id')
      .references(() => sales.id, { onDelete: 'set null' }),
    warrantyType: warrantyTypeEnum('warranty_type').notNull(),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }).notNull(),
    durationMonths: integer('duration_months').notNull(),
    status: warrantyStatusEnum('status').default('ACTIVE').notNull(),
    terms: text('terms'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('warranties_warranty_number_idx').on(table.warrantyNumber),
    index('warranties_customer_id_idx').on(table.customerId),
    index('warranties_asset_id_idx').on(table.assetId),
    index('warranties_end_date_idx').on(table.endDate),
    index('warranties_status_idx').on(table.status),
  ]
);

/**
 * Warranty Events Table (Preserving Complete Lifecycle History & Claims)
 */
export const warrantyEvents = pgTable(
  'warranty_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    warrantyId: uuid('warranty_id')
      .notNull()
      .references(() => warranties.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => customerAssets.id, { onDelete: 'restrict' }),
    eventType: warrantyEventTypeEnum('event_type').notNull(),
    eventDate: timestamp('event_date', { withTimezone: true, mode: 'date' }).notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason'),
    notes: text('notes'),
    replacementAssetId: uuid('replacement_asset_id')
      .references(() => customerAssets.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('warranty_events_warranty_id_idx').on(table.warrantyId),
    index('warranty_events_asset_id_idx').on(table.assetId),
    index('warranty_events_type_idx').on(table.eventType),
  ]
);
