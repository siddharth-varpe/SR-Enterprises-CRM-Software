/**
 * Inventory Stock Importer
 * Handles initial opening balance and stock adjustment import with strict ledger transaction recording.
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
import { products } from '../../../database/schema/products';
import { inventoryBalances, inventoryTransactions } from '../../../database/schema/inventory';
import { auditLogs } from '../../../database/schema/audit';
import { eq, inArray } from 'drizzle-orm';

export class InventoryImporter extends BaseImporter {
  readonly entityType: ImportEntityType = 'inventory';
  readonly requiredColumns = ['productSku', 'quantity'];
  readonly optionalColumns = ['minimumAlertStock', 'reason'];

  getTemplate() {
    return {
      headers: ['productSku', 'quantity', 'minimumAlertStock', 'reason'],
      exampleRows: [
        {
          productSku: 'RO-KENT-GP',
          quantity: '25',
          minimumAlertStock: '5',
          reason: 'Initial Warehouse Opening Stock',
        },
        {
          productSku: 'SP-MEM-75GPD',
          quantity: '100',
          minimumAlertStock: '10',
          reason: 'Bulk shipment batch #9021',
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

    const seenSkus = new Set<string>();
    const skusToCheck: string[] = [];

    const parsedRows: Array<{
      rowNumber: number;
      normalized: Record<string, any>;
      rowErrors: ImportRowError[];
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const raw = rows[i];
      const rowErrors: ImportRowError[] = [];

      const productSku = this.normalizeString(raw.productSku || raw.sku || raw['Product SKU'] || raw.SKU).toUpperCase();
      const quantity = this.parseSafeNumber(raw.quantity || raw.stock || raw['Quantity'] || raw.Count);
      const minimumAlertStock = Math.max(0, parseInt(String(raw.minimumAlertStock || raw['Min Stock'] || 5), 10) || 5);
      const reason = this.normalizeString(raw.reason || raw['Reason']) || 'Stock Import';

      // Required: Product SKU
      if (!productSku) {
        rowErrors.push({
          rowNumber,
          field: 'productSku',
          code: 'REQUIRED_FIELD',
          message: 'Product SKU is required to update inventory.',
        });
      } else {
        skusToCheck.push(productSku);
      }

      // Required: Quantity
      if (quantity === null) {
        rowErrors.push({
          rowNumber,
          field: 'quantity',
          code: 'REQUIRED_FIELD',
          message: 'Quantity is required and must be a valid number.',
        });
      } else if (quantity < 0) {
        rowErrors.push({
          rowNumber,
          field: 'quantity',
          code: 'INVALID_AMOUNT',
          message: 'Stock quantity cannot be negative.',
          value: quantity,
        });
      }

      // Duplicate in file check
      if (productSku) {
        if (seenSkus.has(productSku)) {
          rowErrors.push({
            rowNumber,
            field: 'productSku',
            code: 'DUPLICATE',
            message: `Duplicate product SKU '${productSku}' in inventory import file. Combine quantities into a single row.`,
            value: productSku,
          });
        } else {
          seenSkus.add(productSku);
        }
      }

      const normalized = {
        rowNumber,
        productSku,
        quantity: quantity ?? 0,
        minimumAlertStock,
        reason,
      };

      parsedRows.push({ rowNumber, normalized, rowErrors });
    }

    // Check Product Existence in DB
    const existingProductsMap = new Map<string, string>();
    if (skusToCheck.length > 0) {
      try {
        const found = await db
          .select({ id: products.id, sku: products.sku })
          .from(products)
          .where(inArray(products.sku, skusToCheck));
        for (const p of found) {
          if (p.sku) existingProductsMap.set(p.sku, p.id);
        }
      } catch {}
    }

    let missingReferenceRows = 0;
    let duplicateRows = 0;
    let validRows = 0;
    let invalidRows = 0;

    for (const item of parsedRows) {
      const { rowNumber, normalized, rowErrors } = item;

      if (normalized.productSku && !existingProductsMap.has(normalized.productSku)) {
        rowErrors.push({
          rowNumber,
          field: 'productSku',
          code: 'MISSING_REFERENCE',
          message: `Product SKU '${normalized.productSku}' does not exist in catalog.`,
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
    duplicatePolicy: ImportDuplicatePolicy = 'UPDATE',
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
        const productSku = this.normalizeString(raw.productSku).toUpperCase();
        const quantity = parseInt(String(raw.quantity || 0), 10);
        const minStock = parseInt(String(raw.minimumAlertStock || 5), 10);
        const reason = raw.reason || 'Inventory Data Import';

        if (!productSku || isNaN(quantity)) {
          failed++;
          errors.push({
            rowNumber,
            field: 'productSku',
            code: 'REQUIRED_FIELD',
            message: 'Invalid inventory row record.',
          });
          continue;
        }

        const product = await tx.query.products.findFirst({
          where: eq(products.sku, productSku),
        });

        if (!product) {
          failed++;
          errors.push({
            rowNumber,
            field: 'productSku',
            code: 'MISSING_REFERENCE',
            message: `Product SKU '${productSku}' not found.`,
          });
          continue;
        }

        // Check if balance record exists
        const existingBalance = await tx.query.inventoryBalances.findFirst({
          where: eq(inventoryBalances.productId, product.id),
        });

        if (!existingBalance) {
          // Create initial balance
          await tx.insert(inventoryBalances).values({
            productId: product.id,
            currentStock: quantity,
            minimumAlertStock: minStock,
          });

          // Insert immutable transaction ledger
          await tx.insert(inventoryTransactions).values({
            productId: product.id,
            type: 'PURCHASE',
            quantity,
            previousStock: 0,
            resultingStock: quantity,
            reason,
            referenceType: 'OPENING_BALANCE',
            actorName: context?.userRole || 'SYSTEM',
          });

          imported++;
        } else {
          // Existing balance found
          if (duplicatePolicy === 'SKIP') {
            skipped++;
            continue;
          }

          const previousStock = existingBalance.currentStock;
          const resultingStock = quantity; // Update target stock
          const diff = resultingStock - previousStock;

          await tx
            .update(inventoryBalances)
            .set({
              currentStock: resultingStock,
              minimumAlertStock: minStock,
              updatedAt: new Date(),
            })
            .where(eq(inventoryBalances.id, existingBalance.id));

          await tx.insert(inventoryTransactions).values({
            productId: product.id,
            type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            quantity: Math.abs(diff),
            previousStock,
            resultingStock,
            reason,
            referenceType: 'ADJUSTMENT',
            actorName: context?.userRole || 'SYSTEM',
          });

          updated++;
        }
      }
    });

    let auditLogId: string | undefined;
    try {
      const [audit] = await db
        .insert(auditLogs)
        .values({
          actorId: context?.userId as any,
          actorUsername: context?.userRole || 'SYSTEM',
          action: 'UPDATE',
          entityType: 'INVENTORY_IMPORT',
          entityId: `IMPORT-${Date.now()}`,
          afterState: { totalProcessed: records.length, imported, updated, skipped, failed },
          changeReason: `Imported stock adjustments for ${imported + updated} products`,
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
