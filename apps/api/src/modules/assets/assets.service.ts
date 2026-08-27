import { assetsRepository, AssetsRepository } from './assets.repository';
import { withTransaction } from '../../database/transactions';
import { db } from '../../database/client';
import type { AssetQueryFilter, CreateAssetInput, UpdateAssetInput } from '@crm/validation';

export class AssetsService {
  constructor(private readonly repo: AssetsRepository = assetsRepository) {}

  async getAssets(filters: AssetQueryFilter) {
    return this.repo.findPaginated(filters);
  }

  async getAssetById(id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    return asset;
  }

  async createAsset(data: CreateAssetInput) {
    if (data.serialNumber?.trim()) {
      const existing = await this.repo.findBySerialNumber(data.serialNumber.trim());
      if (existing && existing.status === 'ACTIVE') {
        const error = new Error(`An active asset with serial number "${data.serialNumber}" already exists.`);
        (error as any).statusCode = 409;
        (error as any).code = 'DUPLICATE_SERIAL_NUMBER';
        throw error;
      }
    }

    try {
      return await withTransaction(async (tx) => {
        return this.repo.create(data, tx);
      });
    } catch (err: any) {
      if (err.statusCode || err.code === 'DUPLICATE_SERIAL_NUMBER') throw err;
      return this.repo.create(data, db);
    }
  }

  async updateAsset(id: string, data: UpdateAssetInput) {
    if (data.serialNumber?.trim()) {
      const existing = await this.repo.findBySerialNumber(data.serialNumber.trim());
      if (existing && existing.id !== id && existing.status === 'ACTIVE') {
        const error = new Error(`An active asset with serial number "${data.serialNumber}" already exists.`);
        (error as any).statusCode = 409;
        (error as any).code = 'DUPLICATE_SERIAL_NUMBER';
        throw error;
      }
    }

    const updated = await this.repo.update(id, data);
    if (!updated) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    return updated;
  }

  async archiveAsset(id: string) {
    const archived = await this.repo.archive(id);
    if (!archived) {
      const error = new Error('Asset not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    return archived;
  }

  async getAssetWarranty(assetId: string) {
    const asset = await this.getAssetById(assetId);
    if ((asset as any).warranties && (asset as any).warranties.length > 0) {
      return (asset as any).warranties[0];
    }
    return (asset as any).warranty || null;
  }

  async getAssetServiceHistory(assetId: string) {
    const asset = await this.getAssetById(assetId);
    if ((asset as any).services && (asset as any).services.length > 0) {
      return (asset as any).services;
    }
    return (asset as any).serviceHistory || [];
  }
}

export const assetsService = new AssetsService();
