import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { notificationTypeEnum, notificationSeverityEnum, servicePriorityEnum, userRoleEnum } from './enums';
import { users } from './users';

/**
 * Notifications Table (Internal CRM Actionable Alerts)
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    targetRole: userRoleEnum('target_role'), // Optional role-level broadcast
    notificationType: notificationTypeEnum('notification_type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    severity: notificationSeverityEnum('severity').default('INFO').notNull(),
    priority: servicePriorityEnum('priority').default('NORMAL').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    entityType: text('entity_type'), // e.g. 'CUSTOMER', 'SALE', 'INVOICE', 'PAYMENT', 'SERVICE', 'JOB_CARD', 'WARRANTY', 'INQUIRY', 'REMINDER', 'SYSTEM'
    entityId: text('entity_id'),
    actionUrl: text('action_url'),
    eventKey: text('event_key'), // Deduplication key (e.g. 'payment_12345')
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_is_read_idx').on(table.isRead),
    index('notifications_created_at_idx').on(table.createdAt),
    index('notifications_type_idx').on(table.notificationType),
    index('notifications_event_key_idx').on(table.eventKey),
    index('notifications_user_read_idx').on(table.userId, table.isRead),
  ]
);

/**
 * User Notification Preferences Table
 */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    newInquiries: boolean('new_inquiries').default(true).notNull(),
    paymentAlerts: boolean('payment_alerts').default(true).notNull(),
    jobAssignments: boolean('job_assignments').default(true).notNull(),
    warrantyAlerts: boolean('warranty_alerts').default(true).notNull(),
    serviceReminders: boolean('service_reminders').default(true).notNull(),
    systemAlerts: boolean('system_alerts').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('notification_preferences_user_id_idx').on(table.userId),
  ]
);

export type NotificationRecord = typeof notifications.$inferSelect;
export type NewNotificationRecord = typeof notifications.$inferInsert;
export type NotificationPreferenceRecord = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferenceRecord = typeof notificationPreferences.$inferInsert;
