import { pgTable, uuid, text, numeric, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { jobCardStatusEnum } from './enums';
import { services } from './services';
import { customers } from './customers';
import { customerAssets } from './assets';
import { technicians } from './technicians';

/**
 * Job Cards Table (Actual Work Execution Details & Diagnoses)
 */
export const jobCards = pgTable(
  'job_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobCardNumber: text('job_card_number').notNull().unique(), // e.g. JC-2026-0001
    serviceId: uuid('service_id')
      .notNull()
      .unique()
      .references(() => services.id, { onDelete: 'restrict' }), // 1:1 with Service
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => customerAssets.id, { onDelete: 'restrict' }),
    technicianId: uuid('technician_id')
      .references(() => technicians.id, { onDelete: 'set null' }),
    problemReported: text('problem_reported'),
    diagnosis: text('diagnosis'),
    workPerformed: text('work_performed'),
    partsReplaced: jsonb('parts_replaced'), // e.g. [{ partName, partSku, quantity, isWarrantyCovered, price }]
    technicianNotes: text('technician_notes'),
    customerRemarks: text('customer_remarks'),
    customerSignatureFileId: uuid('customer_signature_file_id'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    laborCharges: numeric('labor_charges', { precision: 12, scale: 2 }).default('0.00').notNull(),
    partsCharges: numeric('parts_charges', { precision: 12, scale: 2 }).default('0.00').notNull(),
    totalCharges: numeric('total_charges', { precision: 12, scale: 2 }).default('0.00').notNull(),
    nextServiceRecommendationMonths: integer('next_service_recommendation_months'),
    nextServiceNotes: text('next_service_notes'),
    status: jobCardStatusEnum('status').default('SCHEDULED').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('job_cards_job_card_number_idx').on(table.jobCardNumber),
    index('job_cards_service_id_idx').on(table.serviceId),
    index('job_cards_customer_id_idx').on(table.customerId),
    index('job_cards_technician_id_idx').on(table.technicianId),
    index('job_cards_status_idx').on(table.status),
  ]
);
