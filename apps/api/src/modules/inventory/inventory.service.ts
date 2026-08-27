import { inventoryRepository, InventoryRepository } from './inventory.repository';
import { withTransaction } from '../../database/transactions';
import { db } from '../../database/client';
import type { InventoryAdjustmentInput, InventoryQueryFilter } from '@crm/validation';

export class InventoryService {
  constructor(private readonly repo: InventoryRepository = inventoryRepository) {}

  async getStockBalance(productId: string) {
    return this.repo.getStockBalance(productId);
  }

  async getStockLevels(filters: InventoryQueryFilter) {
    return this.repo.findStockLevels(filters);
  }

  async adjustStock(input: InventoryAdjustmentInput, actorId?: string | null, actorName?: string | null) {
    try {
      return await withTransaction(async (tx) => {
        return this.repo.recordAdjustment(input, actorId, actorName, tx);
      });
    } catch (err: any) {
      if (err.statusCode || err.code === 'INSUFFICIENT_STOCK') throw err;
      return this.repo.recordAdjustment(input, actorId, actorName, db);
    }
  }

  async getTransactions(filters: InventoryQueryFilter) {
    return this.repo.findTransactions(filters);
  }
}

export const inventoryService = new InventoryService();
