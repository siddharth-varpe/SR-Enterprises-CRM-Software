import { pgTable, uuid, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * 1. Master Documents / Files Table
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fileKey: text('file_key'),
    originalFilename: text('original_filename').notNull(),
    storedFilename: text('stored_filename').notNull(),
    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    fileExtension: text('file_extension').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    checksumSha256: text('checksum_sha256').notNull(),
    category: text('category').default('GENERAL').notNull(),
    status: text('status').default('ACTIVE').notNull(),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    version: integer('version').default(1).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('documents_checksum_idx').on(table.checksumSha256),
    index('documents_category_idx').on(table.category),
    index('documents_status_idx').on(table.status),
    index('documents_deleted_at_idx').on(table.deletedAt),
  ]
);

/**
 * 2. Document Entity Attachments Ledger
 */
export const documentAttachments = pgTable(
  'document_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // CUSTOMER, ASSET, SALE, INVOICE, PAYMENT, WARRANTY, SERVICE, JOB_CARD, PRODUCT, TECHNICIAN, INQUIRY
    entityId: text('entity_id').notNull(),
    attachedByUserId: uuid('attached_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('doc_attachments_doc_idx').on(table.documentId),
    index('doc_attachments_entity_idx').on(table.entityType, table.entityId),
  ]
);

export type DocumentRecord = typeof documents.$inferSelect;
export type NewDocumentRecord = typeof documents.$inferInsert;

export type DocumentAttachmentRecord = typeof documentAttachments.$inferSelect;
export type NewDocumentAttachmentRecord = typeof documentAttachments.$inferInsert;
