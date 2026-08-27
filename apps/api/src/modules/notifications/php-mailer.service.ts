import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TransactionalEmailPayload {
  eventType:
    | 'SALE_CONFIRMATION'
    | 'PAYMENT_RECEIPT'
    | 'SERVICE_COMPLETED'
    | 'SERVICE_REMINDER'
    | 'PAYMENT_REMINDER'
    | 'THANK_YOU'
    | 'WARRANTY_EXPIRY_REMINDER'
    | 'INVOICE_EMAIL'
    | 'ADMIN_TEST'
    | 'GENERAL';
  toEmail: string;
  toName?: string;
  subject?: string;
  customerId?: string;
  referenceType?: string;
  referenceId?: string;
  attachInvoicePdf?: boolean;
  invoiceData?: Record<string, any>;
  attachmentPath?: string;
  attachmentName?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface PhpMailerResult {
  success: boolean;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'PENDING';
  message?: string;
  messageId?: string;
  recipient?: string;
  subject?: string;
  eventType?: string;
  pdfAttached?: boolean;
  reason?: string;
  error?: string;
  timestamp?: string;
}

export class PhpMailerService {
  private scriptPath: string;

  constructor() {
    // Resolve path to scripts/mailer/dispatch_email.php from workspace root
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const possiblePaths = [
      path.join(projectRoot, 'scripts/mailer/dispatch_email.php'),
      path.resolve(process.cwd(), 'scripts/mailer/dispatch_email.php'),
      path.resolve(__dirname, '../../../../../scripts/mailer/dispatch_email.php'),
    ];

    this.scriptPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0]!;
  }

  /**
   * Execute transactional email dispatch via PHP CLI and PHPMailer engine
   */
  public async dispatch(payload: TransactionalEmailPayload): Promise<PhpMailerResult> {
    return new Promise((resolve) => {
      // Validate email before spawning process
      if (!payload.toEmail || !payload.toEmail.includes('@')) {
        return resolve({
          success: false,
          status: 'SKIPPED',
          reason: 'EMAIL_SKIPPED_NO_VALID_ADDRESS',
          error: `Invalid or empty recipient email: '${payload.toEmail || ''}'`,
          recipient: payload.toEmail,
          eventType: payload.eventType,
        });
      }

      const base64Data = Buffer.from(JSON.stringify(payload)).toString('base64');
      const args = [this.scriptPath, `--base64=${base64Data}`];

      execFile('php', args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const rawOutput = (stdout || '').trim();

        if (error) {
          try {
            const parsed = JSON.parse(rawOutput);
            return resolve(parsed);
          } catch {
            return resolve({
              success: false,
              status: 'FAILED',
              error: `PHP execution error: ${error.message}${stderr ? ` - ${stderr.trim()}` : ''}`,
              recipient: payload.toEmail,
              eventType: payload.eventType,
            });
          }
        }

        try {
          const parsed = JSON.parse(rawOutput);
          return resolve(parsed);
        } catch {
          return resolve({
            success: true,
            status: 'SENT',
            message: 'Email processed via PHPMailer',
            recipient: payload.toEmail,
            eventType: payload.eventType,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  }

  /**
   * Backward-compatible payment due email helper
   */
  public async sendPaymentDueEmail(payload: {
    toEmail: string;
    toName: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount?: number;
    dueAmount: number;
    dueDate: string;
    customerNumber?: string;
    notes?: string;
  }): Promise<PhpMailerResult> {
    return this.dispatch({
      eventType: 'PAYMENT_REMINDER',
      toEmail: payload.toEmail,
      toName: payload.toName,
      invoiceNumber: payload.invoiceNumber,
      totalAmount: payload.totalAmount,
      paidAmount: payload.paidAmount || 0,
      dueAmount: payload.dueAmount,
      dueDate: payload.dueDate,
      customerNumber: payload.customerNumber || '',
      notes: payload.notes || '',
    });
  }
}

export const phpMailerService = new PhpMailerService();
