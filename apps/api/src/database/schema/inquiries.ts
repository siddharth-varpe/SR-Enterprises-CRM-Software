import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import {
  inquirySourceEnum,
  inquiryStatusEnum,
  inquiryTypeEnum,
  inquiryPriorityEnum,
} from './enums';
import { users } from './users';
import { customers } from './customers';

/**
 * Inquiries Table (Website, WhatsApp, and Direct Leads)
 */
export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryNumber: text('inquiry_number').notNull().unique(), // e.g. INQ-2026-000001
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    address: text('address'),
    city: text('city'),
    productInterest: text('product_interest'),
    serviceInterest: text('service_interest'),
    inquiryType: inquiryTypeEnum('inquiry_type').default('GENERAL').notNull(),
    message: text('message'),
    source: inquirySourceEnum('source').default('WEBSITE').notNull(),
    status: inquiryStatusEnum('status').default('NEW').notNull(),
    priority: inquiryPriorityEnum('priority').default('NORMAL').notNull(),
    assignedToUserId: uuid('assigned_to_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedByUserId: uuid('assigned_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' }),
    followUpDate: timestamp('follow_up_date', { withTimezone: true, mode: 'date' }),
    notes: text('notes'),
    isPossibleDuplicate: boolean('is_possible_duplicate').default(false).notNull(),
    duplicateOfInquiryId: uuid('duplicate_of_inquiry_id'),
    convertedCustomerId: uuid('converted_customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }), // Full traceability back to converted customer
    convertedByUserId: uuid('converted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    convertedAt: timestamp('converted_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('inquiries_inquiry_number_idx').on(table.inquiryNumber),
    index('inquiries_phone_idx').on(table.phone),
    index('inquiries_status_idx').on(table.status),
    index('inquiries_source_idx').on(table.source),
    index('inquiries_priority_idx').on(table.priority),
    index('inquiries_assigned_to_idx').on(table.assignedToUserId),
    index('inquiries_created_at_idx').on(table.createdAt),
    index('inquiries_converted_customer_idx').on(table.convertedCustomerId),
  ]
);

/**
 * Inquiry Events Table (Granular Lifecycle & Follow-up Audit Trail)
 */
export const inquiryEvents = pgTable(
  'inquiry_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(), // CREATED, ASSIGNED, REASSIGNED, CONTACTED, STATUS_CHANGED, FOLLOW_UP_ADDED, CONVERTED, CLOSED, MARKED_SPAM
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('inquiry_events_inquiry_id_idx').on(table.inquiryId),
    index('inquiry_events_event_type_idx').on(table.eventType),
    index('inquiry_events_created_at_idx').on(table.createdAt),
  ]
);
