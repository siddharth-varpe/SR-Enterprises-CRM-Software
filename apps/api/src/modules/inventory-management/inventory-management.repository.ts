import { eq, and, gte, lte, desc, asc, sql, ilike, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { configService } from '../system/configuration.service';
import type { InventorySettings } from '@crm/types';
import {
  inventoryItems,
  inventoryPurchases,
  inventorySales,
  customers,
} from '../../database/schema';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  InventoryItemQueryFilter,
  CreateInventoryPurchaseInput,
  UpdateInventoryPurchaseInput,
  InventoryPurchaseQueryFilter,
  CreateInventorySaleInput,
  UpdateInventorySaleInput,
  InventorySaleQueryFilter,
  InventoryAnalyticsFilter,
  InventoryProfitLedgerFilter,
} from '@crm/validation';

export const memoryInventoryItems: any[] = [];
export const memoryPurchases: any[] = [];
export const memorySales: any[] = [];

export class InventoryManagementRepository {
  /**
   * Helper to format currency values safely
   */
  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  // =========================================================================
  // INVENTORY ITEMS (MASTER)
  // =========================================================================

  async getItems(filters: InventoryItemQueryFilter) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const seenIds = new Set<string>();
    const allItems: any[] = [];

    // Dynamically resolve lowStockThreshold from configuration
    const invConfig = await configService.get<InventorySettings>('INVENTORY');
    const threshold = invConfig?.lowStockThreshold ?? 5;

    try {
      const conditions: any[] = [];

      if (filters.status && filters.status !== 'ALL') {
        conditions.push(eq(inventoryItems.status, filters.status));
      }

      if (filters.category && filters.category !== 'ALL') {
        conditions.push(eq(inventoryItems.category, filters.category));
      }

      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          sql`(${inventoryItems.name} ILIKE ${term} OR ${inventoryItems.brand} ILIKE ${term} OR ${inventoryItems.partNumber} ILIKE ${term})`
        );
      }

      if (filters.lowStockOnly) {
        conditions.push(
          sql`${inventoryItems.currentStock} <= CASE WHEN ${inventoryItems.minStockLevel} > 0 THEN ${inventoryItems.minStockLevel} ELSE ${threshold} END`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const dbRows = await db
        .select()
        .from(inventoryItems)
        .where(whereClause)
        .orderBy(asc(inventoryItems.name));

      for (const r of dbRows) {
        if (r && r.id && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          allItems.push(r);
        }
      }
    } catch (err) {
      console.warn('[InventoryManagementRepository.getItems] DB query notice, using memory store:', err);
    }

    // Merge memory inventory items
    for (const m of memoryInventoryItems) {
      if (m && m.id && !seenIds.has(m.id)) {
        if (filters.status && filters.status !== 'ALL' && m.status !== filters.status) continue;
        if (filters.category && filters.category !== 'ALL' && m.category !== filters.category) continue;
        const itemThreshold = Number(m.minStockLevel) > 0 ? Number(m.minStockLevel) : threshold;
        if (filters.lowStockOnly && Number(m.currentStock) > itemThreshold) continue;
        if (filters.search && filters.search.trim()) {
          const s = filters.search.toLowerCase();
          const match =
            (m.name || '').toLowerCase().includes(s) ||
            (m.brand || '').toLowerCase().includes(s) ||
            (m.partNumber || '').toLowerCase().includes(s);
          if (!match) continue;
        }
        seenIds.add(m.id);
        allItems.push(m);
      }
    }

    const total = allItems.length;
    const paginated = allItems.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getItemById(id: string) {
    let item: any = null;
    let recentPurchases: any[] = [];
    let recentSales: any[] = [];

    try {
      const [dbItem] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
      if (dbItem) item = dbItem;

      if (item) {
        recentPurchases = await db
          .select()
          .from(inventoryPurchases)
          .where(eq(inventoryPurchases.itemId, id))
          .orderBy(desc(inventoryPurchases.purchaseDate), desc(inventoryPurchases.createdAt))
          .limit(10);

        recentSales = await db
          .select()
          .from(inventorySales)
          .where(eq(inventorySales.itemId, id))
          .orderBy(desc(inventorySales.saleDate), desc(inventorySales.createdAt))
          .limit(10);
      }
    } catch (err) {
      console.warn('[InventoryManagementRepository.getItemById] DB notice:', err);
    }

    if (!item) {
      item = memoryInventoryItems.find((i) => i.id === id);
    }
    if (!item) return null;

    const memPurchases = memoryPurchases.filter((p) => p.itemId === id);
    const memSales = memorySales.filter((s) => s.itemId === id);

    return {
      ...item,
      recentPurchases: recentPurchases.length > 0 ? recentPurchases : memPurchases.slice(0, 10),
      recentSales: recentSales.length > 0 ? recentSales : memSales.slice(0, 10),
    };
  }

  async createItem(input: CreateInventoryItemInput) {
    const initialStock = Number(input.initialStock) || 0;
    const purchasePrice = Number(input.purchasePrice) || 0;
    const sellingPrice = Number(input.sellingPrice) || 0;
    const invConfig = await configService.get<InventorySettings>('INVENTORY');
    const defaultLowStock = invConfig?.lowStockThreshold ?? 5;
    const minStockLevel = input.minStockLevel !== undefined && input.minStockLevel !== null ? Number(input.minStockLevel) : defaultLowStock;
    const itemId = randomUUID();
    const now = new Date();

    const newItem: any = {
      id: itemId,
      name: input.name.trim(),
      category: input.category.trim(),
      brand: input.brand?.trim() || null,
      partNumber: input.partNumber?.trim() || null,
      description: input.description?.trim() || null,
      purchasePrice: purchasePrice.toFixed(2),
      sellingPrice: sellingPrice.toFixed(2),
      currentStock: initialStock,
      minStockLevel,
      status: input.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    try {
      const [inserted] = await db
        .insert(inventoryItems)
        .values({
          id: itemId,
          name: newItem.name,
          category: newItem.category,
          brand: newItem.brand,
          partNumber: newItem.partNumber,
          description: newItem.description,
          purchasePrice: newItem.purchasePrice,
          sellingPrice: newItem.sellingPrice,
          currentStock: initialStock,
          minStockLevel,
          status: newItem.status,
        })
        .returning();

      if (inserted) {
        Object.assign(newItem, inserted);
      }

      // Record opening stock purchase batch
      if (initialStock > 0) {
        const year = now.getFullYear();
        const uniqueSuffix = `${itemId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        const purchaseNumber = `PUR-${year}-INIT-${uniqueSuffix}`;
        const initPurchase = {
          id: randomUUID(),
          purchaseNumber,
          itemId,
          supplierName: 'Opening Stock',
          purchaseDate: now,
          quantity: initialStock,
          remainingQuantity: initialStock,
          purchasePricePerUnit: purchasePrice.toFixed(2),
          totalAmount: (initialStock * purchasePrice).toFixed(2),
          notes: 'Initial opening stock batch',
          createdAt: now,
          updatedAt: now,
        };

        try {
          await db.insert(inventoryPurchases).values(initPurchase);
        } catch {}
        memoryPurchases.unshift(initPurchase);
      }
    } catch (err) {
      console.warn('[InventoryManagementRepository.createItem] DB notice, using memory fallback:', err);
    }

    memoryInventoryItems.unshift(newItem);
    return newItem;
  }

  async updateItem(id: string, input: UpdateInventoryItemInput) {
    const now = new Date();
    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.category !== undefined) updateData.category = input.category.trim();
    if (input.brand !== undefined) updateData.brand = input.brand?.trim() || null;
    if (input.partNumber !== undefined) updateData.partNumber = input.partNumber?.trim() || null;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.purchasePrice !== undefined) updateData.purchasePrice = Number(input.purchasePrice).toFixed(2);
    if (input.sellingPrice !== undefined) updateData.sellingPrice = Number(input.sellingPrice).toFixed(2);
    if (input.minStockLevel !== undefined) updateData.minStockLevel = Number(input.minStockLevel);
    if (input.status !== undefined) updateData.status = input.status;

    let updated: any = null;
    try {
      const [res] = await db
        .update(inventoryItems)
        .set(updateData)
        .where(eq(inventoryItems.id, id))
        .returning();
      if (res) updated = res;
    } catch (err) {
      console.warn('[InventoryManagementRepository.updateItem] DB notice:', err);
    }

    const memIdx = memoryInventoryItems.findIndex((i) => i.id === id);
    if (memIdx !== -1) {
      memoryInventoryItems[memIdx] = { ...memoryInventoryItems[memIdx], ...updateData };
      if (!updated) updated = memoryInventoryItems[memIdx];
    }

    return updated || { id, ...updateData };
  }

  async deleteItem(id: string) {
    // 1. Check if sales exist
    let salesCount = 0;
    try {
      const [sRes] = await db
        .select({ count: count(inventorySales.id) })
        .from(inventorySales)
        .where(eq(inventorySales.itemId, id));
      salesCount = Number(sRes?.count || 0);
    } catch {}
    const memSalesCount = memorySales.filter((s) => s.itemId === id).length;
    if (salesCount > 0 || memSalesCount > 0) {
      throw new Error('Cannot delete inventory item: already used in existing inventory sales transactions');
    }

    // 2. Check if external supplier purchases exist (supplierName != 'Opening Stock')
    let supplierPurchasesCount = 0;
    try {
      const [pRes] = await db
        .select({ count: count(inventoryPurchases.id) })
        .from(inventoryPurchases)
        .where(
          and(
            eq(inventoryPurchases.itemId, id),
            sql`${inventoryPurchases.supplierName} IS NOT NULL AND ${inventoryPurchases.supplierName} != 'Opening Stock'`
          )
        );
      supplierPurchasesCount = Number(pRes?.count || 0);
    } catch {}
    const memPurchasesCount = memoryPurchases.filter(
      (p) => p.itemId === id && p.supplierName && p.supplierName !== 'Opening Stock'
    ).length;
    if (supplierPurchasesCount > 0 || memPurchasesCount > 0) {
      throw new Error('Cannot delete inventory item: already used in existing inventory purchase transactions');
    }

    // 3. Safe to delete: delete opening batch purchases and the item
    try {
      await db.transaction(async (tx) => {
        await tx.delete(inventoryPurchases).where(eq(inventoryPurchases.itemId, id));
        await tx.delete(inventoryItems).where(eq(inventoryItems.id, id));
      });
    } catch (err) {
      console.warn('[InventoryManagementRepository.deleteItem] DB notice:', err);
    }

    // Also clean up from memoryPurchases and memoryInventoryItems
    for (let i = memoryPurchases.length - 1; i >= 0; i--) {
      if (memoryPurchases[i].itemId === id) {
        memoryPurchases.splice(i, 1);
      }
    }
    const idx = memoryInventoryItems.findIndex((i) => i.id === id);
    if (idx !== -1) {
      memoryInventoryItems.splice(idx, 1);
    }

    return { id, success: true };
  }

  // =========================================================================
  // PURCHASES (INWARD STOCK)
  // =========================================================================

  async createPurchase(input: CreateInventoryPurchaseInput) {
    const qty = Number(input.quantity);
    const unitCost = Number(input.purchasePricePerUnit);
    const totalAmount = this.round(qty * unitCost);
    const now = new Date();
    const purchaseDate = new Date(input.purchaseDate);
    const year = now.getFullYear();
    const purId = randomUUID();
    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const purchaseNumber = `PUR-${year}-${uniqueSuffix}`;

    const purchaseRecord: any = {
      id: purId,
      purchaseNumber,
      itemId: input.itemId,
      supplierName: input.supplierName?.trim() || null,
      purchaseDate,
      quantity: qty,
      remainingQuantity: qty,
      purchasePricePerUnit: unitCost.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.transaction(async (tx) => {
        const [purchase] = await tx
          .insert(inventoryPurchases)
          .values({
            id: purId,
            purchaseNumber,
            itemId: input.itemId,
            supplierName: input.supplierName?.trim() || null,
            purchaseDate,
            quantity: qty,
            remainingQuantity: qty,
            purchasePricePerUnit: unitCost.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            notes: input.notes?.trim() || null,
          })
          .returning();

        if (purchase) Object.assign(purchaseRecord, purchase);

        await tx
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} + ${qty}`,
            purchasePrice: unitCost.toFixed(2),
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, input.itemId));
      });
    } catch (err) {
      console.warn('[InventoryManagementRepository.createPurchase] DB notice, using memory fallback:', err);
    }

    memoryPurchases.unshift(purchaseRecord);
    const memItem = memoryInventoryItems.find((i) => i.id === input.itemId);
    if (memItem) {
      memItem.currentStock = (memItem.currentStock || 0) + qty;
      memItem.purchasePrice = unitCost.toFixed(2);
      memItem.updatedAt = now;
    }

    return purchaseRecord;
  }

  async getPurchases(filters: InventoryPurchaseQueryFilter) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const seenIds = new Set<string>();
    const allPurchases: any[] = [];

    try {
      const conditions: any[] = [];

      if (filters.itemId) {
        conditions.push(eq(inventoryPurchases.itemId, filters.itemId));
      }

      if (filters.dateFrom) {
        conditions.push(gte(inventoryPurchases.purchaseDate, new Date(filters.dateFrom)));
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(inventoryPurchases.purchaseDate, toDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db
        .select({
          id: inventoryPurchases.id,
          purchaseNumber: inventoryPurchases.purchaseNumber,
          itemId: inventoryPurchases.itemId,
          itemName: inventoryItems.name,
          category: inventoryItems.category,
          brand: inventoryItems.brand,
          partNumber: inventoryItems.partNumber,
          supplierName: inventoryPurchases.supplierName,
          purchaseDate: inventoryPurchases.purchaseDate,
          quantity: inventoryPurchases.quantity,
          remainingQuantity: inventoryPurchases.remainingQuantity,
          purchasePricePerUnit: inventoryPurchases.purchasePricePerUnit,
          totalAmount: inventoryPurchases.totalAmount,
          notes: inventoryPurchases.notes,
          createdAt: inventoryPurchases.createdAt,
        })
        .from(inventoryPurchases)
        .innerJoin(inventoryItems, eq(inventoryPurchases.itemId, inventoryItems.id))
        .where(whereClause)
        .orderBy(desc(inventoryPurchases.purchaseDate), desc(inventoryPurchases.createdAt));

      for (const r of rows) {
        if (r && r.id && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          allPurchases.push(r);
        }
      }
    } catch (err) {
      console.warn('[InventoryManagementRepository.getPurchases] DB query notice:', err);
    }

    for (const p of memoryPurchases) {
      if (p && p.id && !seenIds.has(p.id)) {
        if (filters.itemId && p.itemId !== filters.itemId) continue;
        const item = memoryInventoryItems.find((i) => i.id === p.itemId);
        seenIds.add(p.id);
        allPurchases.push({
          ...p,
          itemName: item?.name || 'Inventory Item',
          category: item?.category || 'Spare Part',
          brand: item?.brand || null,
          partNumber: item?.partNumber || null,
        });
      }
    }

    const total = allPurchases.length;
    const paginated = allPurchases.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPurchaseById(id: string) {
    try {
      const [row] = await db
        .select({
          id: inventoryPurchases.id,
          purchaseNumber: inventoryPurchases.purchaseNumber,
          itemId: inventoryPurchases.itemId,
          itemName: inventoryItems.name,
          category: inventoryItems.category,
          brand: inventoryItems.brand,
          partNumber: inventoryItems.partNumber,
          supplierName: inventoryPurchases.supplierName,
          purchaseDate: inventoryPurchases.purchaseDate,
          quantity: inventoryPurchases.quantity,
          remainingQuantity: inventoryPurchases.remainingQuantity,
          purchasePricePerUnit: inventoryPurchases.purchasePricePerUnit,
          totalAmount: inventoryPurchases.totalAmount,
          notes: inventoryPurchases.notes,
          createdAt: inventoryPurchases.createdAt,
          updatedAt: inventoryPurchases.updatedAt,
        })
        .from(inventoryPurchases)
        .innerJoin(inventoryItems, eq(inventoryPurchases.itemId, inventoryItems.id))
        .where(eq(inventoryPurchases.id, id));

      if (row) return row;
    } catch (err) {
      console.warn('[InventoryManagementRepository.getPurchaseById] DB query notice:', err);
    }

    const mem = memoryPurchases.find((p) => p.id === id);
    if (mem) {
      const item = memoryInventoryItems.find((i) => i.id === mem.itemId);
      return {
        ...mem,
        itemName: item?.name || 'Inventory Item',
        category: item?.category || 'Spare Part',
        brand: item?.brand || null,
        partNumber: item?.partNumber || null,
      };
    }

    return null;
  }

  async updatePurchase(id: string, input: UpdateInventoryPurchaseInput) {
    const existing = await this.getPurchaseById(id);
    if (!existing) {
      throw new Error('Purchase record not found');
    }

    const oldQty = Number(existing.quantity);
    const newQty = input.quantity !== undefined ? Number(input.quantity) : oldQty;
    const deltaQty = newQty - oldQty;

    const unitCost =
      input.purchasePricePerUnit !== undefined
        ? Number(input.purchasePricePerUnit)
        : Number(existing.purchasePricePerUnit);
    const totalAmount = this.round(newQty * unitCost);
    const now = new Date();
    const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date(existing.purchaseDate);

    // Stock check if decreasing purchase quantity
    if (deltaQty < 0) {
      const item = await this.getItemById(existing.itemId);
      const currentStock = Number(item?.currentStock || 0);
      if (currentStock + deltaQty < 0) {
        throw new Error(
          `Cannot reduce purchase quantity by ${Math.abs(deltaQty)}. Available item stock is only ${currentStock}.`
        );
      }
    }

    const updateFields: any = {
      quantity: newQty,
      purchasePricePerUnit: unitCost.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      purchaseDate,
      updatedAt: now,
    };

    if (input.supplierName !== undefined) {
      updateFields.supplierName = input.supplierName?.trim() || null;
    }
    if (input.notes !== undefined) {
      updateFields.notes = input.notes?.trim() || null;
    }

    let updatedPurchase: any = null;

    try {
      await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(inventoryPurchases)
          .set({
            ...updateFields,
            remainingQuantity: sql`GREATEST(0, LEAST(${newQty}, ${inventoryPurchases.remainingQuantity} + ${deltaQty}))`,
          })
          .where(eq(inventoryPurchases.id, id))
          .returning();

        updatedPurchase = updated;

        await tx
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} + ${deltaQty}`,
            purchasePrice: unitCost.toFixed(2),
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, existing.itemId));
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Cannot reduce purchase quantity')) {
        throw err;
      }
      console.warn('[InventoryManagementRepository.updatePurchase] DB notice, using memory fallback:', err);
    }

    const memIndex = memoryPurchases.findIndex((p) => p.id === id);
    if (memIndex !== -1) {
      memoryPurchases[memIndex] = {
        ...memoryPurchases[memIndex],
        ...updateFields,
        remainingQuantity: Math.max(0, Math.min(newQty, (memoryPurchases[memIndex].remainingQuantity || 0) + deltaQty)),
      };
      if (!updatedPurchase) updatedPurchase = memoryPurchases[memIndex];
    }

    const memItem = memoryInventoryItems.find((i) => i.id === existing.itemId);
    if (memItem) {
      memItem.currentStock = Math.max(0, (memItem.currentStock || 0) + deltaQty);
      memItem.purchasePrice = unitCost.toFixed(2);
      memItem.updatedAt = now;
    }

    return await this.getPurchaseById(id);
  }

  async deletePurchase(id: string) {
    const existing = await this.getPurchaseById(id);
    if (!existing) {
      throw new Error('Purchase record not found');
    }

    const qty = Number(existing.quantity);
    const item = await this.getItemById(existing.itemId);
    const currentStock = Number(item?.currentStock || 0);

    if (currentStock < qty) {
      throw new Error(
        `Cannot delete purchase: Available stock (${currentStock}) is less than purchase quantity (${qty}). Some units have already been sold.`
      );
    }

    const now = new Date();

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(inventoryItems)
          .set({
            currentStock: sql`GREATEST(0, ${inventoryItems.currentStock} - ${qty})`,
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, existing.itemId));

        await tx.delete(inventoryPurchases).where(eq(inventoryPurchases.id, id));
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Cannot delete purchase')) {
        throw err;
      }
      console.warn('[InventoryManagementRepository.deletePurchase] DB notice, using memory fallback:', err);
    }

    const memIndex = memoryPurchases.findIndex((p) => p.id === id);
    if (memIndex !== -1) {
      memoryPurchases.splice(memIndex, 1);
    }

    const memItem = memoryInventoryItems.find((i) => i.id === existing.itemId);
    if (memItem) {
      memItem.currentStock = Math.max(0, (memItem.currentStock || 0) - qty);
      memItem.updatedAt = now;
    }

    return { success: true, message: 'Purchase record deleted and stock updated successfully' };
  }

  // =========================================================================
  // SALES (OUTWARD STOCK WITH STRICT FIFO COST ALLOCATION)
  // =========================================================================

  async createSale(input: CreateInventorySaleInput) {
    const qty = Number(input.quantity);
    const sellingPrice = Number(input.sellingPricePerUnit);
    const saleId = randomUUID();
    const now = new Date();
    const saleDate = new Date(input.saleDate);
    const year = now.getFullYear();

    const currentItem = await this.getItemById(input.itemId);
    if (!currentItem) {
      throw new Error('Inventory item not found');
    }
    const itemStock = Number(currentItem.currentStock || 0);
    if (itemStock < qty) {
      throw new Error(`Insufficient stock. Available: ${itemStock}, requested: ${qty}`);
    }

    const itemBasePrice = Number(currentItem.purchasePrice || 0);
    let saleRecord: any = null;

    const cleanCustomerId = input.customerId && typeof input.customerId === 'string' && input.customerId.trim() !== '' ? input.customerId.trim() : null;
    const cleanCustomerName = input.customerName && typeof input.customerName === 'string' && input.customerName.trim() !== '' ? input.customerName.trim() : null;
    const cleanCustomerPhone = input.customerPhone && typeof input.customerPhone === 'string' && input.customerPhone.trim() !== '' ? input.customerPhone.trim() : null;

    try {
      saleRecord = await db.transaction(async (tx) => {
        const availableBatches = await tx
          .select()
          .from(inventoryPurchases)
          .where(
            and(
              eq(inventoryPurchases.itemId, input.itemId),
              sql`${inventoryPurchases.remainingQuantity} > 0`
            )
          )
          .orderBy(asc(inventoryPurchases.purchaseDate), asc(inventoryPurchases.createdAt));

        let needed = qty;
        let totalCostAccumulated = 0;

        for (const batch of availableBatches) {
          const take = Math.min(batch.remainingQuantity, needed);
          const batchUnitCost = Number(batch.purchasePricePerUnit);
          totalCostAccumulated += take * batchUnitCost;
          needed -= take;

          const newRemaining = batch.remainingQuantity - take;
          await tx
            .update(inventoryPurchases)
            .set({
              remainingQuantity: newRemaining,
              updatedAt: now,
            })
            .where(eq(inventoryPurchases.id, batch.id));

          if (needed === 0) break;
        }

        if (needed > 0) {
          totalCostAccumulated += needed * itemBasePrice;
        }

        const totalCostAmount = this.round(totalCostAccumulated);
        const purchaseCostPerUnit = this.round(totalCostAmount / qty);
        const totalSaleAmount = this.round(qty * sellingPrice);
        const profit = this.round(totalSaleAmount - totalCostAmount);
        const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const saleNumber = `INV-SALE-${year}-${uniqueSuffix}`;

        const [sale] = await tx
          .insert(inventorySales)
          .values({
            id: saleId,
            saleNumber,
            itemId: input.itemId,
            customerId: cleanCustomerId,
            customerName: cleanCustomerName,
            customerPhone: cleanCustomerPhone,
            saleDate,
            quantity: qty,
            sellingPricePerUnit: sellingPrice.toFixed(2),
            purchaseCostPerUnit: purchaseCostPerUnit.toFixed(2),
            totalSaleAmount: totalSaleAmount.toFixed(2),
            totalCostAmount: totalCostAmount.toFixed(2),
            profit: profit.toFixed(2),
            paymentStatus: input.paymentStatus || 'COMPLETED',
            notes: input.notes?.trim() || null,
          })
          .returning();

        await tx
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} - ${qty}`,
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, input.itemId));

        return sale;
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient stock')) {
        throw err;
      }
      console.warn('[InventoryManagementRepository.createSale] DB notice, using memory fallback:', err);
    }

    if (!saleRecord) {
      const totalCostAmount = this.round(qty * itemBasePrice);
      const totalSaleAmount = this.round(qty * sellingPrice);
      const profit = this.round(totalSaleAmount - totalCostAmount);
      const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const saleNumber = `INV-SALE-${year}-${uniqueSuffix}`;

      saleRecord = {
        id: saleId,
        saleNumber,
        itemId: input.itemId,
        customerId: cleanCustomerId,
        customerName: cleanCustomerName,
        customerPhone: cleanCustomerPhone,
        saleDate,
        quantity: qty,
        sellingPricePerUnit: sellingPrice.toFixed(2),
        purchaseCostPerUnit: itemBasePrice.toFixed(2),
        totalSaleAmount: totalSaleAmount.toFixed(2),
        totalCostAmount: totalCostAmount.toFixed(2),
        profit: profit.toFixed(2),
        paymentStatus: input.paymentStatus || 'COMPLETED',
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
    }

    memorySales.unshift(saleRecord);
    const memItem = memoryInventoryItems.find((i) => i.id === input.itemId);
    if (memItem) {
      memItem.currentStock = Math.max(0, (memItem.currentStock || 0) - qty);
      memItem.updatedAt = now;
    }

    return saleRecord;
  }

  async getSales(filters: InventorySaleQueryFilter) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const seenIds = new Set<string>();
    const allSales: any[] = [];

    try {
      const conditions: any[] = [];

      if (filters.itemId) {
        conditions.push(eq(inventorySales.itemId, filters.itemId));
      }

      if (filters.dateFrom) {
        conditions.push(gte(inventorySales.saleDate, new Date(filters.dateFrom)));
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(inventorySales.saleDate, toDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db
        .select({
          id: inventorySales.id,
          saleNumber: inventorySales.saleNumber,
          itemId: inventorySales.itemId,
          itemName: inventoryItems.name,
          category: inventoryItems.category,
          brand: inventoryItems.brand,
          partNumber: inventoryItems.partNumber,
          customerId: inventorySales.customerId,
          customerName: inventorySales.customerName,
          customerPhone: inventorySales.customerPhone,
          saleDate: inventorySales.saleDate,
          quantity: inventorySales.quantity,
          sellingPricePerUnit: inventorySales.sellingPricePerUnit,
          purchaseCostPerUnit: inventorySales.purchaseCostPerUnit,
          totalSaleAmount: inventorySales.totalSaleAmount,
          totalCostAmount: inventorySales.totalCostAmount,
          profit: inventorySales.profit,
          paymentStatus: inventorySales.paymentStatus,
          notes: inventorySales.notes,
          createdAt: inventorySales.createdAt,
        })
        .from(inventorySales)
        .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
        .where(whereClause)
        .orderBy(desc(inventorySales.saleDate), desc(inventorySales.createdAt));

      for (const r of rows) {
        if (r && r.id && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          allSales.push(r);
        }
      }
    } catch (err) {
      console.warn('[InventoryManagementRepository.getSales] DB query notice:', err);
    }

    for (const s of memorySales) {
      if (s && s.id && !seenIds.has(s.id)) {
        if (filters.itemId && s.itemId !== filters.itemId) continue;
        const item = memoryInventoryItems.find((i) => i.id === s.itemId);
        seenIds.add(s.id);
        allSales.push({
          ...s,
          itemName: item?.name || 'Inventory Item',
          category: item?.category || 'Spare Part',
          brand: item?.brand || null,
          partNumber: item?.partNumber || null,
        });
      }
    }

    const total = allSales.length;
    const paginated = allSales.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSaleById(id: string) {
    try {
      const [row] = await db
        .select({
          id: inventorySales.id,
          saleNumber: inventorySales.saleNumber,
          itemId: inventorySales.itemId,
          itemName: inventoryItems.name,
          category: inventoryItems.category,
          brand: inventoryItems.brand,
          partNumber: inventoryItems.partNumber,
          customerId: inventorySales.customerId,
          customerName: inventorySales.customerName,
          customerPhone: inventorySales.customerPhone,
          saleDate: inventorySales.saleDate,
          quantity: inventorySales.quantity,
          sellingPricePerUnit: inventorySales.sellingPricePerUnit,
          purchaseCostPerUnit: inventorySales.purchaseCostPerUnit,
          totalSaleAmount: inventorySales.totalSaleAmount,
          totalCostAmount: inventorySales.totalCostAmount,
          profit: inventorySales.profit,
          paymentStatus: inventorySales.paymentStatus,
          notes: inventorySales.notes,
          createdAt: inventorySales.createdAt,
          updatedAt: inventorySales.updatedAt,
        })
        .from(inventorySales)
        .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
        .where(eq(inventorySales.id, id));

      if (row) return row;
    } catch (err) {
      console.warn('[InventoryManagementRepository.getSaleById] DB query notice:', err);
    }

    const mem = memorySales.find((s) => s.id === id);
    if (mem) {
      const item = memoryInventoryItems.find((i) => i.id === mem.itemId);
      return {
        ...mem,
        itemName: item?.name || 'Inventory Item',
        category: item?.category || 'Spare Part',
        brand: item?.brand || null,
        partNumber: item?.partNumber || null,
      };
    }

    return null;
  }

  async updateSale(id: string, input: UpdateInventorySaleInput) {
    const existing = await this.getSaleById(id);
    if (!existing) {
      throw new Error('Sale record not found');
    }

    const oldQty = Number(existing.quantity);
    const newQty = input.quantity !== undefined ? Number(input.quantity) : oldQty;
    const deltaQty = newQty - oldQty;

    // Stock check if increasing sale quantity
    if (deltaQty > 0) {
      const item = await this.getItemById(existing.itemId);
      const currentStock = Number(item?.currentStock || 0);
      if (currentStock < deltaQty) {
        throw new Error(
          `Insufficient stock. Need additional ${deltaQty} units, but only ${currentStock} available.`
        );
      }
    }

    const sellingPrice =
      input.sellingPricePerUnit !== undefined
        ? Number(input.sellingPricePerUnit)
        : Number(existing.sellingPricePerUnit);

    const existingUnitCost = Number(existing.purchaseCostPerUnit || 0);
    const unitCost = existingUnitCost > 0 ? existingUnitCost : Number((await this.getItemById(existing.itemId))?.purchasePrice || 0);
    const totalSaleAmount = this.round(newQty * sellingPrice);
    const totalCostAmount = this.round(newQty * unitCost);
    const profit = this.round(totalSaleAmount - totalCostAmount);
    const now = new Date();
    const saleDate = input.saleDate ? new Date(input.saleDate) : new Date(existing.saleDate);

    const updateFields: any = {
      quantity: newQty,
      sellingPricePerUnit: sellingPrice.toFixed(2),
      purchaseCostPerUnit: unitCost.toFixed(2),
      totalSaleAmount: totalSaleAmount.toFixed(2),
      totalCostAmount: totalCostAmount.toFixed(2),
      profit: profit.toFixed(2),
      saleDate,
      updatedAt: now,
    };

    if (input.customerId !== undefined) {
      updateFields.customerId = input.customerId && input.customerId.trim() !== '' ? input.customerId.trim() : null;
    }
    if (input.customerName !== undefined) {
      updateFields.customerName = input.customerName && input.customerName.trim() !== '' ? input.customerName.trim() : null;
    }
    if (input.customerPhone !== undefined) {
      updateFields.customerPhone = input.customerPhone && input.customerPhone.trim() !== '' ? input.customerPhone.trim() : null;
    }
    if (input.paymentStatus !== undefined) {
      updateFields.paymentStatus = input.paymentStatus;
    }
    if (input.notes !== undefined) {
      updateFields.notes = input.notes?.trim() || null;
    }

    let updatedSale: any = null;

    try {
      await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(inventorySales)
          .set(updateFields)
          .where(eq(inventorySales.id, id))
          .returning();

        updatedSale = updated;

        if (deltaQty !== 0) {
          await tx
            .update(inventoryItems)
            .set({
              currentStock: sql`${inventoryItems.currentStock} - ${deltaQty}`,
              updatedAt: now,
            })
            .where(eq(inventoryItems.id, existing.itemId));
        }
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient stock')) {
        throw err;
      }
      console.warn('[InventoryManagementRepository.updateSale] DB notice, using memory fallback:', err);
    }

    const memIndex = memorySales.findIndex((s) => s.id === id);
    if (memIndex !== -1) {
      memorySales[memIndex] = {
        ...memorySales[memIndex],
        ...updateFields,
      };
      if (!updatedSale) updatedSale = memorySales[memIndex];
    }

    if (deltaQty !== 0) {
      const memItem = memoryInventoryItems.find((i) => i.id === existing.itemId);
      if (memItem) {
        memItem.currentStock = Math.max(0, (memItem.currentStock || 0) - deltaQty);
        memItem.updatedAt = now;
      }
    }

    return await this.getSaleById(id);
  }

  async deleteSale(id: string) {
    const existing = await this.getSaleById(id);
    if (!existing) {
      throw new Error('Sale record not found');
    }

    const qtyToRestore = Number(existing.quantity);
    const now = new Date();

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} + ${qtyToRestore}`,
            updatedAt: now,
          })
          .where(eq(inventoryItems.id, existing.itemId));

        await tx.delete(inventorySales).where(eq(inventorySales.id, id));
      });
    } catch (err) {
      console.warn('[InventoryManagementRepository.deleteSale] DB notice, using memory fallback:', err);
    }

    const memIndex = memorySales.findIndex((s) => s.id === id);
    if (memIndex !== -1) {
      memorySales.splice(memIndex, 1);
    }

    const memItem = memoryInventoryItems.find((i) => i.id === existing.itemId);
    if (memItem) {
      memItem.currentStock = (memItem.currentStock || 0) + qtyToRestore;
      memItem.updatedAt = now;
    }

    return { success: true, message: 'Sale record deleted and stock restored successfully' };
  }

  // =========================================================================
  // ANALYTICS & PROFIT METRICS
  // =========================================================================

  private resolveDateRange(filter: InventoryAnalyticsFilter): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (filter.period) {
      case 'today':
        break;
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        break;
      }
      case 'month':
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0, 1);
        break;
      case 'custom':
        if (filter.startDate) start = new Date(filter.startDate);
        if (filter.endDate) {
          const customEnd = new Date(filter.endDate);
          customEnd.setHours(23, 59, 59, 999);
          return { start, end: customEnd };
        }
        break;
    }

    return { start, end };
  }

  async getAnalytics(filter: InventoryAnalyticsFilter) {
    const { start, end } = this.resolveDateRange(filter);
    const invConfig = await configService.get<InventorySettings>('INVENTORY');
    const threshold = invConfig?.lowStockThreshold ?? 5;

    try {
      const [salesSummary] = await db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${inventorySales.totalSaleAmount}), '0')`,
          totalCost: sql<string>`COALESCE(SUM(${inventorySales.totalCostAmount}), '0')`,
          netProfit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
          qtySold: sql<string>`COALESCE(SUM(${inventorySales.quantity}), '0')`,
          salesCount: sql<number>`count(*)`,
        })
        .from(inventorySales)
        .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)));

      const [purchasesSummary] = await db
        .select({
          totalPurchases: sql<string>`COALESCE(SUM(${inventoryPurchases.totalAmount}), '0')`,
          qtyPurchased: sql<string>`COALESCE(SUM(${inventoryPurchases.quantity}), '0')`,
          purchasesCount: sql<number>`count(*)`,
        })
        .from(inventoryPurchases)
        .where(
          and(gte(inventoryPurchases.purchaseDate, start), lte(inventoryPurchases.purchaseDate, end))
        );

      const [inventoryStock] = await db
        .select({
          totalItems: sql<number>`count(*)`,
          totalStockQty: sql<string>`COALESCE(SUM(${inventoryItems.currentStock}), '0')`,
          stockValuation: sql<string>`COALESCE(SUM(${inventoryItems.currentStock} * ${inventoryItems.purchasePrice}), '0')`,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.status, 'ACTIVE'));

      const [lowStockCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.status, 'ACTIVE'),
            sql`${inventoryItems.currentStock} <= CASE WHEN ${inventoryItems.minStockLevel} > 0 THEN ${inventoryItems.minStockLevel} ELSE ${threshold} END`
          )
        );

      const topSellingItems = await db
        .select({
          itemId: inventorySales.itemId,
          name: inventoryItems.name,
          category: inventoryItems.category,
          totalQuantitySold: sql<number>`COALESCE(SUM(${inventorySales.quantity}), 0)`,
          totalRevenue: sql<string>`COALESCE(SUM(${inventorySales.totalSaleAmount}), '0')`,
          totalProfit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
        })
        .from(inventorySales)
        .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
        .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)))
        .groupBy(inventorySales.itemId, inventoryItems.name, inventoryItems.category)
        .orderBy(sql`SUM(${inventorySales.quantity}) DESC`)
        .limit(5);

      const topProfitableItems = await db
        .select({
          itemId: inventorySales.itemId,
          name: inventoryItems.name,
          category: inventoryItems.category,
          totalQuantitySold: sql<number>`COALESCE(SUM(${inventorySales.quantity}), 0)`,
          totalProfit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
          marginPercent: sql<number>`CASE WHEN SUM(${inventorySales.totalSaleAmount}) > 0 THEN ROUND((SUM(${inventorySales.profit}) / SUM(${inventorySales.totalSaleAmount}) * 100)::numeric, 1) ELSE 0 END`,
        })
        .from(inventorySales)
        .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
        .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)))
        .groupBy(inventorySales.itemId, inventoryItems.name, inventoryItems.category)
        .orderBy(sql`SUM(${inventorySales.profit}) DESC`)
        .limit(5);

      const lowStockAlerts = await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          category: inventoryItems.category,
          brand: inventoryItems.brand,
          currentStock: inventoryItems.currentStock,
          minStockLevel: inventoryItems.minStockLevel,
        })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.status, 'ACTIVE'),
            sql`${inventoryItems.currentStock} <= CASE WHEN ${inventoryItems.minStockLevel} > 0 THEN ${inventoryItems.minStockLevel} ELSE ${threshold} END`
          )
        )
        .orderBy(asc(inventoryItems.currentStock))
        .limit(10);

      const dailySeries = await db
        .select({
          date: sql<string>`DATE(${inventorySales.saleDate})`,
          sales: sql<string>`COALESCE(SUM(${inventorySales.totalSaleAmount}), '0')`,
          costs: sql<string>`COALESCE(SUM(${inventorySales.totalCostAmount}), '0')`,
          profit: sql<string>`COALESCE(SUM(${inventorySales.profit}), '0')`,
        })
        .from(inventorySales)
        .where(and(gte(inventorySales.saleDate, start), lte(inventorySales.saleDate, end)))
        .groupBy(sql`DATE(${inventorySales.saleDate})`)
        .orderBy(sql`DATE(${inventorySales.saleDate}) ASC`);

      const totalSalesNum = Number(salesSummary?.totalSales || 0);
      const totalCostNum = Number(salesSummary?.totalCost || 0);
      const netProfitNum = Number(salesSummary?.netProfit || 0);
      const grossMarginPercent = totalSalesNum > 0 ? this.round((netProfitNum / totalSalesNum) * 100) : 0;

      return {
        period: filter.period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        kpis: {
          totalSales: totalSalesNum,
          totalPurchases: Number(purchasesSummary?.totalPurchases || 0),
          totalCostOfGoodsSold: totalCostNum,
          netProfit: netProfitNum,
          grossMarginPercent,
          totalQtySold: Number(salesSummary?.qtySold || 0),
          totalQtyPurchased: Number(purchasesSummary?.qtyPurchased || 0),
          salesTransactionCount: Number(salesSummary?.salesCount || 0),
          purchaseTransactionCount: Number(purchasesSummary?.purchasesCount || 0),
          totalActiveItems: Number(inventoryStock?.totalItems || 0),
          totalStockQuantity: Number(inventoryStock?.totalStockQty || 0),
          currentStockValuation: Number(inventoryStock?.stockValuation || 0),
          lowStockItemsCount: Number(lowStockCount?.count || 0),
        },
        topSellingItems,
        topProfitableItems,
        lowStockAlerts,
        dailySeries: dailySeries.map((d) => ({
          date: d.date,
          sales: Number(d.sales),
          costs: Number(d.costs),
          profit: Number(d.profit),
        })),
      };
    } catch {
      // Memory fallback analytics
      let totalSalesNum = 0;
      let totalCostNum = 0;
      let netProfitNum = 0;
      let qtySold = 0;

      for (const s of memorySales) {
        totalSalesNum += parseFloat(s.totalSaleAmount || '0');
        totalCostNum += parseFloat(s.totalCostAmount || '0');
        netProfitNum += parseFloat(s.profit || '0');
        qtySold += Number(s.quantity || 0);
      }

      let totalPurchases = 0;
      let qtyPurchased = 0;
      for (const p of memoryPurchases) {
        totalPurchases += parseFloat(p.totalAmount || '0');
        qtyPurchased += Number(p.quantity || 0);
      }

      let totalStockQuantity = 0;
      let currentStockValuation = 0;
      let lowStockItemsCount = 0;
      for (const i of memoryInventoryItems) {
        const stk = Number(i.currentStock || 0);
        const cost = parseFloat(i.purchasePrice || '0');
        totalStockQuantity += stk;
        currentStockValuation += stk * cost;
        const itemThreshold = Number(i.minStockLevel) > 0 ? Number(i.minStockLevel) : threshold;
        if (stk <= itemThreshold) lowStockItemsCount++;
      }

      return {
        period: filter.period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        kpis: {
          totalSales: totalSalesNum,
          totalPurchases,
          totalCostOfGoodsSold: totalCostNum,
          netProfit: netProfitNum,
          grossMarginPercent: totalSalesNum > 0 ? this.round((netProfitNum / totalSalesNum) * 100) : 0,
          totalQtySold: qtySold,
          totalQtyPurchased: qtyPurchased,
          salesTransactionCount: memorySales.length,
          purchaseTransactionCount: memoryPurchases.length,
          totalActiveItems: memoryInventoryItems.length,
          totalStockQuantity,
          currentStockValuation,
          lowStockItemsCount,
        },
        topSellingItems: [],
        topProfitableItems: [],
        lowStockAlerts: memoryInventoryItems.filter((i) => {
          const itemThreshold = Number(i.minStockLevel) > 0 ? Number(i.minStockLevel) : threshold;
          return Number(i.currentStock || 0) <= itemThreshold;
        }),
        dailySeries: [],
      };
    }
  }

  // =========================================================================
  // PROFIT LEDGER (TRANSACTION-LEVEL PROFIT BREAKDOWN)
  // =========================================================================

  async getProfitLedger(filters: InventoryProfitLedgerFilter) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const seenIds = new Set<string>();
    const allRows: any[] = [];

    try {
      const conditions: any[] = [];

      if (filters.itemId) {
        conditions.push(eq(inventorySales.itemId, filters.itemId));
      }

      if (filters.period) {
        const { start, end } = this.resolveDateRange({
          period: filters.period,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        conditions.push(gte(inventorySales.saleDate, start));
        conditions.push(lte(inventorySales.saleDate, end));
      } else {
        if (filters.startDate) {
          conditions.push(gte(inventorySales.saleDate, new Date(filters.startDate)));
        }
        if (filters.endDate) {
          const toDate = new Date(filters.endDate);
          toDate.setHours(23, 59, 59, 999);
          conditions.push(lte(inventorySales.saleDate, toDate));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db
        .select({
          id: inventorySales.id,
          saleNumber: inventorySales.saleNumber,
          saleDate: inventorySales.saleDate,
          itemId: inventorySales.itemId,
          itemName: inventoryItems.name,
          category: inventoryItems.category,
          brand: inventoryItems.brand,
          partNumber: inventoryItems.partNumber,
          customerName: inventorySales.customerName,
          quantity: inventorySales.quantity,
          purchaseCostPerUnit: inventorySales.purchaseCostPerUnit,
          sellingPricePerUnit: inventorySales.sellingPricePerUnit,
          totalCostAmount: inventorySales.totalCostAmount,
          totalSaleAmount: inventorySales.totalSaleAmount,
          profit: inventorySales.profit,
        })
        .from(inventorySales)
        .innerJoin(inventoryItems, eq(inventorySales.itemId, inventoryItems.id))
        .where(whereClause)
        .orderBy(desc(inventorySales.saleDate), desc(inventorySales.createdAt));

      for (const r of rows) {
        if (r && r.id && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          allRows.push(r);
        }
      }
    } catch (err) {
      console.warn('[InventoryManagementRepository.getProfitLedger] DB query notice:', err);
    }

    for (const s of memorySales) {
      if (s && s.id && !seenIds.has(s.id)) {
        if (filters.itemId && s.itemId !== filters.itemId) continue;
        const item = memoryInventoryItems.find((i) => i.id === s.itemId);
        seenIds.add(s.id);
        allRows.push({
          id: s.id,
          saleNumber: s.saleNumber,
          saleDate: s.saleDate,
          itemId: s.itemId,
          itemName: item?.name || 'Inventory Item',
          category: item?.category || 'Spare Part',
          brand: item?.brand || null,
          partNumber: item?.partNumber || null,
          customerName: s.customerName,
          quantity: s.quantity,
          purchaseCostPerUnit: s.purchaseCostPerUnit,
          sellingPricePerUnit: s.sellingPricePerUnit,
          totalCostAmount: s.totalCostAmount,
          totalSaleAmount: s.totalSaleAmount,
          profit: s.profit,
        });
      }
    }

    const formattedRows = allRows.map((r) => {
      const saleAmt = Number(r.totalSaleAmount);
      const profitAmt = Number(r.profit);
      const marginPercent = saleAmt > 0 ? this.round((profitAmt / saleAmt) * 100) : 0;
      return {
        ...r,
        purchaseCostPerUnit: Number(r.purchaseCostPerUnit),
        sellingPricePerUnit: Number(r.sellingPricePerUnit),
        totalCostAmount: Number(r.totalCostAmount),
        totalSaleAmount: saleAmt,
        profit: profitAmt,
        marginPercent,
      };
    });

    const total = formattedRows.length;
    const paginated = formattedRows.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const inventoryManagementRepository = new InventoryManagementRepository();
