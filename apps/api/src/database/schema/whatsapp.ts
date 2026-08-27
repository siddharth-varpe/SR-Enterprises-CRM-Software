import { pgTable, uuid, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import {
  whatsappOptInStatusEnum,
  whatsappConversationStatusEnum,
  whatsappDirectionEnum,
  whatsappMessageTypeEnum,
  whatsappMessageStatusEnum,
} from './enums';
import { customers } from './customers';
import { users } from './users';

/**
 * WhatsApp Contacts Table
 * Links phone numbers to customer profiles and tracks opt-in consent
 */
export const whatsappContacts = pgTable(
  'whatsapp_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    phone: text('phone').notNull(), // E.164 format (e.g. +919876543210)
    waId: text('wa_id'), // Official WhatsApp User ID
    optInStatus: whatsappOptInStatusEnum('opt_in_status').default('UNKNOWN').notNull(),
    optInTimestamp: timestamp('opt_in_timestamp', { withTimezone: true, mode: 'date' }),
    optOutTimestamp: timestamp('opt_out_timestamp', { withTimezone: true, mode: 'date' }),
    lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('whatsapp_contacts_customer_id_idx').on(table.customerId),
    index('whatsapp_contacts_phone_idx').on(table.phone),
    index('whatsapp_contacts_wa_id_idx').on(table.waId),
  ]
);

/**
 * WhatsApp Conversations Table
 * Groups message threads between the business and customers
 */
export const whatsappConversations = pgTable(
  'whatsapp_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => whatsappContacts.id, { onDelete: 'cascade' }),
    status: whatsappConversationStatusEnum('status').default('ACTIVE').notNull(),
    unreadCount: integer('unread_count').default(0).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true, mode: 'date' }),
    lastMessagePreview: text('last_message_preview'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('whatsapp_conversations_customer_id_idx').on(table.customerId),
    index('whatsapp_conversations_contact_id_idx').on(table.contactId),
    index('whatsapp_conversations_last_message_at_idx').on(table.lastMessageAt),
  ]
);

/**
 * WhatsApp Messages Table
 * Structured record for inbound and outbound messages with delivery lifecycle tracking
 */
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => whatsappConversations.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => whatsappContacts.id, { onDelete: 'cascade' }),
    providerMessageId: text('provider_message_id'), // Meta message ID e.g. wamid.HBg...
    direction: whatsappDirectionEnum('direction').notNull(), // INBOUND | OUTBOUND
    messageType: whatsappMessageTypeEnum('message_type').default('TEXT').notNull(),
    content: text('content').notNull(),
    templateName: text('template_name'),
    templateParams: jsonb('template_params'),
    status: whatsappMessageStatusEnum('status').default('QUEUED').notNull(), // QUEUED, SENT, DELIVERED, READ, FAILED
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    failedAt: timestamp('failed_at', { withTimezone: true, mode: 'date' }),
    sentByUserId: uuid('sent_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('whatsapp_messages_conversation_id_idx').on(table.conversationId),
    index('whatsapp_messages_provider_msg_id_idx').on(table.providerMessageId),
    index('whatsapp_messages_status_idx').on(table.status),
    index('whatsapp_messages_created_at_idx').on(table.createdAt),
  ]
);

/**
 * WhatsApp Events Table
 * Webhook idempotency key store to prevent replay attacks and duplicate event processing
 */
export const whatsappEvents = pgTable(
  'whatsapp_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerEventId: text('provider_event_id').notNull().unique(), // Webhook unique event ID / message status ID
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('whatsapp_events_provider_event_id_idx').on(table.providerEventId),
    index('whatsapp_events_created_at_idx').on(table.createdAt),
  ]
);
