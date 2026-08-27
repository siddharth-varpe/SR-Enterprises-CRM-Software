import { whatsappRepository } from './whatsapp.repository';
import { getWhatsAppProvider } from './whatsapp.provider';
import type {
  SendWhatsAppTextMessageDto,
  SendWhatsAppTemplateMessageDto,
  WhatsAppTemplateDefinition,
  WhatsAppConversationQueryFilters,
  WhatsAppOptInStatus,
} from '@crm/types';

/**
 * Standard Approved WhatsApp Business Templates Registry for SR Enterprises
 */
export const APPROVED_WHATSAPP_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    id: 'invoice_reminder',
    name: 'invoice_reminder',
    category: 'TRANSACTIONAL',
    language: 'en',
    description: 'Friendly reminder for pending RO service or machine sale invoice payment.',
    parameterKeys: ['customer_name', 'invoice_number', 'amount_due', 'due_date'],
    sampleText:
      'Dear {{customer_name}}, this is a friendly reminder from SR Enterprises that Invoice {{invoice_number}} for Rs. {{amount_due}} is due on {{due_date}}. Please make payment via UPI or visit our customer portal.',
  },
  {
    id: 'service_scheduled',
    name: 'service_scheduled',
    category: 'UTILITY',
    language: 'en',
    description: 'Notification to customer when a doorstep RO service visit is scheduled.',
    parameterKeys: ['customer_name', 'machine_model', 'scheduled_time', 'technician_name'],
    sampleText:
      'Hello {{customer_name}}, your RO service visit for {{machine_model}} has been scheduled on {{scheduled_time}}. Technician {{technician_name}} will visit your registered address.',
  },
  {
    id: 'job_completed',
    name: 'job_completed',
    category: 'UTILITY',
    language: 'en',
    description: 'Service completion confirmation and water purifier health summary.',
    parameterKeys: ['customer_name', 'job_card_number', 'machine_model', 'service_summary'],
    sampleText:
      'Dear {{customer_name}}, service for your {{machine_model}} under Job Card {{job_card_number}} has been successfully completed: {{service_summary}}. Thank you for choosing SR Enterprises!',
  },
  {
    id: 'payment_receipt',
    name: 'payment_receipt',
    category: 'TRANSACTIONAL',
    language: 'en',
    description: 'Official payment acknowledgement and receipt notification.',
    parameterKeys: ['customer_name', 'receipt_number', 'amount_paid', 'invoice_number'],
    sampleText:
      'Hello {{customer_name}}, we have received your payment of Rs. {{amount_paid}} for Invoice {{invoice_number}} (Receipt #{{receipt_number}}). Thank you for your business with SR Enterprises.',
  },
  {
    id: 'warranty_expiry_notice',
    name: 'warranty_expiry_notice',
    category: 'UTILITY',
    language: 'en',
    description: 'Advance notice for RO water purifier warranty or AMC expiry.',
    parameterKeys: ['customer_name', 'machine_model', 'expiry_date'],
    sampleText:
      'Dear {{customer_name}}, the warranty / AMC for your RO system {{machine_model}} is expiring on {{expiry_date}}. Contact SR Enterprises to renew and enjoy uninterrupted pure water service.',
  },
];

export class WhatsAppService {
  /**
   * List Pre-approved Template Definitions
   */
  getApprovedTemplates(): WhatsAppTemplateDefinition[] {
    return APPROVED_WHATSAPP_TEMPLATES;
  }

  /**
   * Get Template Definition by Name
   */
  getTemplateByName(templateName: string): WhatsAppTemplateDefinition | undefined {
    return APPROVED_WHATSAPP_TEMPLATES.find((t) => t.name === templateName);
  }

  /**
   * List Conversations with Search & Status Filters
   */
  async listConversations(filters: WhatsAppConversationQueryFilters = {}) {
    return whatsappRepository.findConversations(filters);
  }

  /**
   * Get Single Conversation Details
   */
  async getConversationById(id: string) {
    const conv = await whatsappRepository.findConversationById(id);
    if (!conv) {
      throw new Error('WhatsApp conversation not found');
    }
    return conv;
  }

  /**
   * Get Messages for Conversation
   */
  async listMessages(conversationId: string, page = 1, limit = 50) {
    return whatsappRepository.findMessages(conversationId, page, limit);
  }

  /**
   * Send Direct Outbound Text Message
   */
  async sendTextMessage(dto: SendWhatsAppTextMessageDto, actorUserId?: string) {
    let contactId: string;
    let recipientPhone: string;
    let conversationId: string;

    // 1. Resolve conversation, contact, and recipient phone
    if (dto.conversationId) {
      const conv = await whatsappRepository.findConversationById(dto.conversationId);
      if (!conv || !conv.contact) {
        throw new Error('Conversation or contact not found');
      }
      conversationId = conv.id;
      contactId = conv.contact.id;
      recipientPhone = conv.contact.phone;
    } else if (dto.customerId || dto.phone) {
      const contact = await whatsappRepository.findOrCreateContact(
        dto.phone || '',
        dto.customerId || null
      );
      contactId = contact.id;
      recipientPhone = contact.phone;
      const conv = await whatsappRepository.findOrCreateConversation(contact.id, contact.customerId);
      conversationId = conv.id;
    } else {
      throw new Error('Must provide either conversationId, customerId, or phone');
    }

    // 2. Persist local outbound message in QUEUED state (Local-First Guarantee)
    const localMessage = await whatsappRepository.createOutboundMessage({
      conversationId,
      contactId,
      content: dto.content.trim(),
      messageType: 'TEXT',
      ...(actorUserId ? { sentByUserId: actorUserId } : {}),
      status: 'QUEUED',
    });

    // 3. Dispatch through configured WhatsApp provider
    const provider = getWhatsAppProvider();
    const sendResult = await provider.sendTextMessage(recipientPhone, dto.content.trim());

    // 4. Update message status based on provider response
    const updatedMessage = await whatsappRepository.updateMessageStatus(localMessage.id, {
      ...(sendResult.providerMessageId ? { providerMessageId: sendResult.providerMessageId } : {}),
      status: sendResult.status,
      ...(sendResult.error?.code ? { errorCode: sendResult.error.code } : {}),
      ...(sendResult.error?.message ? { errorMessage: sendResult.error.message } : {}),
    });

    return updatedMessage;
  }

  /**
   * Send Pre-Approved WhatsApp Business Template Message
   */
  async sendTemplateMessage(dto: SendWhatsAppTemplateMessageDto, actorUserId?: string) {
    // 1. Validate template exists in approved registry
    const templateDef = APPROVED_WHATSAPP_TEMPLATES.find((t) => t.name === dto.templateName);
    if (!templateDef) {
      throw new Error(`Template "${dto.templateName}" is not registered or approved.`);
    }

    // 2. Render sample message preview from parameters
    let renderedContent = templateDef.sampleText;
    for (const [key, val] of Object.entries(dto.parameters)) {
      renderedContent = renderedContent.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }

    // 3. Resolve Contact & Conversation
    const contact = await whatsappRepository.findOrCreateContact(
      dto.recipientPhone,
      dto.customerId || null
    );
    const conversation = await whatsappRepository.findOrCreateConversation(
      contact.id,
      contact.customerId
    );

    // 4. Persist local message record in QUEUED state
    const localMessage = await whatsappRepository.createOutboundMessage({
      conversationId: conversation.id,
      contactId: contact.id,
      content: renderedContent,
      messageType: 'TEMPLATE',
      templateName: dto.templateName,
      templateParams: dto.parameters,
      ...(actorUserId ? { sentByUserId: actorUserId } : {}),
      status: 'QUEUED',
    });

    // 5. Dispatch via Provider
    const provider = getWhatsAppProvider();
    const sendResult = await provider.sendTemplateMessage(
      contact.phone,
      dto.templateName,
      templateDef.language,
      dto.parameters
    );

    // 6. Update message delivery status
    const updatedMessage = await whatsappRepository.updateMessageStatus(localMessage.id, {
      ...(sendResult.providerMessageId ? { providerMessageId: sendResult.providerMessageId } : {}),
      status: sendResult.status,
      ...(sendResult.error?.code ? { errorCode: sendResult.error.code } : {}),
      ...(sendResult.error?.message ? { errorMessage: sendResult.error.message } : {}),
    });

    return updatedMessage;
  }

  /**
   * Update Communication Consent
   */
  async updateConsent(contactId: string, optInStatus: WhatsAppOptInStatus) {
    return whatsappRepository.updateConsent(contactId, optInStatus);
  }

  /**
   * Mark Conversation as Read
   */
  async markAsRead(conversationId: string) {
    return whatsappRepository.markConversationAsRead(conversationId);
  }

  /**
   * Process Incoming Webhook Event with HMAC validation & Idempotency Guarantee
   */
  async processWebhook(rawBody: string, signatureHeader?: string, parsedPayload?: any) {
    const provider = getWhatsAppProvider();

    // 1. Signature Verification
    const isSignatureValid = provider.validateWebhookSignature(rawBody, signatureHeader);
    if (!isSignatureValid) {
      throw new Error('Invalid webhook signature');
    }

    // 2. Parse payload into structured events
    const events = provider.parseWebhookPayload(parsedPayload);
    const results: any[] = [];

    for (const ev of events) {
      // 3. Webhook Idempotency: Prevent duplicate message creation / redundant updates
      const isNewEvent = await whatsappRepository.recordEventIfNew(
        ev.eventId,
        ev.eventType,
        (ev.raw as Record<string, unknown>) || {}
      );

      if (!isNewEvent) {
        results.push({ eventId: ev.eventId, status: 'SKIPPED_DUPLICATE' });
        continue;
      }

      // 4. Process event based on type
      if (ev.eventType === 'message_status_update' && ev.providerMessageId && ev.status) {
        const updated = await whatsappRepository.updateMessageStatusByProviderId(
          ev.providerMessageId,
          ev.status,
          ev.errorCode || ev.errorMessage
            ? {
                code: ev.errorCode || 'UNKNOWN_ERROR',
                message: ev.errorMessage || 'Error reported by provider',
              }
            : undefined,
          ev.timestamp || undefined
        );
        results.push({ eventId: ev.eventId, status: 'PROCESSED_STATUS', updated: !!updated });
      } else if (ev.eventType === 'inbound_message' && ev.from && ev.messageText) {
        const inboundMsg = await whatsappRepository.createInboundMessage({
          fromPhone: ev.from,
          providerMessageId: ev.providerMessageId || `inbound_${Date.now()}`,
          content: ev.messageText,
          ...(ev.timestamp ? { timestamp: ev.timestamp } : {}),
        });
        results.push({
          eventId: ev.eventId,
          status: 'PROCESSED_INBOUND',
          messageId: inboundMsg ? inboundMsg.id : undefined,
        });
      } else {
        results.push({ eventId: ev.eventId, status: 'PROCESSED_OTHER' });
      }
    }

    return results;
  }
}

export const whatsappService = new WhatsAppService();
