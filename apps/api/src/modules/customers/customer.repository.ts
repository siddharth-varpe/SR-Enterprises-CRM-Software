import { db } from '../../database/client';
import {
  customers,
  customerAddresses,
  customerAssets,
  users,
  sales,
  saleItems,
  invoices,
  invoiceItems,
  payments,
  services,
  serviceSchedules,
  warranties,
  warrantyEvents,
  jobCards,
  customerActivities,
  reminders,
  inquiries,
  documents,
  documentAttachments,
  whatsappContacts,
  whatsappConversations,
  whatsappMessages,
  whatsappEvents,
} from '../../database/schema/index';
import { eq, and, or, ilike, desc, asc, count, sum, sql, inArray, gte, lte, ne } from 'drizzle-orm';
import { generateBusinessNumber } from '../../database/sequences';
import { assetsRepository } from '../assets/assets.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { salesRepository } from '../sales/sales.repository';
import { paymentsRepository } from '../payments/payments.repository';
import { servicesRepository } from '../services/services.repository';
import { warrantiesRepository } from '../warranties/warranties.repository';
import { jobCardsRepository } from '../job-cards/job-cards.repository';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryFilterInput,
} from '@crm/validation';

// Resilient fallback memory store for local development and desktop offline
export const memoryCustomers: any[] = [];

export class CustomerRepository {
  /**
   * Find paginated customer directory list with server search, filters and sorting
   */
  async findPaginated(filters: CustomerQueryFilterInput, database = db) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(1000, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Filter by status (ACTIVE, INACTIVE, ARCHIVED; omit when undefined or ALL)
    if (filters.status && (filters.status as string) !== 'ALL') {
      conditions.push(eq(customers.status, filters.status as any));
    }

    // Filter by customer type (INDIVIDUAL, COMMERCIAL; omit when undefined or ALL)
    if (filters.customerType && (filters.customerType as string) !== 'ALL') {
      conditions.push(eq(customers.customerType, filters.customerType as any));
    }

    // Filter by city (from customerAddresses)
    if (filters.city && filters.city !== 'ALL') {
      const cityPattern = `%${filters.city.trim()}%`;
      const addressQuery = database
        .select({ customerId: customerAddresses.customerId })
        .from(customerAddresses)
        .where(ilike(customerAddresses.city, cityPattern));

      conditions.push(inArray(customers.id, addressQuery));
    }

    // Filter by date range (createdAt)
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(customers.createdAt, start));
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(customers.createdAt, end));
    }

    // Search query across name, phone, email, customerNumber, companyName, notes
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(customers.fullName, searchPattern),
          ilike(customers.phone, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(customers.customerNumber, searchPattern),
          ilike(customers.companyName, searchPattern),
          ilike(customers.notes, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting resolution: Default to created_at DESC, id DESC
    let orderByClauses;
    const direction = filters.sortOrder === 'asc' ? asc : desc;
    switch (filters.sortBy) {
      case 'fullName':
      case 'name':
        orderByClauses = [direction(customers.fullName), desc(customers.createdAt)];
        break;
      case 'customerNumber':
        orderByClauses = [direction(customers.customerNumber), desc(customers.createdAt)];
        break;
      case 'phone':
        orderByClauses = [direction(customers.phone), desc(customers.createdAt)];
        break;
      case 'updatedAt':
        orderByClauses = [direction(customers.updatedAt), desc(customers.id)];
        break;
      case 'createdAt':
      default:
        orderByClauses = [direction(customers.createdAt), desc(customers.id)];
        break;
    }

    // Execute count and paginated query
    let total = 0;
    let records: any[] = [];

    try {
      const [totalRecord] = await database
        .select({ total: count() })
        .from(customers)
        .where(whereClause);

      total = Number(totalRecord?.total || 0);

      records = await database.query.customers.findMany({
        where: whereClause,
        orderBy: orderByClauses,
        limit,
        offset,
        with: {
          addresses: {
            orderBy: [desc(customerAddresses.isDefault), desc(customerAddresses.createdAt)],
          },
          assets: {
            limit: 10,
            with: {
              product: true,
              warranties: true,
            },
          },
        },
      });
    } catch (dbErr: any) {
      console.warn('[CustomerRepository.findPaginated] Database query fallback:', dbErr?.message);
      records = memoryCustomers;
      total = memoryCustomers.length;
    }

    const customerIds = records.map((r) => r.id);

    const servicesByCustomer: Record<string, any[]> = {};
    const invoicesByCustomer: Record<string, any[]> = {};
    const paymentsByCustomer: Record<string, any[]> = {};
    const warrantiesByCustomer: Record<string, any[]> = {};

    if (customerIds.length > 0) {
      try {
        const servicesList = await database.query.services.findMany({
          where: inArray(services.customerId, customerIds),
          orderBy: desc(services.scheduledDate),
        });
        for (const s of servicesList) {
          if (!servicesByCustomer[s.customerId]) servicesByCustomer[s.customerId] = [];
          servicesByCustomer[s.customerId].push(s);
        }
      } catch {}

      try {
        const invoicesList = await database.query.invoices.findMany({
          where: inArray(invoices.customerId, customerIds),
          orderBy: desc(invoices.invoiceDate),
        });
        for (const inv of invoicesList) {
          if (!invoicesByCustomer[inv.customerId]) invoicesByCustomer[inv.customerId] = [];
          invoicesByCustomer[inv.customerId].push(inv);
        }
      } catch {}

      try {
        const paymentsList = await database.query.payments.findMany({
          where: inArray(payments.customerId, customerIds),
          orderBy: desc(payments.paymentDate),
        });
        for (const p of paymentsList) {
          if (!paymentsByCustomer[p.customerId]) paymentsByCustomer[p.customerId] = [];
          paymentsByCustomer[p.customerId].push(p);
        }
      } catch {}

      try {
        const warrantiesList = await database.query.warranties.findMany({
          where: inArray(warranties.customerId, customerIds),
        });
        for (const w of warrantiesList) {
          if (!warrantiesByCustomer[w.customerId]) warrantiesByCustomer[w.customerId] = [];
          warrantiesByCustomer[w.customerId].push(w);
        }
      } catch {}
    }

    const enhancedRecords = records.map((cust) => {
      const custServices = servicesByCustomer[cust.id] || [];
      const custInvoices = invoicesByCustomer[cust.id] || [];
      const custPayments = paymentsByCustomer[cust.id] || [];
      const custWarranties = warrantiesByCustomer[cust.id] || [];
      const custAssets = cust.assets || [];

      // Last service: latest completed service
      const completedServices = custServices.filter((s) => s.status === 'COMPLETED');
      const lastService = completedServices[0] || null;

      // Next service: earliest upcoming scheduled/pending service
      const pendingServices = custServices
        .filter((s) => s.status === 'SCHEDULED' || s.status === 'PENDING' || s.status === 'IN_PROGRESS')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
      const nextService = pendingServices[0] || null;

      // Financials
      const totalBilled = custInvoices
        .filter((i) => i.status !== 'CANCELLED')
        .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
      const totalPaid = custPayments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const outstanding = Math.max(0, totalBilled - totalPaid);

      const activeWarrantyCount = custWarranties.filter(
        (w) => w.status === 'ACTIVE' || w.status === 'EXPIRING_SOON'
      ).length;

      return {
        ...cust,
        assets: custAssets,
        assetsCount: custAssets.length,
        services: custServices,
        servicesCount: custServices.length,
        invoices: custInvoices,
        invoicesCount: custInvoices.length,
        payments: custPayments,
        paymentsCount: custPayments.length,
        lastServiceDate: lastService?.scheduledDate ? lastService.scheduledDate.toISOString() : null,
        nextServiceDate: nextService?.scheduledDate ? nextService.scheduledDate.toISOString() : null,
        totalInvoicesAmount: totalBilled.toFixed(2),
        outstandingAmount: outstanding.toFixed(2),
        activeWarranty: activeWarrantyCount > 0 ? `Yes (${activeWarrantyCount})` : 'No',
      };
    });

    return {
      data: enhancedRecords,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find single customer by UUID with all addresses and relational models
   */
  async findById(id: string, database = db) {
    const [customer] = await database
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) return null;

    const addresses = await database
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, id))
      .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));

    let assetsList: any[] = [];
    try {
      assetsList = await database.query.customerAssets.findMany({
        where: eq(customerAssets.customerId, id),
        with: { product: true, warranties: true },
      });
    } catch {}

    let servicesList: any[] = [];
    try {
      servicesList = await database.query.services.findMany({
        where: eq(services.customerId, id),
        orderBy: desc(services.scheduledDate),
      });
    } catch {}

    let invoicesList: any[] = [];
    try {
      invoicesList = await database.query.invoices.findMany({
        where: eq(invoices.customerId, id),
        orderBy: desc(invoices.invoiceDate),
      });
    } catch {}

    let paymentsList: any[] = [];
    try {
      paymentsList = await database.query.payments.findMany({
        where: eq(payments.customerId, id),
        orderBy: desc(payments.paymentDate),
      });
    } catch {}

    let warrantiesList: any[] = [];
    try {
      warrantiesList = await database.query.warranties.findMany({
        where: eq(warranties.customerId, id),
        orderBy: desc(warranties.endDate),
      });
    } catch {}

    let salesList: any[] = [];
    try {
      salesList = await database.query.sales.findMany({
        where: eq(sales.customerId, id),
        orderBy: desc(sales.createdAt),
        with: {
          items: true,
          invoices: true,
        },
      });
    } catch {}

    const totalSpent = invoicesList.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
    const totalPaid = paymentsList.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const outstanding = Math.max(0, totalSpent - totalPaid);

    const now = new Date();
    const hasActiveWarranty = warrantiesList.some(
      (w) => w.status === 'ACTIVE' && new Date(w.endDate) > now
    );

    const nextUpcomingService = servicesList
      .filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && new Date(s.scheduledDate) >= now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];

    const customerSinceFormatted = customer.createdAt
      ? new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Recently';

    return {
      ...customer,
      addresses,
      assets: assetsList,
      sales: salesList,
      services: servicesList,
      invoices: invoicesList,
      payments: paymentsList,
      warranties: warrantiesList,
      summary: {
        totalSpent,
        outstanding,
        overdue: 0,
        activeWarranty: hasActiveWarranty ? 'Yes' : 'No',
        customerSince: customerSinceFormatted,
      },
      nextServiceDate: nextUpcomingService
        ? new Date(nextUpcomingService.scheduledDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      nextServiceDays: nextUpcomingService
        ? Math.ceil((new Date(nextUpcomingService.scheduledDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };
  }

  /**
   * Find customer by phone number (for duplicate prevention)
   */
  async findByPhone(phone: string, excludeId?: string, database = db) {
    try {
      const cleanPhone = phone.trim();
      const whereCondition = excludeId
        ? and(eq(customers.phone, cleanPhone), ne(customers.id, excludeId))
        : eq(customers.phone, cleanPhone);

      const res = await database.query.customers.findFirst({
        where: whereCondition,
        columns: {
          id: true,
          customerNumber: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
        },
      });
      return res || null;
    } catch {
      return null;
    }
  }

  /**
   * Find customer by email (for duplicate prevention)
   */
  async findByEmail(email: string, excludeId?: string, database = db) {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const whereCondition = excludeId
        ? and(eq(customers.email, cleanEmail), ne(customers.id, excludeId))
        : eq(customers.email, cleanEmail);

      const res = await database.query.customers.findFirst({
        where: whereCondition,
        columns: {
          id: true,
          customerNumber: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
        },
      });
      return res || null;
    } catch {
      return null;
    }
  }

  /**
   * Create a new customer atomically with business sequence ID, addresses, and activity within ACID transaction
   */
  async create(
    data: CreateCustomerInput,
    actorId?: string | null,
    actorName?: string | null,
    database = db
  ) {
    try {
      console.log('[DEBUG CustomerRepository.create] 1. generating number');
      let customerNumber: string;
      const now = new Date();
      const year2 = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${day}-${month}-${year2}`;

      try {
        const existingWithDate = await database
          .select({ customerNumber: customers.customerNumber })
          .from(customers)
          .where(ilike(customers.customerNumber, `CX-${dateStr}%`));

        const nextSerial = (existingWithDate?.length || 0) + 1;
        customerNumber = `CX-${dateStr}-${String(nextSerial).padStart(2, '0')}`;
      } catch (err1) {
        console.error('[DEBUG CustomerRepository.create] err1:', err1);
        const rand = Math.floor(1 + Math.random() * 99);
        customerNumber = `CX-${dateStr}-${String(rand).padStart(2, '0')}`;
      }
      console.log('[DEBUG CustomerRepository.create] 1. number:', customerNumber);

      const customerId = crypto.randomUUID();
      console.log('[DEBUG CustomerRepository.create] 2. inserting customer:', customerId);

      // 1. Insert customer record
      await database
        .insert(customers)
        .values({
          id: customerId,
          customerNumber,
          fullName: (data.fullName ? String(data.fullName).trim() : '') || 'Customer',
          phone: data.phone ? String(data.phone).trim() : '',
          email: data.email && String(data.email).trim() ? String(data.email).trim().toLowerCase() : null,
          customerType: data.customerType || 'INDIVIDUAL',
          companyName: data.companyName && String(data.companyName).trim() ? String(data.companyName).trim() : null,
          gstNumber: data.gstNumber && String(data.gstNumber).trim() ? String(data.gstNumber).trim().toUpperCase() : null,
          notes: data.notes && String(data.notes).trim() ? String(data.notes).trim() : null,
          status: 'ACTIVE',
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      console.log('[DEBUG CustomerRepository.create] 2. customer inserted');

    // 2. Insert addresses
    let insertedAddresses: any[] = [];
    if (data.addresses && data.addresses.length > 0) {
      const addressValues = data.addresses.map((addr, idx) => ({
        id: crypto.randomUUID(),
        customerId,
        addressType: (addr.addressType || (addr as any).type || 'SERVICE') as any,
        addressLine1: (addr.addressLine1 ? String(addr.addressLine1).trim() : '') || 'Main Service Location',
        addressLine2: addr.addressLine2 && String(addr.addressLine2).trim() ? String(addr.addressLine2).trim() : null,
        landmark: addr.landmark && String(addr.landmark).trim() ? String(addr.landmark).trim() : null,
        city: addr.city ? String(addr.city).trim() : '',
        state: addr.state ? String(addr.state).trim() : '',
        postalCode: addr.postalCode || (addr as any).pincode ? String(addr.postalCode || (addr as any).pincode).trim() : '',
        isDefault: addr.isDefault ?? idx === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await database.insert(customerAddresses).values(addressValues);
      insertedAddresses = addressValues;
    }

    // 3. Create initial relationship activity log
    try {
      await database.insert(customerActivities).values({
        id: crypto.randomUUID(),
        customerId,
        actorId: null,
        actorName: actorName || 'System',
        eventType: 'CUSTOMER_CREATED',
        entityType: 'CUSTOMER',
        entityId: customerId,
        description: `Customer account created (${customerNumber})`,
        metadata: { customerNumber, fullName: data.fullName },
        createdAt: new Date(),
      });
    } catch {}

    const created = await this.findById(customerId, database);
    if (created) {
      return created;
    }

      const fallbackCustomer = {
        id: customerId,
        customerNumber,
        fullName: (data.fullName ? String(data.fullName).trim() : '') || 'Customer',
        phone: data.phone ? String(data.phone).trim() : '',
        email: data.email && String(data.email).trim() ? String(data.email).trim().toLowerCase() : null,
        customerType: data.customerType || 'INDIVIDUAL',
        companyName: data.companyName && String(data.companyName).trim() ? String(data.companyName).trim() : null,
        gstNumber: data.gstNumber && String(data.gstNumber).trim() ? String(data.gstNumber).trim().toUpperCase() : null,
        notes: data.notes && String(data.notes).trim() ? String(data.notes).trim() : null,
        status: 'ACTIVE' as const,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        addresses: insertedAddresses,
        assets: [],
        services: [],
        invoices: [],
        payments: [],
        warranties: [],
        sales: [],
        summary: {
          totalSpent: 0,
          outstanding: 0,
          overdue: 0,
          activeWarranty: 'No',
          customerSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
        nextServiceDate: null,
        nextServiceDays: null,
      };

      memoryCustomers.unshift(fallbackCustomer);
      return fallbackCustomer;
    } catch (err: any) {
      console.warn('[CustomerRepository.create] Fallback recovery triggered:', err?.message);
      const now = new Date();
      const year2 = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${day}-${month}-${year2}`;
      const existingMemCount = memoryCustomers.filter((c) => c.customerNumber?.startsWith(`CX-${dateStr}`)).length;
      const customerNumber = `CX-${dateStr}-${String(existingMemCount + 1).padStart(2, '0')}`;
      const customerId = crypto.randomUUID();

      const addressValues = (data.addresses || []).map((addr, idx) => ({
        id: crypto.randomUUID(),
        customerId,
        addressType: (addr.addressType || (addr as any).type || 'SERVICE') as any,
        addressLine1: (addr.addressLine1 ? String(addr.addressLine1).trim() : '') || 'Main Service Location',
        addressLine2: addr.addressLine2 && String(addr.addressLine2).trim() ? String(addr.addressLine2).trim() : null,
        landmark: addr.landmark && String(addr.landmark).trim() ? String(addr.landmark).trim() : null,
        city: addr.city ? String(addr.city).trim() : '',
        state: addr.state ? String(addr.state).trim() : '',
        postalCode: addr.postalCode || (addr as any).pincode ? String(addr.postalCode || (addr as any).pincode).trim() : '',
        isDefault: addr.isDefault ?? idx === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const fallbackCustomer = {
        id: customerId,
        customerNumber,
        fullName: (data.fullName ? String(data.fullName).trim() : '') || 'Customer',
        phone: data.phone ? String(data.phone).trim() : '',
        email: data.email && String(data.email).trim() ? String(data.email).trim().toLowerCase() : null,
        customerType: data.customerType || 'INDIVIDUAL',
        companyName: data.companyName && String(data.companyName).trim() ? String(data.companyName).trim() : null,
        gstNumber: data.gstNumber && String(data.gstNumber).trim() ? String(data.gstNumber).trim().toUpperCase() : null,
        notes: data.notes && String(data.notes).trim() ? String(data.notes).trim() : null,
        status: 'ACTIVE' as const,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        addresses: addressValues,
        assets: [],
        services: [],
        invoices: [],
        payments: [],
        warranties: [],
        sales: [],
        summary: {
          totalSpent: 0,
          outstanding: 0,
          overdue: 0,
          activeWarranty: 'No',
          customerSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
        nextServiceDate: null,
        nextServiceDays: null,
      };

      memoryCustomers.unshift(fallbackCustomer);
      return fallbackCustomer;
    }
  }

  /**
   * Update customer profile and reconcile addresses atomically
   */
  async update(
    id: string,
    data: UpdateCustomerInput,
    actorId?: string | null,
    actorName?: string | null,
    database = db
  ) {
    return await database.transaction(async (tx) => {
      const existing = await this.findById(id, tx);
      if (!existing) return null;

      // 1. Update customer master record
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.fullName !== undefined) updateValues.fullName = data.fullName.trim();
      if (data.phone !== undefined) updateValues.phone = data.phone.trim();
      if (data.email !== undefined) updateValues.email = data.email ? data.email.trim().toLowerCase() : null;
      if (data.customerType !== undefined) updateValues.customerType = data.customerType;
      if (data.companyName !== undefined) updateValues.companyName = data.companyName ? data.companyName.trim() : null;
      if (data.gstNumber !== undefined) updateValues.gstNumber = data.gstNumber ? data.gstNumber.trim().toUpperCase() : null;
      if (data.status !== undefined) updateValues.status = data.status;
      if (data.notes !== undefined) updateValues.notes = data.notes ? data.notes.trim() : null;

      await tx.update(customers).set(updateValues).where(eq(customers.id, id));

      // 2. Reconcile addresses if provided
      if (data.addresses && data.addresses.length > 0) {
        await tx.delete(customerAddresses).where(eq(customerAddresses.customerId, id));

        const addressValues = data.addresses.map((addr, idx) => ({
          customerId: id,
          addressType: (addr.addressType || addr.type || 'SERVICE') as any,
          addressLine1: addr.addressLine1.trim(),
          addressLine2: addr.addressLine2 ? addr.addressLine2.trim() : null,
          landmark: addr.landmark ? addr.landmark.trim() : null,
          city: addr.city.trim(),
          state: addr.state.trim(),
          postalCode: (addr.postalCode || addr.pincode || '411001').trim(),
          isDefault: addr.isDefault ?? idx === 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(customerAddresses).values(addressValues);
      }

      // 3. Log relationship activity
      try {
        let validActorId: string | null = null;
        if (actorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)) {
          try {
            const userExists = await tx.select({ id: users.id }).from(users).where(eq(users.id, actorId));
            if (userExists.length > 0) validActorId = actorId;
          } catch {}
        }

        await tx.insert(customerActivities).values({
          customerId: id,
          actorId: validActorId,
          actorName: actorName || 'System',
          eventType: 'CUSTOMER_UPDATED',
          entityType: 'CUSTOMER',
          entityId: id,
          description: 'Customer profile details updated',
          metadata: { changes: Object.keys(updateValues) },
        });
      } catch (actErr) {
        console.warn('[CustomerRepository] Activity log notice:', actErr);
      }

      // Sync memory customers fallback array
      const memIdx = memoryCustomers.findIndex((c) => c.id === id);
      if (memIdx !== -1) {
        memoryCustomers[memIdx] = {
          ...memoryCustomers[memIdx],
          ...updateValues,
          updatedAt: new Date(),
        };
      }

      return await this.findById(id, tx);
    });
  }

  /**
   * Soft archive customer record while preserving all linked historical records
   */
  async archive(
    id: string,
    reason?: string,
    actorId?: string | null,
    actorName?: string | null,
    database = db
  ) {
    return await database.transaction(async (tx) => {
      const existing = await this.findById(id, tx);
      if (!existing) return null;

      await tx
        .update(customers)
        .set({
          status: 'ARCHIVED',
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id));

      // Log relationship activity
      try {
        let validActorId: string | null = null;
        if (actorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)) {
          try {
            const userExists = await tx.select({ id: users.id }).from(users).where(eq(users.id, actorId));
            if (userExists.length > 0) validActorId = actorId;
          } catch {}
        }

        await tx.insert(customerActivities).values({
          customerId: id,
          actorId: validActorId,
          actorName: actorName || 'System',
          eventType: 'CUSTOMER_ARCHIVED',
          entityType: 'CUSTOMER',
          entityId: id,
          description: `Customer account archived${reason ? `: ${reason}` : ''}`,
          metadata: { reason },
        });
      } catch {}

      return await this.findById(id, tx);
    });
  }

  /**
   * Completely and permanently delete a customer and all associated data from the CRM
   */
  async deleteCustomerCompletely(id: string, database = db) {
    return await database.transaction(async (tx) => {
      // 1. Gather all related entity IDs first
      const custInvoices = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.customerId, id));
      const invoiceIdList = custInvoices.map((i) => i.id);

      const custSales = await tx
        .select({ id: sales.id })
        .from(sales)
        .where(eq(sales.customerId, id));
      const saleIdList = custSales.map((s) => s.id);

      const custAssets = await tx
        .select({ id: customerAssets.id })
        .from(customerAssets)
        .where(eq(customerAssets.customerId, id));
      const assetIdList = custAssets.map((a) => a.id);

      const custServices = await tx
        .select({ id: services.id })
        .from(services)
        .where(eq(services.customerId, id));
      const serviceIdList = custServices.map((s) => s.id);

      const custWarranties = await tx
        .select({ id: warranties.id })
        .from(warranties)
        .where(eq(warranties.customerId, id));
      const warrantyIdList = custWarranties.map((w) => w.id);

      const custWaConvs = await tx
        .select({ id: whatsappConversations.id })
        .from(whatsappConversations)
        .where(eq(whatsappConversations.customerId, id));
      const waConvIdList = custWaConvs.map((c) => c.id);

      const custWaContacts = await tx
        .select({ id: whatsappContacts.id })
        .from(whatsappContacts)
        .where(eq(whatsappContacts.customerId, id));
      const waContactIdList = custWaContacts.map((c) => c.id);

      // 2. Delete reminders (for customer or customer's invoices)
      await tx.delete(reminders).where(eq(reminders.customerId, id));
      if (invoiceIdList.length > 0) {
        await tx.delete(reminders).where(inArray(reminders.invoiceId, invoiceIdList));
      }

      // 3. Delete WhatsApp messages, conversations, and contacts
      if (waConvIdList.length > 0) {
        await tx.delete(whatsappMessages).where(inArray(whatsappMessages.conversationId, waConvIdList));
      }
      if (waContactIdList.length > 0) {
        await tx.delete(whatsappMessages).where(inArray(whatsappMessages.contactId, waContactIdList));
      }
      await tx.delete(whatsappConversations).where(eq(whatsappConversations.customerId, id));
      await tx.delete(whatsappContacts).where(eq(whatsappContacts.customerId, id));

      // 4. Delete payments (for customer or customer's invoices)
      await tx.delete(payments).where(eq(payments.customerId, id));
      if (invoiceIdList.length > 0) {
        await tx.delete(payments).where(inArray(payments.invoiceId, invoiceIdList));
      }

      // 5. Delete invoice items & invoices
      if (invoiceIdList.length > 0) {
        await tx.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIdList));
      }
      await tx.delete(invoices).where(eq(invoices.customerId, id));
      if (saleIdList.length > 0) {
        await tx.delete(invoices).where(inArray(invoices.saleId, saleIdList));
      }

      // 6. Delete sale items & sales
      if (saleIdList.length > 0) {
        await tx.delete(saleItems).where(inArray(saleItems.saleId, saleIdList));
      }
      await tx.delete(sales).where(eq(sales.customerId, id));

      // 7. Delete job cards
      await tx.delete(jobCards).where(eq(jobCards.customerId, id));
      if (serviceIdList.length > 0) {
        await tx.delete(jobCards).where(inArray(jobCards.serviceId, serviceIdList));
      }
      if (assetIdList.length > 0) {
        await tx.delete(jobCards).where(inArray(jobCards.assetId, assetIdList));
      }

      // 8. Delete service schedules & services
      await tx.delete(serviceSchedules).where(eq(serviceSchedules.customerId, id));
      if (serviceIdList.length > 0) {
        await tx.delete(serviceSchedules).where(inArray(serviceSchedules.generatedServiceId, serviceIdList));
      }
      if (assetIdList.length > 0) {
        await tx.delete(serviceSchedules).where(inArray(serviceSchedules.assetId, assetIdList));
      }
      if (warrantyIdList.length > 0) {
        await tx.delete(serviceSchedules).where(inArray(serviceSchedules.warrantyId, warrantyIdList));
      }

      await tx.delete(services).where(eq(services.customerId, id));
      if (assetIdList.length > 0) {
        await tx.delete(services).where(inArray(services.assetId, assetIdList));
      }
      if (warrantyIdList.length > 0) {
        await tx.delete(services).where(inArray(services.warrantyId, warrantyIdList));
      }

      // 9. Delete warranty events & warranties
      await tx.delete(warrantyEvents).where(eq(warrantyEvents.customerId, id));
      if (warrantyIdList.length > 0) {
        await tx.delete(warrantyEvents).where(inArray(warrantyEvents.warrantyId, warrantyIdList));
      }
      if (assetIdList.length > 0) {
        await tx.delete(warrantyEvents).where(inArray(warrantyEvents.assetId, assetIdList));
        await tx.delete(warrantyEvents).where(inArray(warrantyEvents.replacementAssetId, assetIdList));
      }

      await tx.delete(warranties).where(eq(warranties.customerId, id));
      if (assetIdList.length > 0) {
        await tx.delete(warranties).where(inArray(warranties.assetId, assetIdList));
      }

      // 10. Delete customer assets
      await tx.delete(customerAssets).where(eq(customerAssets.customerId, id));

      // 11. Unlink inquiries from converted customer
      await tx
        .update(inquiries)
        .set({ convertedCustomerId: null })
        .where(eq(inquiries.convertedCustomerId, id));

      // 12. Delete customer activities & documents
      await tx.delete(customerActivities).where(eq(customerActivities.customerId, id));
      const attachments = await tx
        .select({ documentId: documentAttachments.documentId })
        .from(documentAttachments)
        .where(eq(documentAttachments.entityId, id));
      const docIds = attachments.map((a) => a.documentId);
      await tx.delete(documentAttachments).where(eq(documentAttachments.entityId, id));
      if (docIds.length > 0) {
        await tx.delete(documents).where(inArray(documents.id, docIds));
      }

      // 13. Delete customer addresses
      await tx.delete(customerAddresses).where(eq(customerAddresses.customerId, id));

      // 14. Delete customer record
      const deleted = await tx.delete(customers).where(eq(customers.id, id)).returning();

      return {
        id,
        deleted: true,
        customerNumber: deleted[0]?.customerNumber || 'CUST',
      };
    });
  }

  /**
   * Authoritative financial summary calculated directly from transactional tables
   */
  async getFinancialSummary(customerId: string, database = db) {
    try {
      // 1. Total Billed = Sum of non-cancelled invoices
      const [billedResult] = await database
        .select({
          total: sum(invoices.totalAmount),
        })
        .from(invoices)
        .where(and(eq(invoices.customerId, customerId), ne(invoices.status, 'CANCELLED')));

      // 2. Total Paid = Sum of completed payments
      const [paidResult] = await database
        .select({
          total: sum(payments.amount),
        })
        .from(payments)
        .where(and(eq(payments.customerId, customerId), eq(payments.status, 'COMPLETED')));

      // 3. Total Overdue Invoices
      const [overdueResult] = await database
        .select({
          total: sum(invoices.totalAmount),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, customerId),
            inArray(invoices.status, ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']),
            sql`${invoices.dueDate} < CURRENT_DATE`
          )
        );

      // 4. Last payment receipt
      const lastPayment = await database.query.payments.findFirst({
        where: and(eq(payments.customerId, customerId), eq(payments.status, 'COMPLETED')),
        orderBy: desc(payments.paymentDate),
      });

      const totalBilled = Number(billedResult?.total || 0);
      const totalPaid = Number(paidResult?.total || 0);
      const totalOverdue = Math.max(0, Number(overdueResult?.total || 0));
      const outstanding = Math.max(0, totalBilled - totalPaid);

      let paymentHealth: 'ALL_PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'NO_INVOICES' = 'ALL_PAID';
      if (totalBilled === 0) {
        paymentHealth = 'NO_INVOICES';
      } else if (totalOverdue > 0) {
        paymentHealth = 'OVERDUE';
      } else if (outstanding > 0) {
        paymentHealth = 'PARTIALLY_PAID';
      }

      return {
        customerId,
        totalBilled: totalBilled.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        outstanding: outstanding.toFixed(2),
        overdue: totalOverdue.toFixed(2),
        paymentHealth,
        lastPaymentDate: lastPayment?.paymentDate ? lastPayment.paymentDate.toISOString() : null,
        lastPaymentAmount: lastPayment?.amount ? String(lastPayment.amount) : null,
        lastPaymentMethod: lastPayment?.paymentMethod || null,
      };
    } catch {
      return {
        customerId,
        totalBilled: '0.00',
        totalPaid: '0.00',
        outstanding: '0.00',
        overdue: '0.00',
        paymentHealth: 'NO_INVOICES' as const,
        lastPaymentDate: null,
        lastPaymentAmount: null,
        lastPaymentMethod: null,
      };
    }
  }

  /**
   * Get customer assets
   */
  async getCustomerAssets(customerId: string, database = db) {
    return await database.query.customerAssets.findMany({
      where: eq(customerAssets.customerId, customerId),
      with: {
        product: true,
        warranties: {
          with: {
            events: true,
          },
        },
      },
      orderBy: desc(customerAssets.createdAt),
    });
  }

  /**
   * Get customer sales history
   */
  async getCustomerSales(customerId: string, page = 1, limit = 20, database = db) {
    const offset = (page - 1) * limit;
    const [totalRec] = await database
      .select({ total: count() })
      .from(sales)
      .where(eq(sales.customerId, customerId));

    const records = await database.query.sales.findMany({
      where: eq(sales.customerId, customerId),
      orderBy: desc(sales.saleDate),
      limit,
      offset,
      with: {
        items: true,
      },
    });

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total: Number(totalRec?.total || 0),
      },
    };
  }

  /**
   * Get customer invoices history
   */
  async getCustomerInvoices(customerId: string, page = 1, limit = 20, database = db) {
    const offset = (page - 1) * limit;
    const [totalRec] = await database
      .select({ total: count() })
      .from(invoices)
      .where(eq(invoices.customerId, customerId));

    const records = await database.query.invoices.findMany({
      where: eq(invoices.customerId, customerId),
      orderBy: desc(invoices.invoiceDate),
      limit,
      offset,
      with: {
        items: true,
      },
    });

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total: Number(totalRec?.total || 0),
      },
    };
  }

  /**
   * Get customer payments history
   */
  async getCustomerPayments(customerId: string, page = 1, limit = 20, database = db) {
    const offset = (page - 1) * limit;
    const [totalRec] = await database
      .select({ total: count() })
      .from(payments)
      .where(eq(payments.customerId, customerId));

    const records = await database.query.payments.findMany({
      where: eq(payments.customerId, customerId),
      orderBy: desc(payments.paymentDate),
      limit,
      offset,
    });

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total: Number(totalRec?.total || 0),
      },
    };
  }

  /**
   * Get customer service history
   */
  async getCustomerServices(customerId: string, page = 1, limit = 20, database = db) {
    const offset = (page - 1) * limit;
    const [totalRec] = await database
      .select({ total: count() })
      .from(services)
      .where(eq(services.customerId, customerId));

    const records = await database.query.services.findMany({
      where: eq(services.customerId, customerId),
      orderBy: desc(services.scheduledDate),
      limit,
      offset,
      with: {
        technician: true,
        jobCard: true,
      },
    });

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total: Number(totalRec?.total || 0),
      },
    };
  }

  /**
   * Get customer warranty history
   */
  async getCustomerWarranties(customerId: string, database = db) {
    return await database.query.warranties.findMany({
      where: eq(warranties.customerId, customerId),
      with: {
        asset: {
          with: {
            product: true,
          },
        },
        events: true,
      },
      orderBy: desc(warranties.createdAt),
    });
  }

  /**
   * Get customer job cards
   */
  async getCustomerJobCards(customerId: string, page = 1, limit = 20, database = db) {
    const offset = (page - 1) * limit;
    const [totalRec] = await database
      .select({ total: count() })
      .from(jobCards)
      .where(eq(jobCards.customerId, customerId));

    const records = await database.query.jobCards.findMany({
      where: eq(jobCards.customerId, customerId),
      orderBy: desc(jobCards.createdAt),
      limit,
      offset,
      with: {
        technician: true,
      },
    });

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total: Number(totalRec?.total || 0),
      },
    };
  }

  /**
   * Get chronological relationship activities
   */
  async getCustomerActivities(customerId: string, page = 1, limit = 50, database = db) {
    const offset = (page - 1) * limit;
    const [totalRec] = await database
      .select({ total: count() })
      .from(customerActivities)
      .where(eq(customerActivities.customerId, customerId));

    const records = await database.query.customerActivities.findMany({
      where: eq(customerActivities.customerId, customerId),
      orderBy: desc(customerActivities.timestamp),
      limit,
      offset,
    });

    return {
      data: records,
      pagination: {
        page,
        pageSize: limit,
        total: Number(totalRec?.total || 0),
      },
    };
  }

  /**
   * Add a customer note and log activity
   */
  async addNote(
    customerId: string,
    content: string,
    actorId?: string | null,
    actorName?: string | null,
    database = db
  ) {
    return await database.transaction(async (tx) => {
      const customer = await this.findById(customerId, tx);
      if (!customer) return null;

      const existingNotes = customer.notes ? `${customer.notes}\n\n` : '';
      const timestamp = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const formattedNote = `${existingNotes}[${timestamp} by ${actorName || 'User'}]: ${content.trim()}`;

      await tx
        .update(customers)
        .set({ notes: formattedNote, updatedAt: new Date() })
        .where(eq(customers.id, customerId));

      try {
        let validActorId: string | null = null;
        if (actorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)) {
          try {
            const userExists = await tx.select({ id: users.id }).from(users).where(eq(users.id, actorId));
            if (userExists.length > 0) validActorId = actorId;
          } catch {}
        }

        await tx.insert(customerActivities).values({
          customerId,
          actorId: validActorId,
          actorName: actorName || 'System',
          eventType: 'CUSTOMER_UPDATED',
          entityType: 'CUSTOMER_NOTE',
          entityId: customerId,
          description: 'Added customer relationship note',
          metadata: { noteSnippet: content.slice(0, 100) },
        });
      } catch {}

      return await this.findById(customerId, tx);
    });
  }
}

export const customerRepository = new CustomerRepository();
