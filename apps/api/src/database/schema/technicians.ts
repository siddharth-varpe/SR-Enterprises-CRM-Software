import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { technicianStatusEnum } from './enums';
import { users } from './users';

/**
 * Technicians Table
 */
export const technicians = pgTable(
  'technicians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .unique(), // Linked to system user account where applicable
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull().unique(),
    email: text('email'),
    status: technicianStatusEnum('status').default('ACTIVE').notNull(),
    skills: text('skills').array(),
    address: text('address'),
    emergencyContact: text('emergency_contact'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('technicians_phone_idx').on(table.phone),
    index('technicians_status_idx').on(table.status),
  ]
);
