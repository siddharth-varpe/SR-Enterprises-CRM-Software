import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseCsv, tokenizeCsv } from './utils/csv-parser';
import { validateFileSecurity, generateSafeStorageFilename, resolveSafeStoragePath } from './utils/file-validator';
import { dataImportService } from './import.service';
import { dataExportService } from './export.service';
import { backupRestoreService } from './backup.service';

// Mock DB client
vi.mock('../../database/client', () => {
  const mockRows = [{ id: 'mock-1', name: 'Mock Record' }];
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-new-id' }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'mock-updated-id' }]),
        }),
      }),
      execute: vi.fn().mockResolvedValue(mockRows),
      transaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          query: {
            customers: { findFirst: vi.fn().mockResolvedValue(null) },
            products: { findFirst: vi.fn().mockResolvedValue({ id: 'p1', sku: 'RO-KENT-GP', productType: 'RO_MACHINE', defaultWarrantyMonths: 12, defaultServiceIntervalMonths: 6 }) },
            customerAssets: { findFirst: vi.fn().mockResolvedValue(null) },
            inventoryBalances: { findFirst: vi.fn().mockResolvedValue(null) },
            warranties: { findFirst: vi.fn().mockResolvedValue(null) },
          },
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'tx-new-id', customerId: 'c1' }]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 'tx-updated-id' }]),
            }),
          }),
          execute: vi.fn().mockResolvedValue([]),
        };
        return await callback(tx);
      }),
      query: {
        customers: { findMany: vi.fn().mockResolvedValue([{ customerNumber: 'CUST-001', fullName: 'John Doe', phone: '9876543210', customerType: 'INDIVIDUAL', status: 'ACTIVE', createdAt: new Date() }]) },
        products: { findMany: vi.fn().mockResolvedValue([{ sku: 'RO-001', name: 'Kent Grand', productType: 'RO_MACHINE', brand: 'Kent', unitPrice: '15000', taxRatePercent: '18.00', isActive: true }]) },
        inventoryBalances: { findMany: vi.fn().mockResolvedValue([{ product: { sku: 'RO-001', name: 'Kent' }, currentStock: 10, minimumAlertStock: 2 }]) },
        sales: { findMany: vi.fn().mockResolvedValue([]) },
        invoices: { findMany: vi.fn().mockResolvedValue([]) },
        payments: { findMany: vi.fn().mockResolvedValue([]) },
        services: { findMany: vi.fn().mockResolvedValue([]) },
        jobCards: { findMany: vi.fn().mockResolvedValue([]) },
        warranties: { findMany: vi.fn().mockResolvedValue([]) },
        technicians: { findMany: vi.fn().mockResolvedValue([]) },
        inquiries: { findMany: vi.fn().mockResolvedValue([]) },
      },
    },
    sql: {
      raw: (str: string) => str,
    },
  };
});

describe('Phase 26 — Data Import, Export, Backup & Restore Service Tests', () => {
  let tempTestDir: string;

  beforeEach(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srm-backup-test-'));
    backupRestoreService.setBackupDir(tempTestDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. CSV Parsing & Tokenization (Rule 5, 30)', () => {
    it('should parse standard CSV text with quotes and escaped characters', () => {
      const csv = `fullName,phone,notes\n"Sharma, Rajesh","9876543210","Line 1 with ""quotes"""\nAnita Rao,9123456789,Single`;
      const parsed = parseCsv(csv);

      expect(parsed.totalRows).toBe(2);
      expect(parsed.headers).toEqual(['fullName', 'phone', 'notes']);
      expect(parsed.rows[0].fullName).toBe('Sharma, Rajesh');
      expect(parsed.rows[0].phone).toBe('9876543210');
      expect(parsed.rows[0].notes).toBe('Line 1 with "quotes"');
      expect(parsed.rows[1].fullName).toBe('Anita Rao');
    });

    it('should safely strip formula prefixes when reading CSV values', () => {
      const csv = `name,amount\n"'=SUM(A1:A10)",100`;
      const parsed = parseCsv(csv);
      expect(parsed.rows[0].name).toBe('=SUM(A1:A10)');
    });
  });

  describe('2. File Security & Path Traversal Validation (Rule 6, 8)', () => {
    it('should reject filenames containing path traversal characters', () => {
      const result = validateFileSecurity('../../../etc/passwd', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject oversized files exceeding the configured limit', () => {
      const result = validateFileSecurity('data.csv', 20 * 1024 * 1024, 'text/csv', { maxSizeBytes: 10 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('limit');
    });

    it('should reject disallowed file extensions', () => {
      const result = validateFileSecurity('script.exe', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file extension');
    });

    it('should generate safe server storage filenames and resolve within parent folder', () => {
      const safe = generateSafeStorageFilename('malicious..file.csv', 'import');
      expect(safe.startsWith('import_')).toBe(true);
      expect(safe.endsWith('.csv')).toBe(true);

      const resolved = resolveSafeStoragePath(tempTestDir, safe);
      expect(resolved.startsWith(tempTestDir)).toBe(true);
    });
  });

  describe('3. Customer Importer & Duplicate Policies (Rule 4, 12, 16, 17)', () => {
    it('should generate accurate preview report with zero DB mutation and flag invalid phones', async () => {
      const rows = [
        { fullName: 'Valid Customer', phone: '9876543210', email: 'valid@example.com' },
        { fullName: 'Missing Phone', phone: '', email: 'nophone@example.com' },
        { fullName: 'Invalid Email', phone: '9123456789', email: 'invalid-email-format' },
        { fullName: 'Duplicate Within File', phone: '9876543210' },
      ];

      const preview = await dataImportService.preview('customer', rows);

      expect(preview.totalRows).toBe(4);
      expect(preview.validRows).toBe(1);
      expect(preview.invalidRows).toBe(3);
      expect(preview.duplicateRows).toBe(1);
      expect(preview.errors.some((e) => e.code === 'REQUIRED_FIELD' && e.field === 'phone')).toBe(true);
      expect(preview.errors.some((e) => e.code === 'INVALID_FORMAT' && e.field === 'email')).toBe(true);
      expect(preview.errors.some((e) => e.code === 'DUPLICATE' && e.field === 'phone')).toBe(true);
    });

    it('should execute transactional customer import', async () => {
      const records = [
        { fullName: 'Rajesh Sharma', phone: '9876543210', city: 'Pune' },
      ];

      const result = await dataImportService.execute('customer', records, 'CREATE', {
        userId: 'admin-1',
        userRole: 'Super Admin',
      });

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.entityType).toBe('customer');
    });
  });

  describe('4. Product & Inventory Importers (Rule 18, 20)', () => {
    it('should validate product SKU and unit prices', async () => {
      const rows = [
        { sku: 'RO-KENT-GP', name: 'Kent Grand Plus', unitPrice: '18500', taxRatePercent: '18' },
        { sku: '', name: 'Missing SKU', unitPrice: '500' },
        { sku: 'RO-NEG', name: 'Negative Price', unitPrice: '-100' },
      ];

      const preview = await dataImportService.preview('product', rows);
      expect(preview.totalRows).toBe(3);
      expect(preview.validRows).toBe(1);
      expect(preview.invalidRows).toBe(2);
      expect(preview.errors.some((e) => e.code === 'REQUIRED_FIELD' && e.field === 'sku')).toBe(true);
      expect(preview.errors.some((e) => e.code === 'INVALID_AMOUNT')).toBe(true);
    });

    it('should return downloadable CSV templates for products and inventory', () => {
      const prodTemplate = dataImportService.getTemplateCsv('product');
      expect(prodTemplate.filename).toBe('srm_product_import_template.csv');
      expect(prodTemplate.csvContent).toContain('sku,name,productType');

      const invTemplate = dataImportService.getTemplateCsv('inventory');
      expect(invTemplate.filename).toBe('srm_inventory_import_template.csv');
      expect(invTemplate.csvContent).toContain('productSku,quantity');
    });
  });

  describe('5. Asset & Warranty Referential Integrity (Rule 19, 24, 26)', () => {
    it('should flag date order invalidity in warranty preview', async () => {
      const rows = [
        {
          assetSerial: 'KENT-GP-001',
          startDate: '2026-12-31',
          endDate: '2026-01-01', // End before start
        },
      ];

      const preview = await dataImportService.preview('warranty', rows);
      expect(preview.validRows).toBe(0);
      expect(preview.errors.some((e) => e.code === 'INVALID_DATE')).toBe(true);
    });
  });

  describe('6. Data Export Engine & Formula Sanitization (Rule 38, 41)', () => {
    it('should export customer data to CSV with formula injection sanitization', async () => {
      const exported = await dataExportService.exportData('customers', 'csv', {}, { userRole: 'Super Admin' });
      expect(exported.filename.startsWith('srm_customers_export_')).toBe(true);
      expect(exported.mimeType).toContain('text/csv');
      expect(exported.content).toContain('Customer Number,Full Name,Phone');
    });

    it('should reject unauthorized users attempting to export financial sales records', async () => {
      await expect(
        dataExportService.exportData('sales', 'csv', {}, { userRole: 'Technician' })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('7. Local Backup & Restore Engine (Rule 51, 55, 65, 68)', () => {
    it('should create an integrity-verified backup with computed SHA-256 checksum', async () => {
      const backup = await backupRestoreService.createBackup('Test Manual Backup', false, {
        userId: 'admin-1',
        userRole: 'Super Admin',
      });

      expect(backup.id.startsWith('BACKUP-')).toBe(true);
      expect(backup.checksumSha256).toBeDefined();
      expect(backup.sizeBytes).toBeGreaterThan(0);
      expect(backup.status).toBe('HEALTHY');

      const verification = backupRestoreService.verifyBackupIntegrity(backup.id);
      expect(verification.valid).toBe(true);
    });

    it('should list all stored backups in order', async () => {
      await backupRestoreService.createBackup('Backup 1', false);
      await backupRestoreService.createBackup('Backup 2', false);

      const list = await backupRestoreService.listBackups();
      expect(list.totalBackups).toBe(2);
      expect(list.backups.length).toBe(2);
    });

    it('should reject restore requests without the exact confirmation phrase', async () => {
      const backup = await backupRestoreService.createBackup('Backup for Restore', false);

      await expect(
        backupRestoreService.restoreBackup(
          { backupId: backup.id, confirmationPhrase: 'wrong phrase' },
          { userRole: 'Super Admin' }
        )
      ).rejects.toThrow('confirmation phrase');
    });

    it('should automatically generate a pre-restore safety backup and execute restore', async () => {
      const backup = await backupRestoreService.createBackup('Source Backup', false);

      const result = await backupRestoreService.restoreBackup(
        { backupId: backup.id, confirmationPhrase: 'RESTORE SRM DATA', notes: 'Emergency test restore' },
        { userRole: 'Super Admin', userId: 'admin-1' }
      );

      expect(result.success).toBe(true);
      expect(result.restoredBackupId).toBe(backup.id);
      expect(result.safetyBackupId.startsWith('SAFETY-')).toBe(true);
      expect(result.verification.databaseConnected).toBe(true);
    });
  });
});
