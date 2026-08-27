import { paymentsRepository } from './payments.repository';
import { notificationsService } from '../notifications/notifications.service';
import type {
  PaymentQueryFilter,
  CreatePaymentInput,
  CancelPaymentInput,
  RefundPaymentInput,
} from '@crm/validation';

export class PaymentsService {
  async getPayments(filters: PaymentQueryFilter) {
    return paymentsRepository.findPaginated(filters);
  }

  async getPaymentById(id: string) {
    const payment = await paymentsRepository.findById(id);
    if (!payment) {
      throw new Error('Payment record not found');
    }
    return payment;
  }

  async getKPIs() {
    return paymentsRepository.getKPIs();
  }

  async recordPayment(input: CreatePaymentInput, actorId?: string, actorName = 'Staff') {
    const result = await paymentsRepository.recordPayment(input, actorId, actorName);
    try {
      if (result?.payment) {
        await notificationsService.dispatchPaymentReceived({
          paymentId: result.payment.id,
          amount: Number(result.payment.amount || 0),
          customerName: 'Customer',
          invoiceNumber: result.invoiceNumber,
        });

        // Trigger transactional customer payment receipt email with attached invoice PDF
        import('../notifications/email.service').then(({ emailService }) => {
          emailService.sendPaymentReceipt(result.payment.id).catch((err) => {
            console.error('[PaymentsService] Error dispatching payment receipt email:', err);
          });
        }).catch(() => {});
      }
    } catch {
      // Non-blocking notification dispatch
    }
    return result;
  }

  async cancelPayment(id: string, input: CancelPaymentInput, actorId?: string, actorName = 'Staff') {
    return paymentsRepository.cancelPayment(id, input, actorId, actorName);
  }

  async refundPayment(id: string, input: RefundPaymentInput, actorId?: string, actorName = 'Staff') {
    return paymentsRepository.refundPayment(id, input, actorId, actorName);
  }

  async getPaymentsByInvoice(invoiceId: string) {
    return paymentsRepository.getPaymentsByInvoice(invoiceId);
  }

  async getInvoiceBalance(invoiceId: string) {
    return paymentsRepository.getInvoiceBalance(invoiceId);
  }

  async getCustomerFinancialSummary(customerId: string) {
    return paymentsRepository.getCustomerFinancialSummary(customerId);
  }
}

export const paymentsService = new PaymentsService();
