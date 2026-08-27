/**
 * Warranty Importer
 * Handles warranty registration validation, asset & customer foreign key resolution, and date consistency checks.
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
import { warranties, warrantyEvents } from '../../../database/schema/warranties';
import { customerAssets } from '../../../database/schema/assets';
import { auditLogs } from '../../../database/schema/audit';
import { eq, inArray } from 'drizzle-orm';
import { generateBusinessNumber } from '../../../database/sequences';

export class WarrantyImporter extends BaseImporter {
  readonly entityType: ImportEntityType = 'warranty';
  readonly requiredColumns = ['assetSerial', 'startDate', 'endDate'];
  readonly optionalColumns = [
    'warrantyNumber',
    'warrantyType',
    'durationMonths',
    'status',
    'terms',
  ];

  getTemplate() {
    return {
      headers: [
        'assetSerial',
        'warrantyType',
        'startDate',
        'endDate',
        'durationMonths',
        'status',
        'terms',
      ],
      exampleRows: [
        {
          assetSerial: 'KENT-GP-2026-9021',
          warrantyType: 'STANDARD_MACHINE',
          startDate: '2026-01-15',
          endDate: '2027-01-14',
          durationMonths: '12',
          status: 'ACTIVE',
          terms: 'Standard 1-year comprehensive machine warranty covering RO membrane and pump.',
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

    const parsedRows: Array<{
      rowNumber: number;
      normalized: Record<string, any>;
      rowErrors: ImportRowError[];
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const raw = rows[i];
      const rowErrors: ImportRowError[] = [];

      const assetSerial = this.normalizeString(raw.assetSerial || raw.serialNumber || raw['Asset Serial'] || raw.Serial).toUpperCase();
      const rawType = this.normalizeString(raw.warrantyType || raw['Warranty Type'] || 'STANDARD_MACHINE').toUpperCase();
      const warrantyType = [
        'STANDARD_MACHINE',
        'EXTENDED_MACHINE',
        'SPARE_PART',
        'AMC_COMPREHENSIVE',
        'AMC_LABOUR_ONLY',
      ].includes(rawType)
        ? rawType
        : 'STANDARD_MACHINE';

      const rawStartDate = raw.startDate || raw['Start Date'] || raw.from;
      const rawEndDate = raw.endDate || raw['End Date'] || raw.to;
      const startDate = rawStartDate ? new Date(rawStartDate) : new Date();
      const endDate = rawEndDate ? new Date(rawEndDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      const durationMonths = Math.max(
        1,
        parseInt(String(raw.durationMonths || Math.round((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000))), 10) || 12
      );

      const rawStatus = this.normalizeString(raw.status || 'ACTIVE').toUpperCase();
      const status = ['ACTIVE', 'EXPIRED', 'VOID', 'CLAIMED'].includes(rawStatus) ? rawStatus : 'ACTIVE';
      const terms = this.normalizeString(raw.terms || raw['Terms']);

      // Required: Asset Serial
      if (!assetSerial) {
        rowErrors.push({
          rowNumber,
          field: 'assetSerial',
          code: 'REQUIRED_FIELD',
          message: 'Asset serial number is required to register warranty.',
        });
      } else {
        serialsToCheck.push(assetSerial);
      }

      // Date validation
      if (!rawStartDate || isNaN(startDate.getTime())) {
        rowErrors.push({
          rowNumber,
          field: 'startDate',
          code: 'INVALID_DATE',
          message: `Invalid or missing warranty start date: '${rawStartDate}'.`,
          value: rawStartDate,
        });
      }

      if (!rawEndDate || isNaN(endDate.getTime())) {
        rowErrors.push({
          rowNumber,
          field: 'endDate',
          code: 'INVALID_DATE',
          message: `Invalid or missing warranty end date: '${rawEndDate}'.`,
          value: rawEndDate,
        });
      }

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate < startDate) {
        rowErrors.push({
          rowNumber,
          field: 'endDate',
          code: 'INVALID_DATE',
          message: `Warranty end date (${rawEndDate}) cannot be before start date (${rawStartDate}).`,
          value: rawEndDate,
        });
      }

      // Intra-file duplicate check
      if (assetSerial) {
        if (seenSerials.has(assetSerial)) {
          rowErrors.push({
            rowNumber,
            field: 'assetSerial',
            code: 'DUPLICATE',
            message: `Duplicate warranty registration for asset serial '${assetSerial}' within uploaded file.`,
            value: assetSerial,
          });
        } else {
          seenSerials.add(assetSerial);
        }
      }

      const normalized = {
        rowNumber,
        assetSerial,
        warrantyType,
        startDate,
        endDate,
        durationMonths,
        status,
        terms: terms || undefined,
      };

      parsedRows.push({ rowNumber, normalized, rowErrors });
    }

    // Check DB Asset Existence
    const existingAssetsMap = new Map<string, { assetId: string; customerId: string }>();
    if (serialsToCheck.length > 0) {
      try {
        const foundAssets = await db
          .select({
            id: customerAssets.id,
            serialNumber: customerAssets.serialNumber,
            customerId: customerAssets.customerId,
          })
          .from(customerAssets)
          .where(inArray(customerAssets.serialNumber, serialsToCheck));

        for (const a of foundAssets) {
          if (a.serialNumber) {
            existingAssetsMap.set(a.serialNumber, { assetId: a.id, customerId: a.customerId });
          }
        }
      } catch {}
    }

    let missingReferenceRows = 0;
    let duplicateRows = 0;
    let validRows = 0;
    let invalidRows = 0;

    for (const item of parsedRows) {
      const { rowNumber, normalized, rowErrors } = item;

      if (normalized.assetSerial && !existingAssetsMap.has(normalized.assetSerial)) {
        rowErrors.push({
          rowNumber,
          field: 'assetSerial',
          code: 'MISSING_REFERENCE',
          message: `Asset with serial number '${normalized.assetSerial}' does not exist in database.`,
          value: normalized.assetSerial,
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
        const assetSerial = this.normalizeString(raw.assetSerial).toUpperCase();

        if (!assetSerial || !raw.startDate || !raw.endDate) {
          failed++;
          errors.push({
            rowNumber,
            field: 'assetSerial',
            code: 'REQUIRED_FIELD',
            message: 'Invalid warranty row record.',
          });
          continue;
        }

        const asset = await tx.query.customerAssets.findFirst({
          where: eq(customerAssets.serialNumber, assetSerial),
        });

        if (!asset) {
          failed++;
          errors.push({
            rowNumber,
            field: 'assetSerial',
            code: 'MISSING_REFERENCE',
            message: `Asset serial '${assetSerial}' not found.`,
          });
          continue;
        }

        const existingWarranty = await tx.query.warranties.findFirst({
          where: eq(warranties.assetId, asset.id),
        });

        if (existingWarranty) {
          if (duplicatePolicy === 'SKIP') {
            skipped++;
            continue;
          } else if (duplicatePolicy === 'UPDATE') {
            await tx
              .update(warranties)
              .set({
                warrantyType: raw.warrantyType || existingWarranty.warrantyType,
                startDate: new Date(raw.startDate),
                endDate: new Date(raw.endDate),
                durationMonths: raw.durationMonths ?? existingWarranty.durationMonths,
                status: raw.status || existingWarranty.status,
                terms: raw.terms || existingWarranty.terms,
                updatedAt: new Date(),
              })
              .where(eq(warranties.id, existingWarranty.id));

            updated++;
            continue;
          } else {
            failed++;
            errors.push({
              rowNumber,
              field: 'assetSerial',
              code: 'DUPLICATE',
              message: `Warranty for asset serial '${assetSerial}' already exists.`,
            });
            continue;
          }
        }

        // Generate warranty number
        let warrantyNumber = raw.warrantyNumber;
        if (!warrantyNumber) {
          try {
            const gen = await generateBusinessNumber(tx, 'WARRANTY', 'WAR');
            warrantyNumber = gen?.sequenceNumber;
          } catch {}
          if (!warrantyNumber) {
            warrantyNumber = `WAR-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`;
          }
        }
        const startDate = new Date(raw.startDate);
        const endDate = new Date(raw.endDate);
        const durationMonths = raw.durationMonths || Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));

        const [newWarranty] = await tx
          .insert(warranties)
          .values({
            warrantyNumber,
            customerId: asset.customerId,
            assetId: asset.id,
            warrantyType: raw.warrantyType || 'STANDARD_MACHINE',
            startDate,
            endDate,
            durationMonths,
            status: raw.status || 'ACTIVE',
            terms: raw.terms || null,
          })
          .returning();

        if (newWarranty) {
          await tx.insert(warrantyEvents).values({
            warrantyId: newWarranty.id,
            customerId: asset.customerId,
            assetId: asset.id,
            eventType: 'ACTIVATED',
            eventDate: new Date(),
            reason: 'Data Import Registration',
            notes: raw.terms || null,
          });
        }

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
          entityType: 'WARRANTY_IMPORT',
          entityId: `IMPORT-${Date.now()}`,
          afterState: { totalProcessed: records.length, imported, updated, skipped, failed },
          changeReason: `Imported ${imported} warranties via Data Import Engine`,
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
