import { inquiriesRepository } from './inquiries.repository';
import { remindersRepository } from '../reminders/reminders.repository';
import { notificationsService } from '../notifications/notifications.service';
import type {
  CreateInquiryInput,
  UpdateInquiryInput,
  AssignInquiryInput,
  UpdateInquiryStatusInput,
  InquiryFollowUpInput,
  ConvertInquiryInput,
  InquiryQueryFilterInput,
} from '@crm/validation';
import type { InquiryStatus } from '@crm/types';

/**
 * Valid Status Transitions Matrix
 */
const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ['CONTACTED', 'FOLLOW_UP', 'IN_PROGRESS', 'QUALIFIED', 'CLOSED', 'SPAM'],
  CONTACTED: ['FOLLOW_UP', 'IN_PROGRESS', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM'],
  FOLLOW_UP: ['CONTACTED', 'IN_PROGRESS', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM'],
  IN_PROGRESS: ['FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM'],
  QUALIFIED: ['FOLLOW_UP', 'CONVERTED', 'CLOSED', 'SPAM'],
  CONVERTED: ['CLOSED'], // Converted inquiries cannot arbitrarily revert
  CLOSED: ['NEW', 'FOLLOW_UP', 'IN_PROGRESS'], // Reopening
  SPAM: ['NEW'], // Unmarking spam
};

export class InquiriesService {
  async getInquiries(filters: InquiryQueryFilterInput) {
    return inquiriesRepository.findPaginated(filters);
  }

  async getInquiryById(id: string) {
    const inquiry = await inquiriesRepository.findById(id);
    if (!inquiry) {
      throw new Error('Inquiry not found');
    }
    return inquiry;
  }

  async getKPIs() {
    return inquiriesRepository.getKPIs();
  }

  async createInquiry(input: CreateInquiryInput, actorUserId?: string) {
    const inquiry = await inquiriesRepository.createInquiry(input, actorUserId);
    try {
      await notificationsService.dispatchNewInquiry({
        inquiryId: inquiry.id,
        customerName: inquiry.name,
        inquiryType: inquiry.inquiryType,
        source: inquiry.source,
      });
    } catch {
      // Non-blocking notification dispatch
    }
    return inquiry;
  }

  async updateInquiry(id: string, input: UpdateInquiryInput, actorUserId?: string) {
    return inquiriesRepository.updateInquiry(id, input, actorUserId);
  }

  async assignInquiry(id: string, input: AssignInquiryInput, actorUserId?: string) {
    return inquiriesRepository.assignInquiry(
      id,
      input.assignedToUserId || null,
      actorUserId,
      input.notes || undefined
    );
  }

  async updateStatus(id: string, input: UpdateInquiryStatusInput, actorUserId?: string) {
    const existing = await inquiriesRepository.findById(id);
    if (!existing) {
      throw new Error('Inquiry not found');
    }

    if (existing.status !== input.status) {
      const allowed = VALID_TRANSITIONS[existing.status as InquiryStatus] || [];
      if (!allowed.includes(input.status as InquiryStatus)) {
        throw new Error(
          `Invalid status transition from ${existing.status} to ${input.status}. Allowed: ${allowed.join(', ')}`
        );
      }
    }

    return inquiriesRepository.updateStatus(id, input.status as InquiryStatus, actorUserId, input.notes ?? undefined);
  }

  async addFollowUp(id: string, input: InquiryFollowUpInput, actorUserId?: string) {
    const inquiry = await inquiriesRepository.findById(id);
    if (!inquiry) {
      throw new Error('Inquiry not found');
    }

    const updated = await inquiriesRepository.addFollowUp(
      id,
      input.notes || '',
      input.status as InquiryStatus | undefined,
      input.followUpDate || undefined,
      actorUserId
    );

    // If reminder requested and inquiry is converted (or customer exists), create Phase 8 Reminder
    if (input.createReminder && input.followUpDate && inquiry.convertedCustomerId) {
      try {
        await remindersRepository.create(
          {
            customerId: inquiry.convertedCustomerId,
            reminderType: 'CUSTOMER_FOLLOW_UP',
            reminderDate: input.followUpDate,
            priority: input.reminderPriority || 'NORMAL',
            notes: `Follow-up on inquiry ${inquiry.inquiryNumber}: ${input.notes}`,
          },
          actorUserId
        );
      } catch (err) {
        console.warn(`[InquiriesService] Could not auto-create linked reminder:`, err);
      }
    }

    return updated;
  }

  async convertToCustomer(id: string, input: ConvertInquiryInput, actorUserId?: string) {
    return inquiriesRepository.convertToCustomer(id, input, actorUserId);
  }

  async closeInquiry(id: string, notes?: string, actorUserId?: string) {
    return inquiriesRepository.updateStatus(id, 'CLOSED', actorUserId, notes || 'Inquiry closed');
  }

  async markSpam(id: string, notes?: string, actorUserId?: string) {
    return inquiriesRepository.updateStatus(id, 'SPAM', actorUserId, notes || 'Inquiry marked as spam');
  }
}

export const inquiriesService = new InquiriesService();
