import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import {
  serviceTypeEnum,
  serviceLocationEnum,
  serviceClassificationEnum,
  serviceStatusEnum,
  servicePriorityEnum,
  serviceScheduleStatusEnum,
} from './enums';
import { customers } from './customers';
import { customerAssets } from './assets';
import { warranties } from './warranties';
import { technicians } from './technicians';
import { users } from './users';

/**
 * Services Table (Scheduled & Executed Business Service Activity)
 */
export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceNumber: text('service_number').notNull().unique(), // e.g. SRV-2026-0001
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => customerAssets.id, { onDelete: 'restrict' }),
    warrantyId: uuid('warranty_id')
      .references(() => warranties.id, { onDelete: 'set null' }),
    technicianId: uuid('technician_id')
      .references(() => technicians.id, { onDelete: 'set null' }),
    serviceType: serviceTypeEnum('service_type').notNull(),
    serviceLocation: serviceLocationEnum('service_location').default('DOORSTEP').notNull(),
    serviceClassification: serviceClassificationEnum('service_classification').default('GENERAL').notNull(),
    scheduledDate: timestamp('scheduled_date', { withTimezone: true, mode: 'date' }).notNull(),
    scheduledTimeSlot: text('scheduled_time_slot'), // e.g. "10:00 AM - 12:00 PM"
    status: serviceStatusEnum('status').default('SCHEDULED').notNull(),
    priority: servicePriorityEnum('priority').default('NORMAL').notNull(),
    customerNotes: text('customer_notes'),
    internalNotes: text('internal_notes'),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    cancelReason: text('cancel_reason'),
  },
  (table) => [
    index('services_service_number_idx').on(table.serviceNumber),
    index('services_customer_id_idx').on(table.customerId),
    index('services_asset_id_idx').on(table.assetId),
    index('services_technician_id_idx').on(table.technicianId),
    index('services_scheduled_date_idx').on(table.scheduledDate),
    index('services_classification_idx').on(table.serviceClassification),
    index('services_status_idx').on(table.status),
  ]
);

/**
 * Service Schedules Table (Planned Service Intervals derived from Warranties)
 */
export const serviceSchedules = pgTable(
  'service_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => customerAssets.id, { onDelete: 'restrict' }),
    warrantyId: uuid('warranty_id')
      .references(() => warranties.id, { onDelete: 'cascade' }),
    scheduleIndex: integer('schedule_index').notNull(), // e.g. 1 (for 1 of 4)
    totalSchedules: integer('total_schedules').notNull(), // e.g. 4
    plannedDate: timestamp('planned_date', { withTimezone: true, mode: 'date' }).notNull(),
    targetMonth: text('target_month').notNull(), // e.g. "2027-02"
    status: serviceScheduleStatusEnum('status').default('PENDING').notNull(),
    generatedServiceId: uuid('generated_service_id')
      .references(() => services.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('service_schedules_customer_id_idx').on(table.customerId),
    index('service_schedules_asset_id_idx').on(table.assetId),
    index('service_schedules_planned_date_idx').on(table.plannedDate),
    index('service_schedules_status_idx').on(table.status),
  ]
);
