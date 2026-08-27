import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { assetTypeEnum, assetStatusEnum } from './enums';
import { customers, customerAddresses } from './customers';
import { products } from './products';

/**
 * Customer Assets Table (Physical RO Machines & Spare Parts owned by Customer)
 */
export const customerAssets = pgTable(
  'customer_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetNumber: text('asset_number').notNull().unique(), // e.g. ASSET-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    assetType: assetTypeEnum('asset_type').notNull(),
    serialNumber: text('serial_number'), // Serialized for RO machines, nullable for spare parts
    customName: text('custom_name'),
    installationAddressId: uuid('installation_address_id')
      .references(() => customerAddresses.id, { onDelete: 'set null' }),
    purchaseDate: timestamp('purchase_date', { withTimezone: true, mode: 'date' }).notNull(),
    initialWarrantyMonths: integer('initial_warranty_months').default(12).notNull(),
    serviceIntervalMonths: integer('service_interval_months').default(6).notNull(),
    status: assetStatusEnum('status').default('ACTIVE').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('customer_assets_customer_id_idx').on(table.customerId),
    index('customer_assets_product_id_idx').on(table.productId),
    index('customer_assets_serial_number_idx').on(table.serialNumber),
    index('customer_assets_status_idx').on(table.status),
  ]
);
