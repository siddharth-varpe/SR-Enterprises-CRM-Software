/**
 * Customer Importer
 * Handles customer dataset validation, phone normalization, duplicate detection, and high-performance chunked transactional importing.
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
import { or, inArray, eq } from 'drizzle-orm';
import { generateBusinessNumber } from '../../../database/sequences';

export class CustomerImporter extends BaseImporter {
  readonly entityType: ImportEntityType = 'customer';
  readonly requiredColumns = ['fullName', 'phone'];
  readonly optionalColumns = [
    'customerNumber',
    'email',
    'customerType',
    'companyName',
    'gstNumber',
    'address',
    'city',
    'state',
    'postalCode',
    'notes',
  ];

  getTemplate() {
    return {
      headers: [
        'customerNumber',
        'fullName',
        'phone',
        'email',
        'customerType',
        'companyName',
        'gstNumber',
        'address',
        'city',
        'state',
        'postalCode',
        'notes',
      ],
      exampleRows: [
        {
          customerNumber: 'CUST-2026-0001',
          fullName: 'Rajesh Sharma',
          phone: '9876543210',
          email: 'rajesh.sharma@example.com',
          customerType: 'INDIVIDUAL',
          companyName: '',
          gstNumber: '',
          address: 'Flat 402, Sunshine Apts, Baner Road',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411045',
          notes: 'RO Filter installed in 2024',
        },
        {
          customerNumber: '',
          fullName: 'TechCorp Solutions',
          phone: '9123456780',
          email: 'admin@techcorp.in',
          customerType: 'COMMERCIAL',
          companyName: 'TechCorp Solutions Pvt Ltd',
          gstNumber: '27AAAAA0000A1Z5',
          address: 'Plot 12, Hinjewadi Phase 1',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411057',
          notes: 'Commercial Water Purifier AMC',
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

    const seenPhones = new Set<string>();
    const seenCustNumbers = new Set<string>();
    const phonesToCheck: string[] = [];
    const custNumbersToCheck: string[] = [];

    // 1. Initial row validation & duplicate checking within uploaded file
    const validatedRows: Array<{
      rowNumber: number;
      normalized: Record<string, any>;
      rowErrors: ImportRowError[];
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const raw = rows[i];
      const rowErrors: ImportRowError[] = [];

      // Extract & normalize fields
      const fullName = this.normalizeString(
        raw.fullName || raw.name || raw['Full Name'] || raw.CustomerName || raw['Customer Name']
      );
      const rawPhone = raw.phone || raw.mobile || raw['Phone Number'] || raw.MobileNumber || raw.Mobile || raw['Phone'];
      const phone = this.normalizePhone(rawPhone);
      const email = this.normalizeString(raw.email || raw['Email Address'] || raw.Email).toLowerCase();
      const customerNumber = this.normalizeString(
        raw.customerNumber || raw['Customer Number'] || raw.CustomerId || raw['Customer ID']
      ).toUpperCase();
      const customerTypeRaw = this.normalizeString(raw.customerType || raw['Customer Type'] || raw.Type).toUpperCase();
      const customerType = customerTypeRaw === 'COMMERCIAL' ? 'COMMERCIAL' : 'INDIVIDUAL';
      const companyName = this.normalizeString(raw.companyName || raw['Company Name'] || raw.Company);
      const gstNumber = this.normalizeString(raw.gstNumber || raw['GST Number'] || raw.GSTIN || raw.gstin).toUpperCase();
      const address = this.normalizeString(raw.address || raw.addressLine1 || raw['Address'] || raw['Address Line 1']);
      const city = this.normalizeString(raw.city || raw['City']) || 'Pune';
      const state = this.normalizeString(raw.state || raw['State']) || 'Maharashtra';
      const postalCode = this.normalizeString(
        raw.postalCode || raw.pincode || raw.pin || raw['PIN Code'] || raw['Postal Code'] || raw.Zip
      );
      const notes = this.normalizeString(raw.notes || raw['Notes'] || raw.Remarks);

      // Required field: fullName
      if (!fullName) {
        rowErrors.push({
          rowNumber,
          field: 'fullName',
          code: 'REQUIRED_FIELD',
          message: 'Full name is required.',
        });
      }

      // Required field: phone
      if (!phone) {
        rowErrors.push({
          rowNumber,
          field: 'phone',
          code: 'REQUIRED_FIELD',
          message: 'Phone number is required.',
        });
      } else if (phone.length < 10) {
        rowErrors.push({
          rowNumber,
          field: 'phone',
          code: 'INVALID_FORMAT',
          message: `Phone number '${rawPhone}' is invalid. Must contain at least 10 digits.`,
          value: String(rawPhone),
        });
      }

      // Email format check
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push({
          rowNumber,
          field: 'email',
          code: 'INVALID_FORMAT',
          message: `Invalid email address format: '${email}'.`,
          value: email,
        });
      }

      // Check intra-file duplicate phone
      if (phone) {
        if (seenPhones.has(phone)) {
          rowErrors.push({
            rowNumber,
            field: 'phone',
            code: 'DUPLICATE',
            message: `Duplicate phone '${phone}' found within the uploaded file.`,
            value: phone,
          });
        } else {
          seenPhones.add(phone);
          phonesToCheck.push(phone);
        }
      }

      // Check intra-file duplicate customerNumber
      if (customerNumber) {
        if (seenCustNumbers.has(customerNumber)) {
          rowErrors.push({
            rowNumber,
            field: 'customerNumber',
            code: 'DUPLICATE',
            message: `Duplicate customer number '${customerNumber}' found within uploaded file.`,
            value: customerNumber,
          });
        } else {
          seenCustNumbers.add(customerNumber);
          custNumbersToCheck.push(customerNumber);
        }
      }

      const normalized = {
        rowNumber,
        fullName,
        phone,
        email: email || undefined,
        customerNumber: customerNumber || undefined,
        customerType,
        companyName: companyName || undefined,
        gstNumber: gstNumber || undefined,
        address: address || undefined,
        city,
        state,
        postalCode: postalCode || undefined,
        notes: notes || undefined,
      };

      validatedRows.push({ rowNumber, normalized, rowErrors });
    }

    // 2. Check Database for Existing Duplicates in Chunks
    const existingDbPhones = new Set<string>();
    const existingDbCustNumbers = new Set<string>();

    const CHUNK_SIZE = 500;
    for (let i = 0; i < phonesToCheck.length; i += CHUNK_SIZE) {
      const phoneSlice = phonesToCheck.slice(i, i + CHUNK_SIZE);
      const custSlice = custNumbersToCheck.slice(i, i + CHUNK_SIZE);

      try {
        const found = await db
          .select({ phone: customers.phone, customerNumber: customers.customerNumber })
          .from(customers)
          .where(
            or(
              phoneSlice.length > 0 ? inArray(customers.phone, phoneSlice) : undefined,
              custSlice.length > 0 ? inArray(customers.customerNumber, custSlice) : undefined
            )
          );

        for (const f of found) {
          if (f.phone) existingDbPhones.add(f.phone);
          if (f.customerNumber) existingDbCustNumbers.add(f.customerNumber);
        }
      } catch (err) {
        // Continue
      }
    }

    let duplicateRows = 0;
    let validRows = 0;
    let invalidRows = 0;

    for (const item of validatedRows) {
      const { rowNumber, normalized, rowErrors } = item;

      if (normalized.phone && existingDbPhones.has(normalized.phone)) {
        rowErrors.push({
          rowNumber,
          field: 'phone',
          code: 'DUPLICATE',
          message: `Customer with phone '${normalized.phone}' already exists in database.`,
          value: normalized.phone,
        });
      }

      if (normalized.customerNumber && existingDbCustNumbers.has(normalized.customerNumber)) {
        rowErrors.push({
          rowNumber,
          field: 'customerNumber',
          code: 'DUPLICATE',
          message: `Customer number '${normalized.customerNumber}' already exists in database.`,
          value: normalized.customerNumber,
        });
      }

      if (rowErrors.length > 0) {
        invalidRows++;
        errors.push(...rowErrors);
        if (rowErrors.some((e) => e.code === 'DUPLICATE')) {
          duplicateRows++;
        }
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
    duplicatePolicy: ImportDuplicatePolicy = 'CREATE',
    context?: ImporterContext
  ): Promise<ImportExecuteResult> {
    const startTime = Date.now();
    const errors: ImportRowError[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const CHUNK_SIZE = 500;

    for (let chunkIdx = 0; chunkIdx < records.length; chunkIdx += CHUNK_SIZE) {
      const chunk = records.slice(chunkIdx, chunkIdx + CHUNK_SIZE);

      await db.transaction(async (tx) => {
        // Collect phones in chunk for batch lookup
        const chunkPhones: string[] = [];
        const chunkCustNums: string[] = [];

        for (const raw of chunk) {
          const phone = this.normalizePhone(raw.phone || raw.mobile || raw['Phone Number'] || raw.MobileNumber);
          if (phone) chunkPhones.push(phone);
          const custNum = this.normalizeString(raw.customerNumber || raw['Customer Number'] || raw.CustomerId).toUpperCase();
          if (custNum) chunkCustNums.push(custNum);
        }

        // Batch query existing customers
        const existingMap = new Map<string, any>();
        if (chunkPhones.length > 0 || chunkCustNums.length > 0) {
          let existingList: any[] = [];
          if (typeof tx.select === 'function') {
            const conditions: any[] = [];
            if (chunkPhones.length > 0) conditions.push(inArray(customers.phone, chunkPhones));
            if (chunkCustNums.length > 0) conditions.push(inArray(customers.customerNumber, chunkCustNums));

            existingList = await tx
              .select()
              .from(customers)
              .where(or(...conditions));
          } else if (tx.query?.customers?.findMany) {
            existingList = await tx.query.customers.findMany({
              where: or(
                chunkPhones.length > 0 ? inArray(customers.phone, chunkPhones) : undefined,
                chunkCustNums.length > 0 ? inArray(customers.customerNumber, chunkCustNums) : undefined
              ),
            });
          }

          for (const ext of existingList) {
            if (ext.phone) existingMap.set(`phone:${ext.phone}`, ext);
            if (ext.customerNumber) existingMap.set(`num:${ext.customerNumber}`, ext);
          }
        }

        for (let i = 0; i < chunk.length; i++) {
          const raw = chunk[i];
          const rowNumber = raw.rowNumber || chunkIdx + i + 1;
          const fullName = this.normalizeString(
            raw.fullName || raw.name || raw['Full Name'] || raw.CustomerName || raw['Customer Name']
          );
          const phone = this.normalizePhone(raw.phone || raw.mobile || raw['Phone Number'] || raw.MobileNumber);
          const email = this.normalizeString(raw.email || raw['Email Address'] || raw.Email).toLowerCase();
          const customerNumberRaw = this.normalizeString(
            raw.customerNumber || raw['Customer Number'] || raw.CustomerId
          ).toUpperCase();
          const customerType =
            this.normalizeString(raw.customerType || raw['Customer Type']).toUpperCase() === 'COMMERCIAL'
              ? 'COMMERCIAL'
              : 'INDIVIDUAL';
          const companyName = this.normalizeString(raw.companyName || raw['Company Name']);
          const gstNumber = this.normalizeString(raw.gstNumber || raw['GST Number']).toUpperCase();
          const address = this.normalizeString(raw.address || raw.addressLine1 || raw['Address']);
          const city = this.normalizeString(raw.city || raw['City']) || 'Pune';
          const state = this.normalizeString(raw.state || raw['State']) || 'Maharashtra';
          const postalCode = this.normalizeString(raw.postalCode || raw.pincode || raw.pin || raw['PIN Code']) || '411001';
          const notes = this.normalizeString(raw.notes || raw['Notes']);

          if (!fullName || !phone || phone.length < 10) {
            failed++;
            errors.push({
              rowNumber,
              field: !fullName ? 'fullName' : 'phone',
              code: 'REQUIRED_FIELD',
              message: `Row ${rowNumber}: Full name and valid 10-digit phone number are required.`,
            });
            continue;
          }

          const existing = existingMap.get(`phone:${phone}`) || (customerNumberRaw ? existingMap.get(`num:${customerNumberRaw}`) : null);

          if (existing) {
            if (duplicatePolicy === 'SKIP') {
              skipped++;
              continue;
            } else if (duplicatePolicy === 'UPDATE') {
              await tx
                .update(customers)
                .set({
                  fullName,
                  email: email || existing.email,
                  customerType,
                  companyName: companyName || existing.companyName,
                  gstNumber: gstNumber || existing.gstNumber,
                  notes: notes ? `${existing.notes || ''}\n${notes}`.trim() : existing.notes,
                  updatedAt: new Date(),
                })
                .where(eq(customers.id, existing.id));

              if (address) {
                await tx.insert(customerAddresses).values({
                  customerId: existing.id,
                  addressType: 'SERVICE',
                  addressLine1: address,
                  city,
                  state,
                  postalCode,
                  isDefault: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }

              updated++;
              continue;
            } else {
              failed++;
              errors.push({
                rowNumber,
                field: 'phone',
                code: 'DUPLICATE',
                message: `Row ${rowNumber}: Customer with phone '${phone}' already exists in database.`,
              });
              continue;
            }
          }

          // Generate sequential customer number if not provided
          let customerNumber = customerNumberRaw;
          if (!customerNumber) {
            try {
              const gen = await generateBusinessNumber(tx, 'CUSTOMER', 'CUST');
              customerNumber = gen?.sequenceNumber;
            } catch {}
            if (!customerNumber) {
              customerNumber = `CUST-${new Date().getFullYear()}-${String(chunkIdx + i + 1).padStart(4, '0')}`;
            }
          }

          // Insert new customer record
          const [newCustomer] = await tx
            .insert(customers)
            .values({
              customerNumber,
              fullName,
              phone,
              email: email || null,
              customerType,
              companyName: companyName || null,
              gstNumber: gstNumber || null,
              notes: notes || null,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          if (newCustomer) {
            // Track in local map to prevent intra-chunk duplicates
            existingMap.set(`phone:${phone}`, newCustomer);
            existingMap.set(`num:${customerNumber}`, newCustomer);

            // Insert primary service address
            await tx.insert(customerAddresses).values({
              customerId: newCustomer.id,
              addressType: 'SERVICE',
              addressLine1: address || `${city}, ${state}`,
              city,
              state,
              postalCode,
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
            updated,
            skipped,
            failed,
            duplicatePolicy,
          },
          changeReason: `Imported ${imported} customer records via Data Import Engine`,
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
