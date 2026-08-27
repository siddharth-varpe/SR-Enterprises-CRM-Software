import { serviceBillingRepository } from './service-billing.repository';
import type { GenerateServiceInvoiceInput } from '@crm/validation';

export class ServiceBillingService {
  /**
   * Get billable preview and summary for a Job Card
   */
  async getBillingSummary(jobCardId: string) {
    return await serviceBillingRepository.getBillingSummary(jobCardId);
  }

  /**
   * Generate authoritative Service Invoice with atomic stock deduction and idempotency
   */
  async generateServiceInvoice(input: GenerateServiceInvoiceInput, actorId?: string, actorName?: string) {
    return await serviceBillingRepository.generateServiceInvoice(input, actorId, actorName);
  }
}

export const serviceBillingService = new ServiceBillingService();
