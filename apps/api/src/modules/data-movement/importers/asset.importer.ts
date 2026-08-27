/**
 * Customer Asset Importer
 * Handles serialized machine validation, referential customer & product resolution, and transactional asset creation.
 */

import { BaseImporter, type ImporterContext } from './base.importer';
import type {
  ImportEntityType,
  ImportDuplicatePolicy,
  ImportPreviewResult,
  ImportExecuteResult,
  ImportRowError,
  ImportRowWarning,
} from '@crm/types';
import { db } from '../../../database/client';
import { customerAssets } from '../../../database/schema/assets';
import { customers } from '../../../database/schema/customers';
import { products } from '../../../database/schema/products';
import { auditLogs } from '../../../database/schema/audit';
import { eq, or, inArray } from 'drizzle-orm';
import { generateBusinessNumber } from '../../../database/sequences';

export class AssetImporter extends BaseImporter {
  readonly entityType: ImportEntityType = 'asset';
  readonly requiredColumns = ['serialNumber', 'customerPhone', 'productSku'];
  readonly optionalColumns = [
    'assetNumber',
    'customName',
    'purchaseDate',
    'initialWarrantyMonths',
    'serviceIntervalMonths',
    'status',
    'notes',
  ];

  getTemplate() {
    return {
      headers: [
        'serialNumber',
        'customerPhone',
        'productSku',
        'customName',
        'purchaseDate',
        'initialWarrantyMonths',
        'serviceIntervalMonths',
        'status',
        'notes',
      ],
      exampleRows: [
        {
          serialNumber: 'KENT-GP-2026-9021',
          customerPhone: '9876543210',
          productSku: 'RO-KENT-GP',
          customName: 'Kitchen RO Unit',
          purchaseDate: '2026-01-15',
          initialWarrantyMonths: '12',
          serviceIntervalMonths: '6',
          status: 'ACTIVE',
          notes: 'Installed under sink with TDS 45',
        },
      ],
    };
  }

  async preview(
    rows: Array<Record<string, any>>,
    _context?: ImporterContext
  ): Promise<ImportPreviewResult> {
    const errors: ImportRowError[] = [];
    const warnings: ImportRowWarning[] = [];
    const sampleValid: Array<Record<string, any>> = [];
    const sampleInvalid: Array<{ rowNumber: number; data: Record<string, any>; errors: ImportRowError[] }> = [];

    const seenSerials = new Set<string>();
    const serialsToCheck: string[] = [];
    const customerPhonesToCheck: string[] = [];
    const productSkusToCheck: string[] = [];

    const parsedRows: Array<{
      rowNumber: number;
      normalized: Record<string, any>;
      rowErrors: ImportRowError[];
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const raw = rows[i];
      const rowErrors: ImportRowError[] = [];

      const serialNumber = this.normalizeString(raw.serialNumber || raw.serial || raw['Serial Number'] || raw.SerialNumber).toUpperCase();
      const customerPhone = this.normalizePhone(raw.customerPhone || raw.phone || raw['Customer Phone'] || raw.CustomerNumber);
      const productSku = this.normalizeString(raw.productSku || raw.sku || raw['Product SKU'] || raw.SKU).toUpperCase();
      const customName = this.normalizeString(raw.customName || raw['Custom Name'] || raw.name);
      const rawPurchaseDate = raw.purchaseDate || raw['Purchase Date'] || raw.date;
      const purchaseDate = rawPurchaseDate ? new Date(rawPurchaseDate) : new Date();
      const initialWarrantyMonths = Math.max(0, parseInt(String(raw.initialWarrantyMonths || 12), 10) || 12);
      const serviceIntervalMonths = Math.max(0, parseInt(String(raw.serviceIntervalMonths || 6), 10) || 6);
      const rawStatus = this.normalizeString(raw.status || 'ACTIVE').toUpperCase();
      const status = ['ACTIVE', 'IN_SERVICE', 'REPLACED', 'DECOMMISSIONED'].includes(rawStatus)
        ? rawStatus
        : 'ACTIVE';
      const notes = this.normalizeString(raw.notes || raw['Notes']);

      // Required: Serial Number
      if (!serialNumber) {
        rowErrors.push({
          rowNumber,
          field: 'serialNumber',
          code: 'REQUIRED_FIELD',
          message: 'Asset serial number is required.',
        });
      }

      // Required: Customer Phone/Identifier
      if (!customerPhone) {
        rowErrors.push({
          rowNumber,
          field: 'customerPhone',
          code: 'REQUIRED_FIELD',
          message: 'Customer phone or number is required to link asset.',
        });
      } else {
        customerPhonesToCheck.push(customerPhone);
      }

      // Required: Product SKU
      if (!productSku) {
        rowErrors.push({
          rowNumber,
          field: 'productSku',
          code: 'REQUIRED_FIELD',
          message: 'Product SKU is required to link asset.',
        });
      } else {
        productSkusToCheck.push(productSku);
      }

      // Date validation
      if (rawPurchaseDate && isNaN(purchaseDate.getTime())) {
        rowErrors.push({
          rowNumber,
          field: 'purchaseDate',
          code: 'INVALID_DATE',
          message: `Invalid purchase date format: '${rawPurchaseDate}'.`,
          value: rawPurchaseDate,
        });
      }

      // Intra-file duplicate check
      if (serialNumber) {
        if (seenSerials.has(serialNumber)) {
          rowErrors.push({
            rowNumber,
            field: 'serialNumber',
            code: 'DUPLICATE',
            message: `Duplicate serial number '${serialNumber}' found within uploaded file.`,
            value: serialNumber,
          });
        } else {
          seenSerials.add(serialNumber);
          serialsToCheck.push(serialNumber);
        }
      }

      const normalized = {
        rowNumber,
        serialNumber,
        customerPhone,
        productSku,
        customName: customName || undefined,
        purchaseDate: !isNaN(purchaseDate.getTime()) ? purchaseDate : new Date(),
        initialWarrantyMonths,
        serviceIntervalMonths,
        status,
        notes: notes || undefined,
      };

      parsedRows.push({ rowNumber, normalized, rowErrors });
    }

    // 2. Referential integrity & Database duplicate checks
    const existingDbSerials = new Set<string>();
    const existingCustomersMap = new Map<string, string>(); // phone/number -> customerId
    const existingProductsMap = new Map<string, string>(); // sku -> productId

    if (serialsToCheck.length > 0) {
      try {
        const found = await db
          .select({ serialNumber: customerAssets.serialNumber })
          .from(customerAssets)
          .where(inArray(customerAssets.serialNumber, serialsToCheck));
        for (const f of found) {
          if (f.serialNumber) existingDbSerials.add(f.serialNumber);
        }
      } catch {}
    }

    if (customerPhonesToCheck.length > 0) {
      try {
        const foundCusts = await db
          .select({ id: customers.id, phone: customers.phone, customerNumber: customers.customerNumber })
          .from(customers)
          .where(
            or(
              inArray(customers.phone, customerPhonesToCheck),
              inArray(customers.customerNumber, customerPhonesToCheck)
            )
          );
        for (const c of foundCusts) {
          if (c.phone) existingCustomersMap.set(c.phone, c.id);
          if (c.customerNumber) existingCustomersMap.set(c.customerNumber, c.id);
        }
      } catch {}
    }

    if (productSkusToCheck.length > 0) {
      try {
        const foundProds = await db
          .select({ id: products.id, sku: products.sku })
          .from(products)
          .where(inArray(products.sku, productSkusToCheck));
        for (const p of foundProds) {
          if (p.sku) existingProductsMap.set(p.sku, p.id);
        }
      } catch {}
    }

    let duplicateRows = 0;
    let missingReferenceRows = 0;
    let validRows = 0;
    let invalidRows = 0;

    for (const item of parsedRows) {
      const { rowNumber, normalized, rowErrors } = item;

      // Duplicate serial check against DB
      if (normalized.serialNumber && existingDbSerials.has(normalized.serialNumber)) {
        rowErrors.push({
          rowNumber,
          field: 'serialNumber',
          code: 'DUPLICATE',
          message: `Asset with serial number '${normalized.serialNumber}' already exists in database.`,
          value: normalized.serialNumber,
        });
      }

      // Referential check: Customer exists
      if (normalized.customerPhone && !existingCustomersMap.has(normalized.customerPhone)) {
        rowErrors.push({
          rowNumber,
          field: 'customerPhone',
          code: 'MISSING_REFERENCE',
          message: `Customer reference '${normalized.customerPhone}' not found in database.`,
          value: normalized.customerPhone,
        });
      }

      // Referential check: Product exists
      if (normalized.productSku && !existingProductsMap.has(normalized.productSku)) {
        rowErrors.push({
          rowNumber,
          field: 'productSku',
          code: 'MISSING_REFERENCE',
          message: `Product reference with SKU '${normalized.productSku}' not found in database.`,
          value: normalized.productSku,
        });
      }

      if (rowErrors.length > 0) {
        invalidRows++;
        errors.push(...rowErrors);
        if (rowErrors.some((e) => e.code === 'DUPLICATE')) duplicateRows++;
        if (rowErrors.some((e) => e.code === 'MISSING_REFERENCE')) missingReferenceRows++;
        if (sampleInvalid.length < 5) {
          sampleInvalid.push({ rowNumber, data: normalized, errors: rowErrors });
        }
      } else {
        validRows++;
        if (sampleValid.length < 5) {
          sampleValid.push(normalized);
        }
      }
    }

    return {
      entityType: this.entityType,
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateRows,
      missingReferenceRows,
      errors,
      warnings,
      sampleValid,
      sampleInvalid,
      canProceed: validRows > 0,
    };
  }

  async execute(
    records: Array<Record<string, any>>,
    duplicatePolicy: ImportDuplicatePolicy = 'CREATE',
    context?: ImporterContext
  ): Promise<ImportExecuteResult> {
    const startTime = Date.now();
    const errors: ImportRowError[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    await db.transaction(async (tx) => {
      for (let i = 0; i < records.length; i++) {
        const raw = records[i];
        const rowNumber = raw.rowNumber || i + 1;
        const serialNumber = this.normalizeString(raw.serialNumber).toUpperCase();
        const customerPhone = this.normalizePhone(raw.customerPhone);
        const productSku = this.normalizeString(raw.productSku).toUpperCase();

        if (!serialNumber || !customerPhone || !productSku) {
          failed++;
          errors.push({
            rowNumber,
            field: 'serialNumber',
            code: 'REQUIRED_FIELD',
            message: 'Missing required fields for asset import.',
          });
          continue;
        }

        // Resolve Customer ID
        const customerRecord = await tx.query.customers.findFirst({
          where: or(
            eq(customers.phone, customerPhone),
            eq(customers.customerNumber, customerPhone)
          ),
          with: { addresses: true },
        });

        if (!customerRecord) {
          failed++;
          errors.push({
            rowNumber,
            field: 'customerPhone',
            code: 'MISSING_REFERENCE',
            message: `Customer '${customerPhone}' not found.`,
          });
          continue;
        }

        // Resolve Product ID
        const productRecord = await tx.query.products.findFirst({
          where: eq(products.sku, productSku),
        });

        if (!productRecord) {
          failed++;
          errors.push({
            rowNumber,
            field: 'productSku',
            code: 'MISSING_REFERENCE',
            message: `Product SKU '${productSku}' not found.`,
          });
          continue;
        }

        // Check duplicate asset by serial number
        const existing = await tx.query.customerAssets.findFirst({
          where: eq(customerAssets.serialNumber, serialNumber),
        });

        if (existing) {
          if (duplicatePolicy === 'SKIP') {
            skipped++;
            continue;
          } else if (duplicatePolicy === 'UPDATE') {
            await tx
              .update(customerAssets)
              .set({
                customName: raw.customName || existing.customName,
                status: raw.status || existing.status,
                notes: raw.notes ? `${existing.notes || ''}\n${raw.notes}`.trim() : existing.notes,
                updatedAt: new Date(),
              })
              .where(eq(customerAssets.id, existing.id));

            updated++;
            continue;
          } else {
            failed++;
            errors.push({
              rowNumber,
              field: 'serialNumber',
              code: 'DUPLICATE',
              message: `Asset serial '${serialNumber}' already exists.`,
            });
            continue;
          }
        }

        // Generate asset number
        let assetNumber = raw.assetNumber;
        if (!assetNumber) {
          try {
            const gen = await generateBusinessNumber(tx, 'ASSET', 'ASSET');
            assetNumber = gen?.sequenceNumber;
          } catch {}
          if (!assetNumber) {
            assetNumber = `ASSET-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`;
          }
        }
        const defaultAddress = customerRecord.addresses?.find((a) => a.isDefault) || customerRecord.addresses?.[0];

        await tx.insert(customerAssets).values({
          assetNumber,
          customerId: customerRecord.id,
          productId: productRecord.id,
          assetType: productRecord.productType === 'SPARE_PART' ? 'SPARE_PART' : 'RO_MACHINE',
          serialNumber,
          customName: raw.customName || null,
          installationAddressId: defaultAddress?.id || null,
          purchaseDate: raw.purchaseDate ? new Date(raw.purchaseDate) : new Date(),
          initialWarrantyMonths: raw.initialWarrantyMonths ?? productRecord.defaultWarrantyMonths ?? 12,
          serviceIntervalMonths: raw.serviceIntervalMonths ?? productRecord.defaultServiceIntervalMonths ?? 6,
          status: raw.status || 'ACTIVE',
          notes: raw.notes || null,
        });

        imported++;
      }
    });

    let auditLogId: string | undefined;
    try {
      const [audit] = await db
        .insert(auditLogs)
        .values({
          actorId: context?.userId as any,
          actorUsername: context?.userRole || 'SYSTEM',
          action: 'CREATE',
          entityType: 'ASSET_IMPORT',
          entityId: `IMPORT-${Date.now()}`,
          afterState: { totalProcessed: records.length, imported, updated, skipped, failed },
          changeReason: `Imported ${imported} customer assets via Data Import Engine`,
          ipAddress: context?.ipAddress,
        })
        .returning();
      auditLogId = audit?.id;
    } catch {}

    return {
      entityType: this.entityType,
      totalProcessed: records.length,
      imported,
      updated,
      skipped,
      failed,
      errors,
      executionTimeMs: Date.now() - startTime,
      auditLogId,
    };
  }
}
