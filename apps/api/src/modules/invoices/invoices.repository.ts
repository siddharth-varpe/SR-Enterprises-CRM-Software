import { eq, and, or, ilike, sql, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  invoices,
  invoiceItems,
  customers,
  customerAddresses,
  sales,
  saleItems,
  products,
  payments,
  customerActivities,
  auditLogs,
  users,
} from '../../database/schema/index';
import { withTransaction } from '../../database/transactions';
import { generateBusinessNumber } from '../../database/sequences';
import { calculateInvoiceTotals } from './invoices.calculator';
import { customerRepository } from '../customers/customer.repository';
import { productRepository } from '../products/product.repository';
import { randomUUID } from 'crypto';
import type {
  CreateInvoiceInput,
  CreateInvoiceFromSaleInput,
  UpdateInvoiceInput,
  InvoiceQueryFilter,
} from '@crm/validation';

// Resilient memory store for offline desktop and local development
export const memoryInvoices: any[] = [
  {
    id: 'inv-1111111-1111-1111-1111-111111111111',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    customerName: 'Rajesh Sharma',
    customerNumber: 'CUST-2026-0001',
    customerPhone: '9820098200',
    customerEmail: 'rajesh.sharma@example.com',
    customerGst: null,
    customerType: 'INDIVIDUAL',
    saleId: 's1111111-1111-1111-1111-111111111111',
    invoiceDate: new Date('2026-01-15T10:00:00Z'),
    dueDate: new Date('2026-01-30T10:00:00Z'),
    subtotal: '25000.00',
    discountAmount: '0.00',
    taxAmount: '4500.00',
    totalAmount: '29500.00',
    status: 'ISSUED',
    notes: 'Standard residential RO installation invoice',
    termsAndConditions: 'Payment due within 15 days of invoice date. 1 year standard warranty on RO machines.',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    cancelledAt: null,
    cancelReason: null,
    paidAmount: '0.00',
    outstandingAmount: '29500.00',
  },
];

export const memoryInvoiceItems: any[] = [
  {
    id: 'ii-1111111-1111-1111-1111-111111111111',
    invoiceId: 'inv-1111111-1111-1111-1111-111111111111',
    productId: 'p1111111-1111-1111-1111-111111111111',
    itemType: 'PRODUCT',
    nameSnapshot: 'Aquapure RO 100 GPD Commercial',
    descriptionSnapshot: 'SKU: RO-100-GPD',
    quantity: 1,
    unitPriceSnapshot: '25000.00',
    discountAmount: '0.00',
    taxRatePercent: '18.00',
    taxAmount: '4500.00',
    lineTotal: '29500.00',
    createdAt: new Date('2026-01-15T10:00:00Z'),
  },
];

export class InvoicesRepository {
  /**
   * Find paginated invoices with search, status filters, customer join, and payment reconciliation
   */
  async findPaginated(filters: InvoiceQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      if (filters.status && (filters.status as string) !== 'ALL') {
        conditions.push(eq(invoices.status, filters.status as any));
      }

      if (filters.customerId) {
        conditions.push(eq(invoices.customerId, filters.customerId));
      }

      if (filters.saleId) {
        conditions.push(eq(invoices.saleId, filters.saleId));
      }

      if (filters.startDate) {
        conditions.push(sql`${invoices.invoiceDate} >= ${new Date(filters.startDate)}`);
      }

      if (filters.endDate) {
        conditions.push(sql`${invoices.invoiceDate} <= ${new Date(filters.endDate)}`);
      }

      if (filters.overdueOnly) {
        conditions.push(
          and(
            sql`${invoices.dueDate} < NOW()`,
            or(
              eq(invoices.status, 'ISSUED'),
              eq(invoices.status, 'PARTIALLY_PAID'),
              eq(invoices.status, 'OVERDUE')
            )
          )
        );
      }

      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(invoices.invoiceNumber, term),
            ilike(customers.fullName, term),
            ilike(customers.phone, term),
            ilike(customers.customerNumber, term),
            ilike(customers.companyName, term),
            ilike(invoices.notes, term),
            sql`${invoices.totalAmount}::text LIKE ${term}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRes] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(whereClause);

      const total = totalRes?.count ?? 0;

      let orderByClauses: any[];
      const sortOrder = filters.sortOrder === 'asc' ? asc : desc;
      switch (filters.sortBy) {
        case 'totalAmount':
          orderByClauses = [sortOrder(invoices.totalAmount), desc(invoices.createdAt)];
          break;
        case 'dueDate':
          orderByClauses = [sortOrder(invoices.dueDate), desc(invoices.createdAt)];
          break;
        case 'invoiceNumber':
          orderByClauses = [sortOrder(invoices.invoiceNumber), desc(invoices.createdAt)];
          break;
        case 'invoiceDate':
        default:
          orderByClauses = [sortOrder(invoices.createdAt), sortOrder(invoices.invoiceDate)];
          break;
      }

      const rows = await database
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          customerName: customers.fullName,
          customerNumber: customers.customerNumber,
          customerPhone: customers.phone,
          customerEmail: customers.email,
          saleId: invoices.saleId,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          subtotal: invoices.subtotal,
          discountAmount: invoices.discountAmount,
          taxAmount: invoices.taxAmount,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          cancelledAt: invoices.cancelledAt,
          cancelReason: invoices.cancelReason,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(...orderByClauses);

      // Fetch payments for these invoices to calculate real collected and outstanding
      const invoiceIds = rows.map((r) => r.id);
      const paymentRecords =
        invoiceIds.length > 0
          ? await database
              .select({
                invoiceId: payments.invoiceId,
                amount: payments.amount,
              })
              .from(payments)
              .where(
                and(
                  inArray(payments.invoiceId, invoiceIds),
                  eq(payments.status, 'COMPLETED')
                )
              )
          : [];

      const paidMap = new Map<string, number>();
      for (const p of paymentRecords) {
        if (!p.invoiceId) continue;
        const current = paidMap.get(p.invoiceId) || 0;
        paidMap.set(p.invoiceId, current + parseFloat(p.amount));
      }

      const enriched = rows.map((row) => {
        const paid = paidMap.get(row.id) || 0;
        const totalAmount = parseFloat(row.totalAmount);
        const outstanding = Math.max(0, totalAmount - paid);

        let dynamicStatus = row.status;
        if (row.status !== 'CANCELLED' && row.status !== 'DRAFT') {
          if (paid <= 0) {
            dynamicStatus = 'ISSUED';
          } else if (paid > 0 && paid < totalAmount) {
            dynamicStatus = 'PARTIALLY_PAID';
          } else if (paid >= totalAmount) {
            dynamicStatus = 'PAID';
          }
        }

        return {
          ...row,
          status: dynamicStatus,
          paidAmount: paid.toFixed(2),
          outstandingAmount: outstanding.toFixed(2),
        };
      });

      return {
        data: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch {
      let filtered = [...memoryInvoices];
      if (filters.status && (filters.status as string) !== 'ALL') {
        filtered = filtered.filter((i) => i.status === filters.status);
      }
      if (filters.customerId) {
        filtered = filtered.filter((i) => i.customerId === filters.customerId);
      }
      if (filters.saleId) {
        filtered = filtered.filter((i) => i.saleId === filters.saleId);
      }
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.invoiceNumber?.toLowerCase().includes(q) ||
            i.customerName?.toLowerCase().includes(q) ||
            i.customerPhone?.toLowerCase().includes(q) ||
            i.customerNumber?.toLowerCase().includes(q) ||
            i.notes?.toLowerCase().includes(q) ||
            i.totalAmount?.toString().includes(q)
        );
      }

      const total = filtered.length;
      return {
        data: filtered.slice(offset, offset + limit),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  /**
   * Find single invoice by ID with items, customer snapshots, addresses, and payment logs
   */
  async findById(id: string, database = db) {
    try {
      let [invoice] = await database
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          customerName: customers.fullName,
          customerNumber: customers.customerNumber,
          customerPhone: customers.phone,
          customerEmail: customers.email,
          customerGst: customers.gstNumber,
          customerType: customers.customerType,
          saleId: invoices.saleId,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          subtotal: invoices.subtotal,
          discountAmount: invoices.discountAmount,
          taxAmount: invoices.taxAmount,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
          notes: invoices.notes,
          termsAndConditions: invoices.termsAndConditions,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          cancelledAt: invoices.cancelledAt,
          cancelReason: invoices.cancelReason,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(eq(invoices.id, id));

      if (!invoice && typeof id === 'string' && id.startsWith('INV-')) {
        const [byNumber] = await database
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            customerId: invoices.customerId,
            customerName: customers.fullName,
            customerNumber: customers.customerNumber,
            customerPhone: customers.phone,
            customerEmail: customers.email,
            customerGst: customers.gstNumber,
            customerType: customers.customerType,
            saleId: invoices.saleId,
            invoiceDate: invoices.invoiceDate,
            dueDate: invoices.dueDate,
            subtotal: invoices.subtotal,
            discountAmount: invoices.discountAmount,
            taxAmount: invoices.taxAmount,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            notes: invoices.notes,
            termsAndConditions: invoices.termsAndConditions,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
            cancelledAt: invoices.cancelledAt,
            cancelReason: invoices.cancelReason,
          })
          .from(invoices)
          .leftJoin(customers, eq(invoices.customerId, customers.id))
          .where(eq(invoices.invoiceNumber, id));
        if (byNumber) invoice = byNumber;
      }

      if (!invoice) {
        return null;
      }

      // Fetch invoice line items
      const items = await database
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));

      // Fetch customer addresses
      const addresses = await database
        .select()
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, invoice.customerId));

      // Fetch payments
      const paymentsList = await database
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id))
        .orderBy(desc(payments.paymentDate));

      const totalPaid = paymentsList
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const outstandingAmount = Math.max(0, parseFloat(invoice.totalAmount) - totalPaid);

      let dynamicStatus = invoice.status;
      if (invoice.status !== 'CANCELLED' && invoice.status !== 'DRAFT') {
        if (totalPaid <= 0) {
          dynamicStatus = 'ISSUED';
        } else if (totalPaid > 0 && totalPaid < parseFloat(invoice.totalAmount)) {
          dynamicStatus = 'PARTIALLY_PAID';
        } else if (totalPaid >= parseFloat(invoice.totalAmount)) {
          dynamicStatus = 'PAID';
        }
      }

      // Fetch linked sale
      const [sale] = invoice.saleId
        ? await database.select().from(sales).where(eq(sales.id, invoice.saleId))
        : [null];

      return {
        ...invoice,
        status: dynamicStatus,
        items,
        addresses,
        payments: paymentsList,
        paidAmount: totalPaid.toFixed(2),
        outstandingAmount: outstandingAmount.toFixed(2),
        sale: sale ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Helper to verify actor ID exists in database to prevent foreign key violation
   */
  private async resolveActorUserId(tx: any, actorId?: string): Promise<string | null> {
    if (!actorId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)) {
      return null;
    }
    try {
      const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.id, actorId)).limit(1);
      if (u) return u.id;
      const [firstUser] = await tx.select({ id: users.id }).from(users).limit(1);
      return firstUser?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Create direct Invoice (DRAFT or ISSUED) with authoritative line calculations
   */
  async createInvoice(data: CreateInvoiceInput, actorId?: string, actorName = 'System') {
    return await withTransaction(async (tx) => {
      const validActorId = await this.resolveActorUserId(tx, actorId);
      // 1. Verify customer exists
      const [customer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, data.customerId));

      if (!customer) {
        const err: any = new Error(`Customer with ID ${data.customerId} does not exist`);
        err.statusCode = 404;
        throw err;
      }

      // 2. Authoritative line calculations
      const calcResult = calculateInvoiceTotals(
        data.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount || 0,
          taxRatePercent: item.taxRatePercent ?? 18,
        })),
        data.discountAmount || 0
      );

      // 3. Generate sequential business invoice number
      const { sequenceNumber: invoiceNumber } = await generateBusinessNumber(tx, 'INVOICE', 'INV');

      const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
      const dueDate = data.dueDate
        ? new Date(data.dueDate)
        : new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000);

      const status = data.status || 'ISSUED';

      // 4. Insert Invoice Header
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: customer.id,
          saleId: data.saleId || null,
          invoiceDate,
          dueDate,
          subtotal: calcResult.subtotal,
          discountAmount: calcResult.discountAmount,
          taxAmount: calcResult.taxAmount,
          totalAmount: calcResult.totalAmount,
          status,
          notes: data.notes ? data.notes.trim() : null,
          termsAndConditions:
            data.termsAndConditions ||
            data.terms ||
            'Payment due within 15 days of invoice date. 1 year standard warranty on RO machines.',
          createdBy: validActorId,
        })
        .returning();

      // 5. Insert Immutable Invoice Items
      const itemRows = data.items.map((item, idx) => {
        const calc = calcResult.lines[idx]!;
        return {
          invoiceId: invoice.id,
          productId: item.productId || null,
          itemType: item.itemType || 'PRODUCT',
          nameSnapshot: item.name || item.description,
          descriptionSnapshot: item.description,
          quantity: item.quantity,
          unitPriceSnapshot: calc.unitPrice,
          discountAmount: calc.discountAmount,
          taxRatePercent: calc.taxRatePercent,
          taxAmount: calc.taxAmount,
          lineTotal: calc.lineTotal,
        };
      });

      await tx.insert(invoiceItems).values(itemRows);

      // 6. Record Customer Activity
      try {
        await tx.insert(customerActivities).values({
          customerId: customer.id,
          actorId: validActorId,
          actorName,
          eventType: 'INVOICE_GENERATED',
          entityType: 'INVOICE',
          entityId: invoice.id,
          description: `Invoice ${invoice.invoiceNumber} for ₹${invoice.totalAmount} was generated.`,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            status: invoice.status,
          },
        });
      } catch {}

      // 7. Audit Log
      try {
        await tx.insert(auditLogs).values({
          actorId: validActorId,
          actorUsername: actorName,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: invoice.id,
          afterState: {
            invoiceNumber: invoice.invoiceNumber,
            customerId: customer.id,
            totalAmount: invoice.totalAmount,
            status: invoice.status,
          },
        });
      } catch {}

      return this.findById(invoice.id, tx);
    });
  }

  /**
   * Create authoritative Invoice from existing Sale (with duplicate prevention)
   */
  async createFromSale(saleId: string, options: CreateInvoiceFromSaleInput = {}, actorId?: string, actorName = 'System') {
    return await withTransaction(async (tx) => {
      const validActorId = await this.resolveActorUserId(tx, actorId);
      // 1. Verify sale exists
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, saleId));

      if (!sale) {
        const err: any = new Error(`Sale with ID ${saleId} not found`);
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // 2. Duplicate invoice prevention: Check if active invoice already exists for this sale
      const [existingInvoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.saleId, saleId), sql`${invoices.status} != 'CANCELLED'`));

      if (existingInvoice) {
        const err: any = new Error(
          `An active invoice (${existingInvoice.invoiceNumber}) already exists for Sale ${sale.saleNumber}`
        );
        err.statusCode = 409;
        err.code = 'INVOICE_ALREADY_EXISTS';
        err.details = { existingInvoiceId: existingInvoice.id, invoiceNumber: existingInvoice.invoiceNumber };
        throw err;
      }

      // 3. Fetch sale items to create snapshot invoice items
      const sItems = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleId));

      if (sItems.length === 0) {
        const err: any = new Error('Cannot create an invoice for a sale without line items');
        err.statusCode = 400;
        err.code = 'EMPTY_SALE_ITEMS';
        throw err;
      }

      // 4. Generate sequential business invoice number
      const { sequenceNumber: invoiceNumber } = await generateBusinessNumber(tx, 'INVOICE', 'INV');
      const invoiceDate = sale.saleDate || new Date();
      const dueDate = options.dueDate
        ? new Date(options.dueDate)
        : new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000);

      // 5. Insert Invoice Header
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: sale.customerId,
          saleId: sale.id,
          invoiceDate,
          dueDate,
          subtotal: sale.subtotal,
          discountAmount: sale.discountAmount,
          taxAmount: sale.taxAmount,
          totalAmount: sale.totalAmount,
          status: 'ISSUED',
          notes: options.notes || sale.notes,
          termsAndConditions:
            options.termsAndConditions ||
            'Payment due within 15 days of invoice date. 1 year standard warranty on RO machines.',
          createdBy: validActorId,
        })
        .returning();

      // 6. Insert Invoice Items Snapshots
      const invItems = sItems.map((si) => ({
        invoiceId: invoice.id,
        productId: si.productId,
        itemType: 'PRODUCT' as const,
        nameSnapshot: si.productNameSnapshot,
        descriptionSnapshot: `SKU: ${si.skuSnapshot}`,
        quantity: si.quantity,
        unitPriceSnapshot: si.unitPriceSnapshot,
        discountAmount: si.discountAmount,
        taxRatePercent: si.taxRatePercent,
        taxAmount: si.taxAmount,
        lineTotal: si.lineTotal,
      }));

      await tx.insert(invoiceItems).values(invItems);

      // 7. Record Customer Activity
      try {
        await tx.insert(customerActivities).values({
          customerId: sale.customerId,
          actorId: validActorId,
          actorName,
          eventType: 'INVOICE_GENERATED',
          entityType: 'INVOICE',
          entityId: invoice.id,
          description: `Invoice ${invoiceNumber} for ₹${invoice.totalAmount} generated from Sale ${sale.saleNumber}.`,
          metadata: {
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            invoiceId: invoice.id,
            invoiceNumber,
            totalAmount: invoice.totalAmount,
          },
        });
      } catch {}

      // 8. Audit Log
      try {
        await tx.insert(auditLogs).values({
          actorId: validActorId,
          actorUsername: actorName,
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: invoice.id,
          afterState: {
            saleId: sale.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
          },
        });
      } catch {}

      return this.findById(invoice.id, tx);
    });
  }

  /**
   * Update Draft Invoice (Immutability rule: Only DRAFT invoices can be edited)
   */
  async updateDraft(id: string, data: UpdateInvoiceInput, actorId?: string, actorName = 'System') {
    return await withTransaction(async (tx) => {
      const validActorId = await this.resolveActorUserId(tx, actorId);
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, id));

      if (!invoice) {
        const err: any = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      if (invoice.status !== 'DRAFT') {
        const err: any = new Error(
          `Only DRAFT invoices can be edited. Current status is ${invoice.status}`
        );
        err.statusCode = 400;
        err.code = 'IMMUTABLE_INVOICE';
        throw err;
      }

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (data.notes !== undefined) updateValues.notes = data.notes;
      if (data.termsAndConditions !== undefined) updateValues.termsAndConditions = data.termsAndConditions;
      if (data.dueDate) updateValues.dueDate = new Date(data.dueDate);

      await tx.update(invoices).set(updateValues).where(eq(invoices.id, id));

      // Audit Log
      try {
        await tx.insert(auditLogs).values({
          actorId: validActorId,
          actorUsername: actorName,
          action: 'UPDATE',
          entityType: 'INVOICE',
          entityId: invoice.id,
          afterState: updateValues,
        });
      } catch {}

      return this.findById(id, tx);
    });
  }

  /**
   * Finalize Invoice (DRAFT -> ISSUED)
   */
  async finalize(id: string, notes?: string | null, actorId?: string, actorName = 'System') {
    return await withTransaction(async (tx) => {
      const validActorId = await this.resolveActorUserId(tx, actorId);
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, id));

      if (!invoice) {
        const err: any = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      if (invoice.status === 'ISSUED') {
        // Idempotent: already issued
        return this.findById(id, tx);
      }

      if (invoice.status === 'CANCELLED') {
        const err: any = new Error('Cannot finalize a cancelled invoice');
        err.statusCode = 400;
        err.code = 'INVALID_STATUS_TRANSITION';
        throw err;
      }

      await tx
        .update(invoices)
        .set({
          status: 'ISSUED',
          notes: notes !== undefined ? notes : invoice.notes,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id));

      // Customer Activity
      try {
        await tx.insert(customerActivities).values({
          customerId: invoice.customerId,
          actorId: validActorId,
          actorName,
          eventType: 'INVOICE_GENERATED',
          entityType: 'INVOICE',
          entityId: invoice.id,
          description: `Invoice ${invoice.invoiceNumber} was finalized and issued.`,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
          },
        });
      } catch {}

      // Audit Log
      try {
        await tx.insert(auditLogs).values({
          actorId: validActorId,
          actorUsername: actorName,
          action: 'UPDATE',
          entityType: 'INVOICE',
          entityId: invoice.id,
          afterState: {
            action: 'FINALIZE_INVOICE',
            invoiceNumber: invoice.invoiceNumber,
            status: 'ISSUED',
          },
        });
      } catch {}

      return this.findById(id, tx);
    });
  }

  /**
   * Cancel Invoice (Controlled cancellation preserving financial history)
   */
  async cancel(id: string, reason: string, actorId?: string, actorName = 'System') {
    return await withTransaction(async (tx) => {
      const validActorId = await this.resolveActorUserId(tx, actorId);
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, id));

      if (!invoice) {
        const err: any = new Error('Invoice not found');
        err.statusCode = 404;
        throw err;
      }

      if (invoice.status === 'CANCELLED') {
        return this.findById(id, tx);
      }

      await tx
        .update(invoices)
        .set({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id));

      // Customer Activity
      try {
        await tx.insert(customerActivities).values({
          customerId: invoice.customerId,
          actorId: validActorId,
          actorName,
          eventType: 'CUSTOMER_UPDATED',
          entityType: 'INVOICE',
          entityId: invoice.id,
          description: `Invoice ${invoice.invoiceNumber} was cancelled. Reason: ${reason.trim()}`,
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, reason: reason.trim() },
        });
      } catch {}

      // Audit Log
      try {
        await tx.insert(auditLogs).values({
          actorId: validActorId,
          actorUsername: actorName,
          action: 'CANCEL',
          entityType: 'INVOICE',
          entityId: invoice.id,
          afterState: {
            invoiceNumber: invoice.invoiceNumber,
            reason: reason.trim(),
          },
        });
      } catch {}

      return this.findById(id, tx);
    });
  }
}

export const invoicesRepository = new InvoicesRepository();
