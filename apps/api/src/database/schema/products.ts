import { pgTable, uuid, text, numeric, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { productTypeEnum } from './enums';

/**
 * Products / Catalog Table (RO Machines & Spare Parts)
 */
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sku: text('sku').notNull().unique(), // Unique product SKU
    name: text('name').notNull(),
    productType: productTypeEnum('product_type').notNull(),
    brand: text('brand').notNull(),
    model: text('model'),
    description: text('description'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).default('18.00').notNull(),
    defaultWarrantyMonths: integer('default_warranty_months').default(12).notNull(),
    defaultServiceIntervalMonths: integer('default_service_interval_months').default(6).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('products_sku_idx').on(table.sku),
    index('products_type_idx').on(table.productType),
    index('products_brand_idx').on(table.brand),
    index('products_is_active_idx').on(table.isActive),
  ]
);
