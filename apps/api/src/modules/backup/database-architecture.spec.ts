import { describe, it, expect } from 'vitest';
import { db, sql, dbManager, isArchiveDatabaseConfigured, getArchiveDatabaseClient } from '../../database/client.js';
import { backupService, ORDERED_DOMAIN_TABLES } from './backup.service.js';
import { archiveService } from '../archive/archive.service.js';

describe('PostgreSQL Database Architecture & Backup Engine', () => {
  it('preserves Primary Database instance and sql proxies', () => {
    expect(db).toBeDefined();
    expect(sql).toBeDefined();
    expect(dbManager.primary()).toBe(db);
    expect(typeof dbManager.isArchiveConfigured).toBe('function');
  });

  it('guarantees Archive Database isolation and safe unconfigured behavior', () => {
    if (!isArchiveDatabaseConfigured()) {
      expect(isArchiveDatabaseConfigured()).toBe(false);
      expect(() => getArchiveDatabaseClient()).toThrow(/Archive database is not configured/i);
    } else {
      expect(isArchiveDatabaseConfigured()).toBe(true);
      const archiveClient = getArchiveDatabaseClient();
      expect(archiveClient).toBeDefined();
      expect(archiveClient.sql).toBeDefined();
      expect(archiveClient.db).toBeDefined();
    }
  });

  it('verifies ORDERED_DOMAIN_TABLES covers all 46 CRM database tables', () => {
    const requiredTables = [
      'app_settings',
      'audit_logs',
      'business_sequences',
      'chatbot_conversations',
      'chatbot_knowledge',
      'chatbot_messages',
      'customer_activities',
      'customer_addresses',
      'customer_assets',
      'customer_custom_labels',
      'customers',
      'documents',
      'email_notifications',
      'email_queue',
      'inquiries',
      'inquiry_events',
      'inventory_balances',
      'inventory_items',
      'inventory_purchases',
      'inventory_sales',
      'inventory_transactions',
      'invoice_items',
      'invoices',
      'job_cards',
      'notifications',
      'payments',
      'permissions',
      'products',
      'reminders',
      'rental_events',
      'rental_payments',
      'rentals',
      'role_permissions',
      'roles',
      'sale_items',
      'sales',
      'service_schedules',
      'services',
      'technicians',
      'users',
      'warranties',
      'warranty_events',
      'whatsapp_contacts',
      'whatsapp_conversations',
      'whatsapp_events',
      'whatsapp_messages',
    ];

    for (const table of requiredTables) {
      expect(ORDERED_DOMAIN_TABLES).toContain(table);
    }
  });

  it('provides safe, read-only ArchiveService query foundation', async () => {
    expect(archiveService).toBeDefined();
    const summary = await archiveService.getArchiveSummary();
    expect(summary).toBeDefined();
    if (!archiveService.isArchiveAvailable()) {
      expect(summary.isConfigured).toBe(false);
      expect(summary.status).toBe('NOT_CONFIGURED');
    } else {
      expect(summary.isConfigured).toBe(true);
      expect(summary.status).toBe('CONNECTED');
    }
  }, 20000);
});
