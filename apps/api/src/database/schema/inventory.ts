import { pgTable, uuid, text, integer, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { products } from './products';
import { users } from './users';

export const inventoryTransactionTypeEnum = pgEnum('inventory_transaction_type', [
  'PURCHASE',
  'SALE',
  'RETURN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'DAMAGE',
  'TRANSFER',
]);

/**
 * Inventory Balances Table (Authoritative Stock Levels per Product)
 */
export const inventoryBalances = pgTable(
  'inventory_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .unique()
      .references(() => products.id, { onDelete: 'cascade' }),
    currentStock: integer('current_stock').default(0).notNull(),
    minimumAlertStock: integer('minimum_alert_stock').default(5).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('inventory_balances_product_id_idx').on(table.productId),
  ]
);

/**
 * Inventory Transactions Table (Immutable Audit Ledger of Stock Movements)
 */
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    type: inventoryTransactionTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(), // positive integer
    previousStock: integer('previous_stock').notNull(),
    resultingStock: integer('resulting_stock').notNull(),
    reason: text('reason').notNull(),
    referenceType: text('reference_type'), // 'SALE', 'PURCHASE_ORDER', 'ADJUSTMENT', 'MANUAL'
    referenceId: text('reference_id'),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorName: text('actor_name'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('inventory_transactions_product_id_idx').on(table.productId),
    index('inventory_transactions_type_idx').on(table.type),
    index('inventory_transactions_created_at_idx').on(table.createdAt),
  ]
);
