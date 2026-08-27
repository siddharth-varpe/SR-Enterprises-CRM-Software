import { notificationsRepository } from './notifications.repository';
import type {
  NotificationEntity,
  NotificationType,
  NotificationSeverity,
  NotificationQueryFilter,
} from '@crm/types';
import type { UpdateNotificationPreferencesInput } from '@crm/validation';

export class NotificationsService {
  /**
   * Core create notification with deduplication
   */
  async createNotification(params: {
    userId?: string | null;
    targetRole?: string | null;
    notificationType: NotificationType;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    entityType?: 'CUSTOMER' | 'SALE' | 'INVOICE' | 'PAYMENT' | 'SERVICE' | 'JOB_CARD' | 'WARRANTY' | 'INQUIRY' | 'REMINDER' | 'SYSTEM' | null;
    entityId?: string | null;
    actionUrl?: string | null;
    eventKey?: string | null;
  }): Promise<NotificationEntity | null> {
    // Deduplication check
    if (params.eventKey) {
      const existing = await notificationsRepository.findByEventKey(params.eventKey);
      if (existing) {
        return existing as unknown as NotificationEntity;
      }
    }

    const created = await notificationsRepository.create({
      userId: params.userId || undefined,
      targetRole: (params.targetRole as any) || undefined,
      notificationType: params.notificationType as any,
      title: params.title,
      message: params.message,
      severity: (params.severity || 'INFO') as any,
      entityType: params.entityType || undefined,
      entityId: params.entityId || undefined,
      actionUrl: params.actionUrl || undefined,
      eventKey: params.eventKey || undefined,
      isRead: false,
    });

    return created as unknown as NotificationEntity;
  }

  /**
   * Event Dispatcher: Payment Received
   */
  async dispatchPaymentReceived(params: {
    paymentId: string;
    amount: number;
    customerName: string;
    invoiceNumber?: string;
  }) {
    return this.createNotification({
      targetRole: 'Admin',
      notificationType: 'PAYMENT_RECEIVED',
      title: `Payment Received: ₹${params.amount.toLocaleString('en-IN')}`,
      message: `Payment of ₹${params.amount.toLocaleString('en-IN')} received from ${params.customerName}${
        params.invoiceNumber ? ` for Invoice #${params.invoiceNumber}` : ''
      }.`,
      severity: 'SUCCESS',
      entityType: 'PAYMENT',
      entityId: params.paymentId,
      actionUrl: '/payments',
      eventKey: `payment_${params.paymentId}`,
    });
  }

  /**
   * Event Dispatcher: New Website Inquiry / Lead
   */
  async dispatchNewInquiry(params: {
    inquiryId: string;
    customerName: string;
    inquiryType?: string;
    source?: string;
  }) {
    return this.createNotification({
      targetRole: 'Admin',
      notificationType: 'NEW_INQUIRY',
      title: `New Inbound Inquiry: ${params.customerName}`,
      message: `New ${params.inquiryType ? params.inquiryType.replace(/_/g, ' ') : 'lead'} inquiry received via ${
        params.source || 'Website'
      }.`,
      severity: 'INFO',
      entityType: 'INQUIRY',
      entityId: params.inquiryId,
      actionUrl: `/inquiries/${params.inquiryId}`,
      eventKey: `inquiry_${params.inquiryId}`,
    });
  }

  /**
   * Event Dispatcher: Job Card Assigned to Technician
   */
  async dispatchJobAssigned(params: {
    jobCardId: string;
    jobCardNumber: string;
    technicianId: string;
    customerName: string;
    serviceType: string;
  }) {
    return this.createNotification({
      userId: params.technicianId,
      notificationType: 'JOB_ASSIGNED',
      title: `Job Assigned: ${params.jobCardNumber}`,
      message: `You have been assigned ${params.serviceType.replace(/_/g, ' ')} job for ${params.customerName}.`,
      severity: 'INFO',
      entityType: 'JOB_CARD',
      entityId: params.jobCardId,
      actionUrl: `/job-cards/${params.jobCardId}`,
      eventKey: `job_assigned_${params.jobCardId}_${params.technicianId}`,
    });
  }

  /**
   * Event Dispatcher: Job Card Completed
   */
  async dispatchJobCompleted(params: {
    jobCardId: string;
    jobCardNumber: string;
    technicianName: string;
    customerName: string;
  }) {
    return this.createNotification({
      targetRole: 'Admin',
      notificationType: 'JOB_COMPLETED',
      title: `Job Completed: ${params.jobCardNumber}`,
      message: `Technician ${params.technicianName} completed the job for ${params.customerName}.`,
      severity: 'SUCCESS',
      entityType: 'JOB_CARD',
      entityId: params.jobCardId,
      actionUrl: `/job-cards/${params.jobCardId}`,
      eventKey: `job_completed_${params.jobCardId}`,
    });
  }

  /**
   * Event Dispatcher: Invoice Overdue Alert
   */
  async dispatchInvoiceOverdue(params: {
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    overdueAmount: number;
  }) {
    return this.createNotification({
      targetRole: 'Admin',
      notificationType: 'INVOICE_OVERDUE',
      title: `Invoice Overdue: #${params.invoiceNumber}`,
      message: `Invoice #${params.invoiceNumber} for ${params.customerName} has an overdue balance of ₹${params.overdueAmount.toLocaleString('en-IN')}.`,
      severity: 'WARNING',
      entityType: 'INVOICE',
      entityId: params.invoiceId,
      actionUrl: `/invoices/${params.invoiceId}`,
      eventKey: `invoice_overdue_${params.invoiceId}`,
    });
  }

  /**
   * Event Dispatcher: Reminder Due
   */
  async dispatchReminderDue(params: {
    reminderId: string;
    customerName: string;
    reminderType: string;
    dueDate: string;
  }) {
    return this.createNotification({
      targetRole: 'Staff',
      notificationType: 'REMINDER_DUE',
      title: `Follow-up Due: ${params.customerName}`,
      message: `${params.reminderType.replace(/_/g, ' ')} follow-up for ${params.customerName} is due today (${params.dueDate}).`,
      severity: 'WARNING',
      entityType: 'REMINDER',
      entityId: params.reminderId,
      actionUrl: '/reminders',
      eventKey: `reminder_due_${params.reminderId}`,
    });
  }

  /**
   * Event Dispatcher: Warranty Expiring Soon
   */
  async dispatchWarrantyExpiring(params: {
    warrantyId: string;
    customerName: string;
    machineModel: string;
    expiryDate: string;
  }) {
    return this.createNotification({
      targetRole: 'Staff',
      notificationType: 'WARRANTY_EXPIRING',
      title: `Warranty Expiring: ${params.customerName}`,
      message: `Warranty for ${params.machineModel} owned by ${params.customerName} expires on ${params.expiryDate}. Contact customer for AMC renewal.`,
      severity: 'WARNING',
      entityType: 'WARRANTY',
      entityId: params.warrantyId,
      actionUrl: '/warranties',
      eventKey: `warranty_expiring_${params.warrantyId}`,
    });
  }

  /**
   * List notifications for user
   */
  async listNotifications(userId: string, userRole: string, filter: NotificationQueryFilter) {
    return notificationsRepository.listForUser(userId, userRole, {
      page: filter.page || 1,
      limit: filter.limit || 20,
      isRead: filter.isRead,
      severity: filter.severity,
      notificationType: filter.notificationType,
      entityType: filter.entityType,
      search: filter.search,
    });
  }

  /**
   * Get unread counts
   */
  async getUnreadCount(userId: string, userRole: string) {
    return notificationsRepository.getUnreadCount(userId, userRole);
  }

  /**
   * Mark single notification read
   */
  async markAsRead(id: string, userId: string, userRole: string) {
    return notificationsRepository.markAsRead(id, userId, userRole);
  }

  /**
   * Mark all read
   */
  async markAllAsRead(userId: string, userRole: string) {
    return notificationsRepository.markAllAsRead(userId, userRole);
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string) {
    return notificationsRepository.getPreferences(userId);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, prefs: UpdateNotificationPreferencesInput) {
    return notificationsRepository.updatePreferences(userId, prefs);
  }
}

export const notificationsService = new NotificationsService();
