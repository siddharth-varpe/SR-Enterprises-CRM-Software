import { randomUUID } from 'crypto';

export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface ChannelMessage {
  recipientId?: string;
  recipientContact: string; // Email address or phone number
  recipientName?: string;
  title: string;
  body: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  success: boolean;
  channel: 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'SMS';
  status: DeliveryStatus;
  messageId: string;
  error?: string;
  timestamp: Date;
}

export interface NotificationChannel {
  name: 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'SMS';
  isAvailable(): boolean;
  send(message: ChannelMessage): Promise<DeliveryResult>;
}

/**
 * In-App Delivery Channel (Primary Internal System Notifications)
 */
export class InAppChannel implements NotificationChannel {
  name = 'IN_APP' as const;

  isAvailable(): boolean {
    return true;
  }

  async send(message: ChannelMessage): Promise<DeliveryResult> {
    // In-App notifications are persisted via notificationsRepository
    return {
      success: true,
      channel: 'IN_APP',
      status: 'DELIVERED',
      messageId: randomUUID(),
      timestamp: new Date(),
    };
  }
}

import { phpMailerService } from '../php-mailer.service';

/**
 * Transactional Email Channel (Powered by PHPMailer)
 */
export class EmailChannel implements NotificationChannel {
  name = 'EMAIL' as const;

  isAvailable(): boolean {
    return true;
  }

  async send(message: ChannelMessage): Promise<DeliveryResult> {
    if (!message.recipientContact || !message.recipientContact.includes('@')) {
      return {
        success: false,
        channel: 'EMAIL',
        status: 'FAILED',
        messageId: randomUUID(),
        error: 'Invalid recipient email address',
        timestamp: new Date(),
      };
    }

    try {
      const meta = message.metadata || {};
      const result = await phpMailerService.sendPaymentDueEmail({
        toEmail: message.recipientContact,
        toName: message.recipientName || 'Valued Customer',
        invoiceNumber: meta.invoiceNumber || meta.invoice_number || 'INV-DUE',
        totalAmount: Number(meta.totalAmount || meta.total_amount || 0),
        paidAmount: Number(meta.paidAmount || meta.paid_amount || 0),
        dueAmount: Number(meta.dueAmount || meta.due_amount || meta.outstandingAmount || 0),
        dueDate: meta.dueDate || meta.due_date || new Date().toLocaleDateString('en-IN'),
        customerNumber: meta.customerNumber || '',
        notes: message.body || '',
      });

      return {
        success: result.success,
        channel: 'EMAIL',
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId || `email-${randomUUID()}`,
        error: result.error,
        timestamp: new Date(),
      };
    } catch (err: any) {
      return {
        success: false,
        channel: 'EMAIL',
        status: 'FAILED',
        messageId: randomUUID(),
        error: err.message,
        timestamp: new Date(),
      };
    }
  }
}

/**
 * WhatsApp Business API Channel (Pluggable Adapter)
 */
export class WhatsAppChannel implements NotificationChannel {
  name = 'WHATSAPP' as const;

  isAvailable(): boolean {
    return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  }

  async send(message: ChannelMessage): Promise<DeliveryResult> {
    if (!message.recipientContact) {
      return {
        success: false,
        channel: 'WHATSAPP',
        status: 'FAILED',
        messageId: randomUUID(),
        error: 'Missing recipient phone number',
        timestamp: new Date(),
      };
    }

    if (!this.isAvailable()) {
      return {
        success: false,
        channel: 'WHATSAPP',
        status: 'FAILED',
        messageId: randomUUID(),
        error: 'WhatsApp Business provider not configured',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      channel: 'WHATSAPP',
      status: 'SENT',
      messageId: `wa-${randomUUID()}`,
      timestamp: new Date(),
    };
  }
}

/**
 * SMS Channel (Pluggable Adapter)
 */
export class SmsChannel implements NotificationChannel {
  name = 'SMS' as const;

  isAvailable(): boolean {
    return Boolean(process.env.SMS_API_KEY);
  }

  async send(message: ChannelMessage): Promise<DeliveryResult> {
    if (!message.recipientContact) {
      return {
        success: false,
        channel: 'SMS',
        status: 'FAILED',
        messageId: randomUUID(),
        error: 'Missing recipient phone number',
        timestamp: new Date(),
      };
    }

    if (!this.isAvailable()) {
      return {
        success: false,
        channel: 'SMS',
        status: 'FAILED',
        messageId: randomUUID(),
        error: 'SMS gateway provider not configured',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      channel: 'SMS',
      status: 'SENT',
      messageId: `sms-${randomUUID()}`,
      timestamp: new Date(),
    };
  }
}

export const inAppChannel = new InAppChannel();
export const emailChannel = new EmailChannel();
export const whatsAppChannel = new WhatsAppChannel();
export const smsChannel = new SmsChannel();
