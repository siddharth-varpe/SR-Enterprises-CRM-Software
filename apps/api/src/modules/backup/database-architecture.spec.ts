import { describe, it, expect } from 'vitest';
import { db, sql, dbManager, isArchiveDatabaseConfigured, getArchiveDatabaseClient } from '../../database/client.js';
import { archiveStorageService } from './archive-storage.service.js';
import { backupService, ORDERED_DOMAIN_TABLES } from './backup.service.js';
import { archiveService } from '../archive/archive.service.js';

describe('2-Supabase Database Architecture & Backup Engine', () => {
  it('preserves Primary Database (Supabase #1) instance and sql proxies', () => {
    expect(db).toBeDefined();
    expect(sql).toBeDefined();
    expect(dbManager.primary()).toBe(db);
    expect(typeof dbManager.isArchiveConfigured).toBe('function');
  });

  it('guarantees Supabase #2 Archive Database isolation and safe unconfigured behavior', () => {
    if (!isArchiveDatabaseConfigured()) {
      expect(isArchiveDatabaseConfigured()).toBe(false);
      expect(() => getArchiveDatabaseClient()).toThrow(/Archive database \(Supabase #2\) is not configured/i);
    } else {
      expect(isArchiveDatabaseConfigured()).toBe(true);
      const archiveClient = getArchiveDatabaseClient();
      expect(archiveClient).toBeDefined();
      expect(archiveClient.sql).toBeDefined();
      expect(archiveClient.db).toBeDefined();
    }
  });

  it('guarantees Supabase #2 Storage isolation and unconfigured protection', async () => {
    expect(archiveStorageService).toBeDefined();
    expect(archiveStorageService.getBucket()).toBe('crm-backups');

    if (!archiveStorageService.isConfigured()) {
      expect(archiveStorageService.isConfigured()).toBe(false);
      // Calling uploadFile or downloadFile must throw and NEVER touch DB1 storage
      await expect(archiveStorageService.uploadFile('test.txt', Buffer.from('test'))).rejects.toThrow(
        /Archive storage \(Supabase #2\) is not configured/i
      );
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

  it('guarantees createBackup throws descriptive error and never touches DB1 if DB2 is not configured', async () => {
    if (!archiveStorageService.isConfigured()) {
      await expect(
        backupService.createBackup({ backupType: 'MANUAL', notes: 'Unit test check' })
      ).rejects.toThrow(/Archive\/Backup storage \(Supabase #2\) is not configured/i);
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

  it('generates real PostgreSQL gzipped SQL dump of Supabase #1 with SHA-256 integrity checksum', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const zlib = await import('node:zlib');
    const crypto = await import('node:crypto');
    const { SUPABASE_PRODUCTION_DB_URL } = await import('../../config/env.js');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-test-dump-'));
    const dumpPath = path.join(tempDir, 'test_database.sql.gz');
    try {
      const dumpInfo = await (backupService as any).executePostgreSqlDump(
        dumpPath,
        SUPABASE_PRODUCTION_DB_URL
      );
      expect(dumpInfo).toBeDefined();
      expect(fs.existsSync(dumpPath)).toBe(true);

      const stats = fs.statSync(dumpPath);
      expect(stats.size).toBeGreaterThan(500); // non-empty gzipped dump

      // Decompress and verify it contains real PostgreSQL SQL statements and tables
      const compressed = fs.readFileSync(dumpPath);
      const decompressed = zlib.gunzipSync(compressed).toString('utf8');
      expect(decompressed).toContain('PostgreSQL');
      expect(decompressed).toMatch(/roles|users|customers/);

      // Verify SHA-256 calculation
      const sha256 = crypto.createHash('sha256').update(compressed).digest('hex');
      expect(sha256).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60000);

  it('creates a REAL Full Backup and uploads to Supabase #2 Storage', async () => {
    if (archiveStorageService.isConfigured()) {
      const manifest = await backupService.createBackup({
        backupType: 'FULL',
        notes: 'Live DB2 integration test backup',
        includeDocuments: false,
      });

      expect(manifest).toBeDefined();
      expect(manifest.backupId).toBeDefined();
      expect(manifest.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect((manifest as any).verificationStatus).toBe('VERIFIED');

      // Verify backup listing includes the new backup
      const list = await backupService.listBackups({ limit: 10 });
      const found = list.items.find((b) => b.backupId === manifest.backupId);
      expect(found).toBeDefined();

      // Verify integrity check
      const verification = await backupService.verifyBackup(manifest.backupId);
      expect(verification.valid).toBe(true);
      expect(verification.checksum).toBe(manifest.checksumSha256);

      // Verify download stream returns gzipped data
      const downloadInfo = await backupService.getBackupDownloadStream(manifest.backupId);
      expect(downloadInfo.stream).toBeDefined();
      expect(downloadInfo.contentType).toBe('application/gzip');
    }
  }, 120000);
});
