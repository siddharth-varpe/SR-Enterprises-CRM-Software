export interface NotificationTemplate {
  key: string;
  titleTemplate: string;
  bodyTemplate: string;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  WARRANTY_EXPIRING_30D: {
    key: 'WARRANTY_EXPIRING_30D',
    titleTemplate: 'Warranty Expiring in 30 Days: {{customerName}}',
    bodyTemplate:
      'The warranty for {{machineModel}} (Serial: {{serialNumber}}) owned by {{customerName}} expires on {{expiryDate}}. Reach out to discuss AMC renewal options.',
  },
  WARRANTY_EXPIRING_7D: {
    key: 'WARRANTY_EXPIRING_7D',
    titleTemplate: 'URGENT: Warranty Expiring in 7 Days: {{customerName}}',
    bodyTemplate:
      'Warranty for {{machineModel}} (Serial: {{serialNumber}}) expires on {{expiryDate}}. Immediate follow-up recommended for comprehensive maintenance extension.',
  },
  WARRANTY_EXPIRED: {
    key: 'WARRANTY_EXPIRED',
    titleTemplate: 'Warranty Expired: {{customerName}}',
    bodyTemplate:
      'The warranty for {{machineModel}} (Serial: {{serialNumber}}) expired on {{expiryDate}}. Transition customer to on-demand general service or post-warranty AMC.',
  },
  SERVICE_DUE_SOON: {
    key: 'SERVICE_DUE_SOON',
    titleTemplate: 'Periodic Service Due: {{customerName}}',
    bodyTemplate:
      'Scheduled maintenance for {{machineModel}} (Serial: {{serialNumber}}) is due on {{dueDate}}. Contact {{customerName}} to book a doorstep technician visit.',
  },
  SERVICE_SCHEDULED: {
    key: 'SERVICE_SCHEDULED',
    titleTemplate: 'Service Visit Scheduled: {{serviceNumber}}',
    bodyTemplate:
      'Service visit {{serviceNumber}} for {{customerName}} is scheduled on {{scheduledDate}} (Slot: {{timeSlot}}).',
  },
  SERVICE_COMPLETED: {
    key: 'SERVICE_COMPLETED',
    titleTemplate: 'Service Completed: {{serviceNumber}}',
    bodyTemplate:
      'Doorstep service {{serviceNumber}} for {{customerName}} has been completed. TDS reading restored to {{outputTds}} ppm.',
  },
  JOB_CARD_ASSIGNED: {
    key: 'JOB_CARD_ASSIGNED',
    titleTemplate: 'New Job Card Assigned: {{jobCardNumber}}',
    bodyTemplate:
      'You have been assigned job card {{jobCardNumber}} for {{customerName}} at {{serviceLocation}}.',
  },
  PAYMENT_DUE: {
    key: 'PAYMENT_DUE',
    titleTemplate: 'Payment Due Today: Invoice #{{invoiceNumber}}',
    bodyTemplate:
      'Invoice #{{invoiceNumber}} for {{customerName}} with total amount ₹{{amount}} is due today.',
  },
  PAYMENT_OVERDUE: {
    key: 'PAYMENT_OVERDUE',
    titleTemplate: 'Payment Overdue: Invoice #{{invoiceNumber}}',
    bodyTemplate:
      'Invoice #{{invoiceNumber}} for {{customerName}} is overdue by {{daysOverdue}} days. Outstanding balance: ₹{{outstandingAmount}}.',
  },
  PAYMENT_RECEIVED: {
    key: 'PAYMENT_RECEIVED',
    titleTemplate: 'Payment Received: ₹{{amount}}',
    bodyTemplate:
      'Payment of ₹{{amount}} received from {{customerName}} for Invoice #{{invoiceNumber}} via {{paymentMethod}} (Ref: {{paymentNumber}}).',
  },
};

/**
 * Sanitize variables to prevent template injection and HTML escaping
 */
export function sanitizeVariable(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Compile template with variables
 */
export function compileTemplate(
  templateKey: string,
  variables: Record<string, any>
): { title: string; body: string } {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    return {
      title: 'CRM Notification',
      body: Object.entries(variables)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', '),
    };
  }

  let title = template.titleTemplate;
  let body = template.bodyTemplate;

  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const safeVal = sanitizeVariable(val);
    title = title.replace(regex, safeVal);
    body = body.replace(regex, safeVal);
  }

  return { title, body };
}
