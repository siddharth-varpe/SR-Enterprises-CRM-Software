import { pgTable, uuid, text, numeric, integer, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { technicians } from './technicians';
import { users } from './users';

/**
 * Rental Enums
 */
export const rentalStatusEnum = pgEnum('rental_status', [
  'ACTIVE',
  'PAYMENT_DUE',
  'OVERDUE',
  'SUSPENDED',
  'RETURNED',
  'COMPLETED',
  'CANCELLED',
  'TERMINATED',
]);

export const rentalPaymentStatusEnum = pgEnum('rental_payment_status', [
  'PAID',
  'PARTIALLY_PAID',
  'NOT_PAID',
  'DUE',
  'OVERDUE',
]);

export const rentalDepositStatusEnum = pgEnum('rental_deposit_status', [
  'NOT_COLLECTED',
  'COLLECTED',
  'PARTIALLY_REFUNDED',
  'FULLY_REFUNDED',
  'FORFEITED_ADJUSTED',
]);

export const rentalBillingFrequencyEnum = pgEnum('rental_billing_frequency', [
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'YEARLY',
  'CUSTOM',
]);

export const rentalDurationEnum = pgEnum('rental_duration', [
  'MONTHLY',
  '3_MONTHS',
  '6_MONTHS',
  '12_MONTHS',
  'CUSTOM',
]);

export const rentalInstallationStatusEnum = pgEnum('rental_installation_status', [
  'PENDING',
  'SCHEDULED',
  'INSTALLED',
  'CANCELLED',
]);

export const rentalMachineConditionEnum = pgEnum('rental_machine_condition', [
  'NEW',
  'GOOD',
  'USED_GOOD',
  'USED_FAIR',
  'NEEDS_ATTENTION',
]);

export const rentalPaymentTypeEnum = pgEnum('rental_payment_type', [
  'SECURITY_DEPOSIT',
  'MONTHLY_RENT',
  'ADVANCE_RENT',
  'DAMAGE_CHARGE',
  'OTHER',
]);

/**
 * Rentals Table (Authoritative Rental Agreements)
 */
export const rentals = pgTable(
  'rentals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rentalNumber: text('rental_number').notNull().unique(), // e.g. RNT-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),

    // Machine / Equipment Information
    machineType: text('machine_type').notNull().default('RO'), // RO, RO + UV, RO + UV + UF, Commercial RO, Other
    machineModel: text('machine_model').notNull(),
    serialNumber: text('serial_number').notNull(),
    assetId: uuid('asset_id'),
    capacityLph: text('capacity_lph'),
    installationLocation: text('installation_location'),
    machineCondition: rentalMachineConditionEnum('machine_condition').default('GOOD').notNull(),
    accessories: text('accessories'),
    remarks: text('remarks'),

    // Rental Agreement Information
    rentalStartDate: timestamp('rental_start_date', { withTimezone: true, mode: 'date' }).notNull(),
    rentalEndDate: timestamp('rental_end_date', { withTimezone: true, mode: 'date' }),
    rentalDuration: rentalDurationEnum('rental_duration').default('MONTHLY').notNull(),
    minimumRentalPeriodMonths: integer('minimum_rental_period_months').default(1).notNull(),
    billingFrequency: rentalBillingFrequencyEnum('billing_frequency').default('MONTHLY').notNull(),

    // Financial & Pricing Details
    monthlyRent: numeric('monthly_rent', { precision: 12, scale: 2 }).notNull(),
    billingAmount: numeric('billing_amount', { precision: 12, scale: 2 }).notNull(),
    securityDeposit: numeric('security_deposit', { precision: 12, scale: 2 }).default('0.00').notNull(),
    depositStatus: rentalDepositStatusEnum('deposit_status').default('NOT_COLLECTED').notNull(),
    initialPaymentAmount: numeric('initial_payment_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalPaid: numeric('total_paid', { precision: 12, scale: 2 }).default('0.00').notNull(),
    outstandingAmount: numeric('outstanding_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    nextDueDate: timestamp('next_due_date', { withTimezone: true, mode: 'date' }).notNull(),

    // Lifecycle Status
    rentalStatus: rentalStatusEnum('rental_status').default('ACTIVE').notNull(),
    paymentStatus: rentalPaymentStatusEnum('payment_status').default('NOT_PAID').notNull(),

    // Installation Information
    installationDate: timestamp('installation_date', { withTimezone: true, mode: 'date' }),
    installationTime: text('installation_time'),
    installationAddress: text('installation_address'),
    technicianId: uuid('technician_id').references(() => technicians.id, { onDelete: 'set null' }),
    technicianName: text('technician_name'),
    installationStatus: rentalInstallationStatusEnum('installation_status').default('PENDING').notNull(),
    installationNotes: text('installation_notes'),

    // Machine Return Information
    returnDate: timestamp('return_date', { withTimezone: true, mode: 'date' }),
    returnCondition: text('return_condition'),
    damageCharges: numeric('damage_charges', { precision: 12, scale: 2 }).default('0.00').notNull(),
    depositAdjustment: numeric('deposit_adjustment', { precision: 12, scale: 2 }).default('0.00').notNull(),
    refundAmount: numeric('refund_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
    returnNotes: text('return_notes'),

    // Maintenance Meta
    lastServiceDate: timestamp('last_service_date', { withTimezone: true, mode: 'date' }),
    nextServiceDate: timestamp('next_service_date', { withTimezone: true, mode: 'date' }),
    serviceFrequencyMonths: integer('service_frequency_months').default(3),

    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('rentals_rental_number_idx').on(table.rentalNumber),
    index('rentals_customer_id_idx').on(table.customerId),
    index('rentals_serial_number_idx').on(table.serialNumber),
    index('rentals_status_idx').on(table.rentalStatus),
    index('rentals_payment_status_idx').on(table.paymentStatus),
    index('rentals_next_due_date_idx').on(table.nextDueDate),
    index('rentals_created_at_idx').on(table.createdAt),
  ]
);

/**
 * Rental Payments Table (Recurring Payment Ledger)
 */
export const rentalPayments = pgTable(
  'rental_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rentalId: uuid('rental_id')
      .notNull()
      .references(() => rentals.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    paymentDate: timestamp('payment_date', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    paymentMethod: text('payment_method').default('UPI').notNull(), // UPI, CASH, BANK_TRANSFER, CHEQUE, CARD, OTHER
    paymentType: rentalPaymentTypeEnum('payment_type').default('MONTHLY_RENT').notNull(),
    receiptNumber: text('receipt_number'),
    referenceNumber: text('reference_number'),
    periodStartDate: timestamp('period_start_date', { withTimezone: true, mode: 'date' }),
    periodEndDate: timestamp('period_end_date', { withTimezone: true, mode: 'date' }),
    notes: text('notes'),
    recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('rental_payments_rental_id_idx').on(table.rentalId),
    index('rental_payments_customer_id_idx').on(table.customerId),
    index('rental_payments_date_idx').on(table.paymentDate),
    index('rental_payments_receipt_number_idx').on(table.receiptNumber),
  ]
);

/**
 * Rental Lifecycle Events / History
 */
export const rentalEvents = pgTable(
  'rental_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rentalId: uuid('rental_id')
      .notNull()
      .references(() => rentals.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(), // CREATED, INSTALLED, PAYMENT_RECORDED, SERVICE_COMPLETED, RETURNED, TERMINATED
    description: text('description').notNull(),
    actorId: text('actor_id'),
    actorName: text('actor_name'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('rental_events_rental_id_idx').on(table.rentalId),
    index('rental_events_created_at_idx').on(table.createdAt),
  ]
);
