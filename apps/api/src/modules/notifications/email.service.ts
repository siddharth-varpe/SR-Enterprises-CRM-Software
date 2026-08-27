import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  sales,
  saleItems,
  invoices,
  invoiceItems,
  payments,
  services,
  warranties,
  customers,
  customerAddresses,
  customerAssets,
  technicians,
  emailNotifications,
} from '../../database/schema/index';
import { emailQueueWorker } from './email-queue.worker';
import { phpMailerService, type TransactionalEmailPayload } from './php-mailer.service';

export class EmailService {
  /**
   * Base Send Method - Dispatches through database-backed queue worker with idempotency
   */
  async send(params: {
    customerId?: string | null;
    eventType: TransactionalEmailPayload['eventType'];
    referenceType?: string | null;
    referenceId?: string | null;
    idempotencyKey?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    payload: Record<string, any>;
    attachInvoicePdf?: boolean;
  }) {
    return emailQueueWorker.enqueue({
      customerId: params.customerId,
      eventType: params.eventType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyKey,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      subject: params.subject,
      payload: params.payload,
      attachInvoicePdf: params.attachInvoicePdf,
    });
  }

  /**
   * 1. Sale Confirmation Email
   * Triggered when a sale is confirmed / created as completed
   */
  async sendSaleConfirmation(saleId: string) {
    // 1. Fetch sale record
    const [sale] = await db
      .select({
        id: sales.id,
        saleNumber: sales.saleNumber,
        customerId: sales.customerId,
        saleDate: sales.saleDate,
        status: sales.status,
        subtotal: sales.subtotal,
        discountAmount: sales.discountAmount,
        taxAmount: sales.taxAmount,
        totalAmount: sales.totalAmount,
        notes: sales.notes,
      })
      .from(sales)
      .where(eq(sales.id, saleId));

    if (!sale) return null;

    // 2. Fetch authoritative CURRENT customer record from database (Single Source of Truth)
    let customer: any = null;
    if (sale.customerId) {
      const [c] = await db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          customerNumber: customers.customerNumber,
        })
        .from(customers)
        .where(eq(customers.id, sale.customerId));
      customer = c;
    }

    // Fetch sale items
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    // Fetch linked invoice if present
    const [linkedInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.saleId, saleId));

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';
    const customerPhone = customer?.phone || '';
    const customerNumber = customer?.customerNumber || '';
    const invoiceNumber = linkedInvoice?.invoiceNumber || undefined;

    const payload = {
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalAmount: parseFloat(sale.totalAmount),
      subtotal: parseFloat(sale.subtotal),
      taxAmount: parseFloat(sale.taxAmount),
      discountAmount: parseFloat(sale.discountAmount),
      invoiceNumber,
      customerNumber,
      customerName: recipientName,
      customerEmail: recipientEmail,
      customerPhone,
      items: items.map((i) => ({
        productName: i.productNameSnapshot,
        sku: i.skuSnapshot,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPriceSnapshot),
        lineTotal: parseFloat(i.lineTotal),
      })),
      invoiceData: linkedInvoice
        ? {
            invoiceNumber: linkedInvoice.invoiceNumber,
            invoiceDate: linkedInvoice.invoiceDate,
            dueDate: linkedInvoice.dueDate,
            subtotal: parseFloat(linkedInvoice.subtotal),
            discountAmount: parseFloat(linkedInvoice.discountAmount),
            taxAmount: parseFloat(linkedInvoice.taxAmount),
            totalAmount: parseFloat(linkedInvoice.totalAmount),
            customerName: recipientName,
            customerEmail: recipientEmail,
            customerPhone,
            customerNumber,
            items: items.map((i) => ({
              nameSnapshot: i.productNameSnapshot,
              skuSnapshot: i.skuSnapshot,
              quantity: i.quantity,
              unitPriceSnapshot: parseFloat(i.unitPriceSnapshot),
              taxRatePercent: parseFloat(i.taxRatePercent),
              lineTotal: parseFloat(i.lineTotal),
            })),
          }
        : undefined,
    };

    return this.send({
      customerId: sale.customerId,
      eventType: 'SALE_CONFIRMATION',
      referenceType: 'SALE',
      referenceId: sale.id,
      idempotencyKey: `SALE_CONFIRMATION:${sale.id}`,
      recipientEmail,
      recipientName,
      subject: `Order Confirmation: Sale #${sale.saleNumber}`,
      payload,
      attachInvoicePdf: Boolean(linkedInvoice),
    });
  }

  /**
   * 2. Payment Receipt Email
   * Triggered when a payment is recorded against an invoice
   */
  async sendPaymentReceipt(paymentId: string) {
    // 1. Fetch payment with invoice
    const [pay] = await db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        referenceNumber: payments.referenceNumber,
        notes: payments.notes,
        invoiceId: payments.invoiceId,
        customerId: payments.customerId,
        invoiceCustomerId: invoices.customerId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceTotal: invoices.totalAmount,
        invoiceSubtotal: invoices.subtotal,
        invoiceDiscount: invoices.discountAmount,
        invoiceTax: invoices.taxAmount,
        saleId: invoices.saleId,
        invoiceStatus: invoices.status,
        dueDate: invoices.dueDate,
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(eq(payments.id, paymentId));

    if (!pay) return null;

    const resolvedCustomerId = pay.customerId || pay.invoiceCustomerId;

    // 2. Fetch authoritative CURRENT customer record from database (Single Source of Truth)
    let customer: any = null;
    if (resolvedCustomerId) {
      const [c] = await db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          customerNumber: customers.customerNumber,
        })
        .from(customers)
        .where(eq(customers.id, resolvedCustomerId));
      customer = c;
    }

    // 3. Fetch all completed payments for this invoice to calculate previous and total paid
    const allInvoicePayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        status: payments.status,
      })
      .from(payments)
      .where(
        and(
          eq(payments.invoiceId, pay.invoiceId),
          eq(payments.status, 'COMPLETED')
        )
      );

    const invoiceTotal = parseFloat(pay.invoiceTotal || '0');
    const currentPaymentAmount = parseFloat(pay.amount || '0');

    // Total paid including this payment
    const totalPaidAmount = allInvoicePayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const previousPaidAmount = Math.max(0, totalPaidAmount - currentPaymentAmount);
    const previousOutstanding = Math.max(0, Number((invoiceTotal - previousPaidAmount).toFixed(2)));
    const remainingBalance = Math.max(0, Number((invoiceTotal - totalPaidAmount).toFixed(2)));
    const paymentStatus = remainingBalance <= 0.01 ? 'PAID' : 'PARTIALLY PAID';

    // 4. Fetch customer default address if available
    let customerAddress = 'Doorstep Service Address';
    if (resolvedCustomerId) {
      try {
        const [addr] = await db
          .select()
          .from(customerAddresses)
          .where(eq(customerAddresses.customerId, resolvedCustomerId));
        if (addr) {
          customerAddress = [addr.addressLine1, addr.addressLine2, addr.landmark, addr.city, addr.state, addr.postalCode]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // use default address
      }
    }

    // 5. Fetch invoice line items for PDF generation
    let itemsForPdf: any[] = [];
    try {
      const invItems = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, pay.invoiceId));

      if (invItems.length > 0) {
        itemsForPdf = invItems.map((i) => ({
          nameSnapshot: i.nameSnapshot,
          productName: i.nameSnapshot,
          descriptionSnapshot: i.descriptionSnapshot,
          quantity: i.quantity,
          unit: 'PCS',
          unitPriceSnapshot: parseFloat(i.unitPriceSnapshot || '0'),
          unitPrice: parseFloat(i.unitPriceSnapshot || '0'),
          taxRatePercent: parseFloat(i.taxRatePercent || '0'),
          lineTotal: parseFloat(i.lineTotal || '0'),
        }));
      } else if (pay.saleId) {
        const sItems = await db
          .select()
          .from(saleItems)
          .where(eq(saleItems.saleId, pay.saleId));

        if (sItems.length > 0) {
          itemsForPdf = sItems.map((i) => ({
            nameSnapshot: i.productNameSnapshot,
            productName: i.productNameSnapshot,
            descriptionSnapshot: i.skuSnapshot,
            quantity: i.quantity,
            unit: 'PCS',
            unitPriceSnapshot: parseFloat(i.unitPriceSnapshot || '0'),
            unitPrice: parseFloat(i.unitPriceSnapshot || '0'),
            taxRatePercent: parseFloat(i.taxRatePercent || '0'),
            lineTotal: parseFloat(i.lineTotal || '0'),
          }));
        }
      }
    } catch {
      // fallback handled below
    }

    if (itemsForPdf.length === 0) {
      itemsForPdf = [
        {
          nameSnapshot: `Water Purifier & RO System Equipment (Invoice #${pay.invoiceNumber})`,
          productName: `Water Purifier & RO System Equipment (Invoice #${pay.invoiceNumber})`,
          descriptionSnapshot: 'Commercial / Residential RO Purification Spares & Services',
          quantity: 1,
          unit: 'PCS',
          unitPriceSnapshot: invoiceTotal,
          unitPrice: invoiceTotal,
          taxRatePercent: 0,
          lineTotal: invoiceTotal,
        },
      ];
    }

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';
    const customerPhone = customer?.phone || '';
    const customerNumber = customer?.customerNumber || '';
    const formattedPaymentDate = pay.paymentDate
      ? new Date(pay.paymentDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const payload = {
      customerName: recipientName,
      customerEmail: recipientEmail,
      customerPhone,
      customerNumber,
      customerAddress,
      paymentNumber: pay.paymentNumber,
      invoiceNumber: pay.invoiceNumber,
      paymentDate: formattedPaymentDate,
      dueDate: pay.dueDate ? new Date(pay.dueDate).toISOString().split('T')[0] : null,
      nextDueDate: pay.dueDate ? new Date(pay.dueDate).toISOString().split('T')[0] : null,
      amount: currentPaymentAmount,
      previousPaidAmount,
      previousOutstanding,
      totalPaidAmount,
      totalAmount: invoiceTotal,
      remainingBalance,
      paymentStatus,
      paymentMethod: pay.paymentMethod,
      referenceNumber: pay.referenceNumber,
      attachInvoicePdf: true,
      invoiceData: {
        invoiceNumber: pay.invoiceNumber,
        invoiceDate: formattedPaymentDate,
        dueDate: pay.dueDate ? new Date(pay.dueDate).toISOString().split('T')[0] : null,
        nextDueDate: pay.dueDate ? new Date(pay.dueDate).toISOString().split('T')[0] : null,
        subtotal: parseFloat(pay.invoiceSubtotal || '0') || (invoiceTotal - parseFloat(pay.invoiceTax || '0')),
        discountAmount: parseFloat(pay.invoiceDiscount || '0'),
        taxAmount: parseFloat(pay.invoiceTax || '0'),
        totalAmount: invoiceTotal,
        paidAmount: totalPaidAmount,
        outstandingAmount: remainingBalance,
        previousPaidAmount,
        previousOutstanding,
        status: paymentStatus,
        customerName: recipientName,
        customerEmail: recipientEmail,
        customerPhone,
        customerNumber,
        customerAddress,
        items: itemsForPdf,
      },
    };

    return this.send({
      customerId: resolvedCustomerId,
      eventType: 'PAYMENT_RECEIPT',
      referenceType: 'PAYMENT',
      referenceId: pay.id,
      idempotencyKey: `PAYMENT_RECEIPT:${pay.id}`,
      recipientEmail,
      recipientName,
      subject: `Payment Receipt & Invoice — ${pay.invoiceNumber} — SR Enterprises`,
      payload,
      attachInvoicePdf: true,
    });
  }

  /**
   * 3. Service Completed Email
   */
  async sendServiceCompleted(serviceId: string) {
    const [srv] = await db
      .select({
        id: services.id,
        serviceNumber: services.serviceNumber,
        serviceType: services.serviceType,
        scheduledDate: services.scheduledDate,
        completedAt: services.completedAt,
        customerNotes: services.customerNotes,
        internalNotes: services.internalNotes,
        customerId: services.customerId,
        technicianName: technicians.fullName,
      })
      .from(services)
      .leftJoin(technicians, eq(services.technicianId, technicians.id))
      .where(eq(services.id, serviceId));

    if (!srv) return null;

    // Fetch authoritative CURRENT customer record from database
    let customer: any = null;
    if (srv.customerId) {
      const [c] = await db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          customerNumber: customers.customerNumber,
        })
        .from(customers)
        .where(eq(customers.id, srv.customerId));
      customer = c;
    }

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';

    const payload = {
      serviceNumber: srv.serviceNumber,
      serviceType: srv.serviceType,
      serviceDate: srv.scheduledDate ? new Date(srv.scheduledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      completedDate: srv.completedAt ? new Date(srv.completedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      technicianName: srv.technicianName || 'Certified Technician',
      serviceDescription: srv.internalNotes || srv.customerNotes || 'Complete RO system health check & TDS calibration.',
      customerName: recipientName,
      customerEmail: recipientEmail,
    };

    return this.send({
      customerId: srv.customerId,
      eventType: 'SERVICE_COMPLETED',
      referenceType: 'SERVICE',
      referenceId: srv.id,
      idempotencyKey: `SERVICE_COMPLETED:${srv.id}`,
      recipientEmail,
      recipientName,
      subject: `Service Completed: #${srv.serviceNumber}`,
      payload,
    });
  }

  /**
   * 4. Service Reminder Email
   */
  async sendServiceReminder(serviceId: string) {
    const [srv] = await db
      .select({
        id: services.id,
        serviceNumber: services.serviceNumber,
        serviceType: services.serviceType,
        scheduledDate: services.scheduledDate,
        scheduledTimeSlot: services.scheduledTimeSlot,
        customerId: services.customerId,
        technicianName: technicians.fullName,
      })
      .from(services)
      .leftJoin(technicians, eq(services.technicianId, technicians.id))
      .where(eq(services.id, serviceId));

    if (!srv) return null;

    // Fetch authoritative CURRENT customer record from database
    let customer: any = null;
    if (srv.customerId) {
      const [c] = await db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          customerNumber: customers.customerNumber,
        })
        .from(customers)
        .where(eq(customers.id, srv.customerId));
      customer = c;
    }

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';
    const dateStr = srv.scheduledDate ? new Date(srv.scheduledDate).toISOString().split('T')[0] : '';

    const payload = {
      serviceNumber: srv.serviceNumber,
      serviceType: srv.serviceType,
      scheduledDate: dateStr,
      timeSlot: srv.scheduledTimeSlot || 'Morning (10:00 AM - 01:00 PM)',
      technicianName: srv.technicianName,
      customerName: recipientName,
      customerEmail: recipientEmail,
    };

    return this.send({
      customerId: srv.customerId,
      eventType: 'SERVICE_REMINDER',
      referenceType: 'SERVICE',
      referenceId: srv.id,
      idempotencyKey: `SERVICE_REMINDER:${srv.id}:${dateStr}`,
      recipientEmail,
      recipientName,
      subject: `Service Reminder: Scheduled for ${dateStr}`,
      payload,
    });
  }

  /**
   * 5. Payment Pending Reminder Email
   */
  async sendPaymentPendingReminder(invoiceId: string) {
    const [inv] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        customerId: invoices.customerId,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId));

    if (!inv || inv.status === 'CANCELLED' || inv.status === 'DRAFT') {
      return null;
    }

    // Fetch authoritative CURRENT customer record from database
    let customer: any = null;
    if (inv.customerId) {
      const [c] = await db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          customerNumber: customers.customerNumber,
        })
        .from(customers)
        .where(eq(customers.id, inv.customerId));
      customer = c;
    }

    // Calculate real outstanding balance from database payments
    const paymentsList = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.invoiceId, invoiceId),
          eq(payments.status, 'COMPLETED')
        )
      );

    const totalAmount = parseFloat(inv.totalAmount || '0');
    const paidAmount = paymentsList.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const outstandingAmount = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));

    // Do not send reminder if invoice is already settled
    if (outstandingAmount <= 0.01) {
      return null;
    }

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';
    const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '';
    const todayStr = new Date().toISOString().split('T')[0];

    const payload = {
      invoiceNumber: inv.invoiceNumber,
      totalAmount,
      paidAmount,
      dueAmount: outstandingAmount,
      dueDate: dueDateStr,
      customerNumber: customer?.customerNumber || '',
      customerName: recipientName,
      customerEmail: recipientEmail,
    };

    return this.send({
      customerId: inv.customerId,
      eventType: 'PAYMENT_REMINDER',
      referenceType: 'INVOICE',
      referenceId: inv.id,
      idempotencyKey: `PAYMENT_REMINDER:${inv.id}:${todayStr}`,
      recipientEmail,
      recipientName,
      subject: `Payment Reminder: Invoice #${inv.invoiceNumber}`,
      payload,
    });
  }

  /**
   * 6. Thank You / Follow-up Email
   */
  async sendThankYou(referenceType: 'SALE' | 'SERVICE', referenceId: string) {
    let targetCustomerId: string | null = null;
    let referenceText = '';

    if (referenceType === 'SALE') {
      const [s] = await db
        .select({ customerId: sales.customerId, saleNumber: sales.saleNumber })
        .from(sales)
        .where(eq(sales.id, referenceId));
      if (s) {
        targetCustomerId = s.customerId;
        referenceText = `Your recent purchase (Order #${s.saleNumber})`;
      }
    } else {
      const [srv] = await db
        .select({ customerId: services.customerId, serviceNumber: services.serviceNumber })
        .from(services)
        .where(eq(services.id, referenceId));
      if (srv) {
        targetCustomerId = srv.customerId;
        referenceText = `Your recent service visit (#${srv.serviceNumber})`;
      }
    }

    if (!targetCustomerId) return null;

    // Fetch authoritative CURRENT customer record from database
    const [customer] = await db
      .select({
        id: customers.id,
        fullName: customers.fullName,
        email: customers.email,
      })
      .from(customers)
      .where(eq(customers.id, targetCustomerId));

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';

    if (!recipientEmail || !recipientEmail.includes('@')) return null;

    return this.send({
      customerId: targetCustomerId,
      eventType: 'THANK_YOU',
      referenceType,
      referenceId,
      idempotencyKey: `THANK_YOU:${referenceType}:${referenceId}`,
      recipientEmail,
      recipientName,
      subject: `Thank You for Choosing SR Enterprises!`,
      payload: { referenceText, customerName: recipientName, customerEmail: recipientEmail },
    });
  }

  /**
   * 7. Warranty Expiry Reminder Email
   */
  async sendWarrantyExpiryReminder(warrantyId: string, daysRemaining = 30) {
    const [war] = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        startDate: warranties.startDate,
        endDate: warranties.endDate,
        status: warranties.status,
        customerId: warranties.customerId,
        assetName: customerAssets.customName,
        serialNumber: customerAssets.serialNumber,
      })
      .from(warranties)
      .leftJoin(customerAssets, eq(warranties.assetId, customerAssets.id))
      .where(eq(warranties.id, warrantyId));

    if (!war || war.status === 'EXPIRED' || war.status === 'VOID') {
      return null;
    }

    // Fetch authoritative CURRENT customer record from database
    let customer: any = null;
    if (war.customerId) {
      const [c] = await db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          customerNumber: customers.customerNumber,
        })
        .from(customers)
        .where(eq(customers.id, war.customerId));
      customer = c;
    }

    const recipientEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const recipientName = customer?.fullName || 'Valued Customer';
    const expiryDateStr = war.endDate ? new Date(war.endDate).toISOString().split('T')[0] : '';

    const payload = {
      warrantyNumber: war.warrantyNumber,
      machineModel: war.assetName || 'Aquapure RO Water Purifier',
      serialNumber: war.serialNumber,
      startDate: war.startDate ? new Date(war.startDate).toISOString().split('T')[0] : '',
      endDate: expiryDateStr,
      daysRemaining,
      customerName: recipientName,
      customerEmail: recipientEmail,
    };

    return this.send({
      customerId: war.customerId,
      eventType: 'WARRANTY_EXPIRY_REMINDER',
      referenceType: 'WARRANTY',
      referenceId: war.id,
      idempotencyKey: `WARRANTY_EXPIRY_${daysRemaining}D:${war.id}`,
      recipientEmail,
      recipientName,
      subject: `Warranty Expiry Notice: ${daysRemaining} Days Remaining for ${war.assetName || 'RO Purifier'}`,
      payload,
    });
  }

  /**
   * 8. Admin Test Email
   */
  async sendAdminTestEmail(targetEmail: string) {
    return phpMailerService.dispatch({
      eventType: 'ADMIN_TEST',
      toEmail: targetEmail,
      toName: 'CRM Administrator',
      subject: '🧪 PHPMailer Diagnostic Test - SR Enterprises CRM',
    });
  }

  /**
   * List email notifications history for audit
   */
  async listEmailHistory(filter: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];
      if (filter.status && filter.status !== 'ALL') {
        conditions.push(eq(emailNotifications.status, filter.status as any));
      }
      if (filter.search?.trim()) {
        const term = `%${filter.search.trim()}%`;
        conditions.push(
          or(
            ilike(emailNotifications.recipientEmail, term),
            ilike(emailNotifications.recipientName, term),
            ilike(emailNotifications.subject, term)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailNotifications)
        .where(whereClause);

      const rows = await db
        .select()
        .from(emailNotifications)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(emailNotifications.createdAt));

      return {
        data: rows,
        pagination: {
          total: totalRes?.count ?? 0,
          page,
          limit,
          totalPages: Math.ceil((totalRes?.count ?? 0) / limit),
        },
      };
    } catch {
      return {
        data: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 },
      };
    }
  }
}

export const emailService = new EmailService();
