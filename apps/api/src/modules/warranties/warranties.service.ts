import { warrantiesRepository } from './warranties.repository';
import type {
  WarrantyQueryFilter,
  CreateWarrantyInput,
  UpdateWarrantyInput,
} from '@crm/validation';

export class WarrantiesService {
  async getWarranties(filters: WarrantyQueryFilter) {
    return warrantiesRepository.findPaginated(filters);
  }

  async getWarrantyById(id: string) {
    const warranty = await warrantiesRepository.findById(id);
    if (!warranty) {
      throw new Error('Warranty record not found');
    }
    return warranty;
  }

  async getKPIs() {
    return warrantiesRepository.getKPIs();
  }

  async getExpiringWarranties(days = 30) {
    return warrantiesRepository.findPaginated({
      expiringDays: days,
      status: 'ACTIVE',
      page: 1,
      limit: 50,
      sortBy: 'endDate',
      sortOrder: 'asc',
    });
  }

  async createWarranty(input: CreateWarrantyInput, actorId?: string, actorName = 'Staff') {
    const result = await warrantiesRepository.createWarranty(input, actorId, actorName);
    try {
      const { domainEventBus } = await import('../notifications/events/event-bus');
      domainEventBus.publish(
        'WARRANTY_CREATED',
        'WARRANTY',
        result.id,
        {
          warrantyNumber: result.warrantyNumber,
          customerId: result.customerId,
          assetId: result.assetId,
          endDate: result.endDate,
        },
        actorId,
        actorName
      );
    } catch (e) {
      console.error('Failed to emit WARRANTY_CREATED event:', e);
    }
    return result;
  }

  async updateWarranty(id: string, input: UpdateWarrantyInput, actorId?: string, actorName = 'Staff') {
    return warrantiesRepository.updateWarranty(id, input, actorId, actorName);
  }

  async cancelWarranty(id: string, reason: string, actorId?: string, actorName = 'Staff') {
    return warrantiesRepository.cancelWarranty(id, reason, actorId, actorName);
  }

  async getAssetWarranty(assetId: string) {
    return warrantiesRepository.getAssetWarranty(assetId);
  }
}

export const warrantiesService = new WarrantiesService();
