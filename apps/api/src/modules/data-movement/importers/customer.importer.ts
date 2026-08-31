/**
 * Customer Importer
 * Strictly imports only two columns: "name" and "phone".
 * The column "name" acts as both customer full name and service address.
 * Any other columns are ignored/skipped. Duplicate values are fully allowed.
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
import { customers, customerAddresses } from '../../../database/schema/customers';
import { auditLogs } from '../../../database/schema/audit';
import { generateBusinessNumber } from '../../../database/sequences';

export class CustomerImporter extends BaseImporter {
  readonly entityType: ImportEntityType = 'customer';
  readonly requiredColumns = ['name', 'phone'];
  readonly optionalColumns: string[] = [];

  getTemplate() {
    return {
      headers: ['name', 'phone'],
      exampleRows: [
        {
          name: 'Rajesh Sharma, Flat 402, Sunshine Apts, Baner Road, Pune',
          phone: '9876543210',
        },
        {
          name: 'TechCorp Solutions, Plot 12, Hinjewadi Phase 1, Pune',
          phone: '9123456780',
        },
      ],
    };
  }

  /**
   * Helper to extract only "name" and "phone" from a row record,
   * case-insensitively checking keys, and ignoring all other columns.
   */
  private extractNameAndPhone(raw: Record<string, any>): { fullName: string; rawPhone: string; phone: string } {
    const keys = Object.keys(raw);

    // Find key for Name (e.g. name, fullName, customer_name, client, customer)
    const nameKey =
      keys.find((k) => /^(name|fullname|full_name|customer_name|customername|client|customer)$/i.test(k.trim())) ||
      keys.find((k) => /name/i.test(k.trim())) ||
      keys[0];

    // Find key for Phone (e.g. phone, mobile, phone_number, mobilenumber, contact, cell, tel)
    const phoneKey =
      keys.find((k) => /^(phone|mobile|phonenumber|phone_number|mobilenumber|mobile_number|contact|contactnumber|contact_number|cell|tel)$/i.test(k.trim())) ||
      keys.find((k) => /(phone|mobile|contact)/i.test(k.trim())) ||
      keys[1];

    const rawNameVal = nameKey ? raw[nameKey] : '';
    const rawPhoneVal = phoneKey ? raw[phoneKey] : '';

    const fullName = this.normalizeString(rawNameVal);
    const rawPhone = String(rawPhoneVal || '').trim();
    const phone = this.normalizePhone(rawPhone);

    return { fullName, rawPhone, phone };
  }

  async preview(
    rows: Array<Record<string, any>>,
    _context?: ImporterContext
  ): Promise<ImportPreviewResult> {
    const errors: ImportRowError[] = [];
    const warnings: ImportRowWarning[] = [];
    const sampleValid: Array<Record<string, any>> = [];
    const sampleInvalid: Array<{ rowNumber: number; data: Record<string, any>; errors: ImportRowError[] }> = [];

    let validRows = 0;
    let invalidRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const raw = rows[i];
      const rowErrors: ImportRowError[] = [];

      const { fullName, rawPhone, phone } = this.extractNameAndPhone(raw);

      // Validate required name
      if (!fullName) {
        rowErrors.push({
          rowNumber,
          field: 'name',
          code: 'REQUIRED_FIELD',
          message: `Row ${rowNumber}: Name is required.`,
        });
      }

      // Validate required phone
      if (!phone) {
        rowErrors.push({
          rowNumber,
          field: 'phone',
          code: 'REQUIRED_FIELD',
          message: `Row ${rowNumber}: Phone number is required.`,
        });
      } else if (phone.length < 10) {
        rowErrors.push({
          rowNumber,
          field: 'phone',
          code: 'INVALID_FORMAT',
          message: `Row ${rowNumber}: Phone number '${rawPhone}' is invalid. Must contain at least 10 digits.`,
          value: rawPhone,
        });
      }

      // Strictly only 2 columns: name and phone. Name also acts as address.
      const normalized = {
        rowNumber,
        name: fullName,
        fullName,
        phone,
        address: fullName, // name acts as name as well as address
      };

      if (rowErrors.length > 0) {
        invalidRows++;
        errors.push(...rowErrors);
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
      duplicateRows: 0, // Duplicates are fully allowed per requirements
      missingReferenceRows: 0,
      errors,
      warnings,
      sampleValid,
      sampleInvalid,
      canProceed: validRows > 0,
    };
  }

  async execute(
    records: Array<Record<string, any>>,
    _duplicatePolicy: ImportDuplicatePolicy = 'CREATE',
    context?: ImporterContext
  ): Promise<ImportExecuteResult> {
    const startTime = Date.now();
    const errors: ImportRowError[] = [];
    let imported = 0;
    let failed = 0;

    const CHUNK_SIZE = 500;

    for (let chunkIdx = 0; chunkIdx < records.length; chunkIdx += CHUNK_SIZE) {
      const chunk = records.slice(chunkIdx, chunkIdx + CHUNK_SIZE);

      await db.transaction(async (tx) => {
        for (let i = 0; i < chunk.length; i++) {
          const raw = chunk[i];
          const rowNumber = raw.rowNumber || chunkIdx + i + 1;

          const { fullName, phone } = this.extractNameAndPhone(raw);

          if (!fullName || !phone || phone.length < 10) {
            failed++;
            errors.push({
              rowNumber,
              field: !fullName ? 'name' : 'phone',
              code: 'REQUIRED_FIELD',
              message: `Row ${rowNumber}: Valid name and 10-digit phone number are required.`,
            });
            continue;
          }

          // Generate unique sequential customer number for every imported record
          let customerNumber = '';
          const now = new Date();
          const year2 = String(now.getFullYear()).slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const dateStr = `${day}-${month}-${year2}`;

          customerNumber = `CX-${dateStr}-${String(chunkIdx + i + 1).padStart(2, '0')}`;

          // Insert customer record (duplicates allowed)
          const [newCustomer] = await tx
            .insert(customers)
            .values({
              customerNumber,
              fullName,
              phone,
              customerType: 'INDIVIDUAL',
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          if (newCustomer) {
            // The column "name" strictly acts as name as well as address
            await tx.insert(customerAddresses).values({
              customerId: newCustomer.id,
              addressType: 'SERVICE',
              addressLine1: fullName,
              city: '',
              state: '',
              postalCode: '',
              isDefault: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            imported++;
          }
        }
      });
    }

    // Record structured audit log
    let auditLogId: string | undefined;
    try {
      const [audit] = await db
        .insert(auditLogs)
        .values({
          actorId: context?.userId as any,
          actorUsername: String(context?.userRole || 'SYSTEM'),
          action: 'CREATE',
          entityType: 'CUSTOMER_IMPORT',
          entityId: `IMPORT-${Date.now()}`,
          afterState: {
            totalProcessed: records.length,
            imported,
            updated: 0,
            skipped: 0,
            failed,
            policy: 'ALLOW_DUPLICATES',
          },
          changeReason: `Imported ${imported} customer records (name + phone) via Customer Excel/CSV Importer`,
          ipAddress: context?.ipAddress,
        })
        .returning();
      auditLogId = audit?.id;
    } catch {}

    return {
      entityType: this.entityType,
      totalProcessed: records.length,
      imported,
      updated: 0,
      skipped: 0,
      failed,
      errors,
      executionTimeMs: Date.now() - startTime,
      auditLogId,
    };
  }
}
