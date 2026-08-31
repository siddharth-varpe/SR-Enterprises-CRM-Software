import { db } from '../../database/client';
import {
  rentals,
  rentalPayments,
  rentalEvents,
  customers,
  technicians,
  users,
} from '../../database/schema/index';
import { eq, desc, asc, and, or, ilike, sql, inArray, gte, lte, count } from 'drizzle-orm';
import { generateBusinessNumber } from '../../database/sequences';

export interface RentalListFilter {
  tab?: 'active' | 'due' | 'overdue' | 'returned' | 'all';
  search?: string;
  rentalStatus?: string;
  paymentStatus?: string;
  billingFrequency?: string;
  machineType?: string;
  customerId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest' | 'dueDate' | 'outstanding' | 'customer';
  page?: number;
  limit?: number;
}

export interface CreateRentalInput {
  customerId: string;
  machineType: string;
  machineModel: string;
  serialNumber: string;
  assetId?: string;
  capacityLph?: string;
  installationLocation?: string;
  machineCondition?: 'NEW' | 'GOOD' | 'USED_GOOD' | 'USED_FAIR' | 'NEEDS_ATTENTION';
  accessories?: string;
  remarks?: string;
  rentalStartDate: Date;
  rentalEndDate?: Date;
  rentalDuration?: 'MONTHLY' | '3_MONTHS' | '6_MONTHS' | '12_MONTHS' | 'CUSTOM';
  minimumRentalPeriodMonths?: number;
  billingFrequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  monthlyRent: number;
  billingAmount: number;
  securityDeposit?: number;
  depositStatus?: 'NOT_COLLECTED' | 'COLLECTED' | 'PARTIALLY_REFUNDED' | 'FULLY_REFUNDED' | 'FORFEITED_ADJUSTED';
  initialDepositPaid?: boolean;
  initialRentPaid?: boolean;
  paymentMethod?: string;
  referenceNumber?: string;
  installationDate?: Date;
  installationTime?: string;
  installationAddress?: string;
  technicianId?: string;
  installationStatus?: 'PENDING' | 'SCHEDULED' | 'INSTALLED' | 'CANCELLED';
  installationNotes?: string;
  notes?: string;
  createdBy?: string;
  actorName?: string;
}

export interface RecordRentalPaymentInput {
  rentalId: string;
  amount: number;
  paymentDate?: Date;
  paymentMethod?: string;
  paymentType?: 'SECURITY_DEPOSIT' | 'MONTHLY_RENT' | 'ADVANCE_RENT' | 'DAMAGE_CHARGE' | 'OTHER';
  referenceNumber?: string;
  periodStartDate?: Date;
  periodEndDate?: Date;
  notes?: string;
  recordedBy?: string;
  actorName?: string;
}

export interface RecordRentalReturnInput {
  rentalId: string;
  returnDate: Date;
  returnCondition: string;
  damageCharges?: number;
  depositAdjustment?: number;
  refundAmount?: number;
  returnNotes?: string;
  actorId?: string;
  actorName?: string;
}

export class RentalRepository {
  /**
   * List rentals with query filters, tabs, search, sorting, and pagination
   */
  async findMany(filters: RentalListFilter, database = db) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Tab Filters
    if (filters.tab === 'active') {
      conditions.push(eq(rentals.rentalStatus, 'ACTIVE'));
    } else if (filters.tab === 'due') {
      conditions.push(
        or(
          eq(rentals.rentalStatus, 'PAYMENT_DUE'),
          eq(rentals.paymentStatus, 'DUE')
        )
      );
    } else if (filters.tab === 'overdue') {
      conditions.push(
        or(
          eq(rentals.rentalStatus, 'OVERDUE'),
          eq(rentals.paymentStatus, 'OVERDUE')
        )
      );
    } else if (filters.tab === 'returned') {
      conditions.push(inArray(rentals.rentalStatus, ['RETURNED', 'COMPLETED', 'TERMINATED']));
    }

    // Direct Status Filter
    if (filters.rentalStatus && filters.rentalStatus !== 'ALL') {
      conditions.push(eq(rentals.rentalStatus, filters.rentalStatus as any));
    }

    // Payment Status Filter
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
      conditions.push(eq(rentals.paymentStatus, filters.paymentStatus as any));
    }

    // Billing Frequency Filter
    if (filters.billingFrequency && filters.billingFrequency !== 'ALL') {
      conditions.push(eq(rentals.billingFrequency, filters.billingFrequency as any));
    }

    // Machine Type Filter
    if (filters.machineType && filters.machineType !== 'ALL') {
      conditions.push(eq(rentals.machineType, filters.machineType));
    }

    // Specific Customer Filter
    if (filters.customerId) {
      conditions.push(eq(rentals.customerId, filters.customerId));
    }

    // Specific Technician Filter
    if (filters.technicianId) {
      conditions.push(eq(rentals.technicianId, filters.technicianId));
    }

    // Date Range Filters
    if (filters.startDate) {
      conditions.push(gte(rentals.rentalStartDate, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      conditions.push(lte(rentals.rentalStartDate, new Date(filters.endDate)));
    }

    // Text Search Filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(rentals.rentalNumber, searchTerm),
          ilike(rentals.machineModel, searchTerm),
          ilike(rentals.serialNumber, searchTerm),
          ilike(customers.fullName, searchTerm),
          ilike(customers.customerNumber, searchTerm),
          ilike(customers.phone, searchTerm),
          ilike(customers.email, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting Order
    let orderByClause: any = desc(rentals.createdAt);
    if (filters.sortBy === 'oldest') {
      orderByClause = asc(rentals.createdAt);
    } else if (filters.sortBy === 'dueDate') {
      orderByClause = asc(rentals.nextDueDate);
    } else if (filters.sortBy === 'outstanding') {
      orderByClause = desc(rentals.outstandingAmount);
    } else if (filters.sortBy === 'customer') {
      orderByClause = asc(customers.fullName);
    }

    // Main Query
    const rows = await database
      .select({
        rental: rentals,
        customer: {
          id: customers.id,
          customerNumber: customers.customerNumber,
          fullName: customers.fullName,
          phone: customers.phone,
          email: customers.email,
        },
        technician: {
          id: technicians.id,
          fullName: technicians.fullName,
          phone: technicians.phone,
          email: technicians.email,
        },
      })
      .from(rentals)
      .innerJoin(customers, eq(rentals.customerId, customers.id))
      .leftJoin(technicians, eq(rentals.technicianId, technicians.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Total Count for Pagination
    const [{ totalCount }] = await database
      .select({ totalCount: count() })
      .from(rentals)
      .innerJoin(customers, eq(rentals.customerId, customers.id))
      .where(whereClause);

    // Summary Statistics for KPI Cards
    const summaryStats = await this.getSummaryStats(database);

    return {
      data: rows.map((r) => ({
        ...r.rental,
        customer: r.customer,
        technician: r.technician,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
      summary: summaryStats,
    };
  }

  /**
   * Get single rental by ID with full customer, technician, payment ledger, and events
   */
  async findById(id: string, database = db) {
    const rows = await database
      .select({
        rental: rentals,
        customer: {
          id: customers.id,
          customerNumber: customers.customerNumber,
          fullName: customers.fullName,
          phone: customers.phone,
          email: customers.email,
        },
        technician: {
          id: technicians.id,
          fullName: technicians.fullName,
          phone: technicians.phone,
          email: technicians.email,
        },
      })
      .from(rentals)
      .innerJoin(customers, eq(rentals.customerId, customers.id))
      .leftJoin(technicians, eq(rentals.technicianId, technicians.id))
      .where(eq(rentals.id, id))
      .limit(1);

    if (!rows || rows.length === 0) return null;

    const rentalRecord = rows[0];

    // Fetch Payment Ledger
    const paymentsList = await database
      .select()
      .from(rentalPayments)
      .where(eq(rentalPayments.rentalId, id))
      .orderBy(desc(rentalPayments.paymentDate));

    // Fetch Events History
    const eventsList = await database
      .select()
      .from(rentalEvents)
      .where(eq(rentalEvents.rentalId, id))
      .orderBy(desc(rentalEvents.createdAt));

    return {
      ...rentalRecord.rental,
      customer: rentalRecord.customer,
      technician: rentalRecord.technician,
      payments: paymentsList,
      events: eventsList,
    };
  }

  /**
   * Find all rentals for a specific customer
   */
  async findByCustomerId(customerId: string, database = db) {
    const rows = await database
      .select({
        rental: rentals,
        customer: {
          id: customers.id,
          customerNumber: customers.customerNumber,
          fullName: customers.fullName,
          phone: customers.phone,
          email: customers.email,
        },
      })
      .from(rentals)
      .innerJoin(customers, eq(rentals.customerId, customers.id))
      .where(eq(rentals.customerId, customerId))
      .orderBy(desc(rentals.createdAt));

    return rows.map((r) => ({
      ...r.rental,
      customer: r.customer,
    }));
  }

  /**
   * Create new rental agreement with database transaction
   */
  async create(input: CreateRentalInput, database = db) {
    return await database.transaction(async (tx) => {
      // 1. Generate sequence number
      const { sequenceNumber: rentalNumber } = await generateBusinessNumber(tx, 'RENTAL', 'RNT');

      const monthlyRent = Number(input.monthlyRent || 0);
      const billingAmount = Number(input.billingAmount || monthlyRent);
      const securityDeposit = Number(input.securityDeposit || 0);

      // Compute initial payment
      let initialPaymentTotal = 0;
      if (input.initialDepositPaid && securityDeposit > 0) {
        initialPaymentTotal += securityDeposit;
      }
      if (input.initialRentPaid && billingAmount > 0) {
        initialPaymentTotal += billingAmount;
      }

      const totalPaid = initialPaymentTotal;
      let outstandingAmount = 0;
      let depositStatus = input.depositStatus || 'NOT_COLLECTED';
      if (input.initialDepositPaid && securityDeposit > 0) {
        depositStatus = 'COLLECTED';
      }

      // Calculate initial next due date
      const startDate = new Date(input.rentalStartDate);
      const nextDueDate = new Date(startDate);
      const freq = input.billingFrequency || 'MONTHLY';
      if (freq === 'QUARTERLY') nextDueDate.setMonth(nextDueDate.getMonth() + 3);
      else if (freq === 'HALF_YEARLY') nextDueDate.setMonth(nextDueDate.getMonth() + 6);
      else if (freq === 'YEARLY') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      else nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'NOT_PAID' = 'NOT_PAID';
      if (input.initialRentPaid) {
        paymentStatus = 'PAID';
      } else if (initialPaymentTotal > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      }

      // 2. Insert rental record
      const [newRental] = await tx
        .insert(rentals)
        .values({
          rentalNumber,
          customerId: input.customerId,
          machineType: input.machineType || 'RO',
          machineModel: input.machineModel,
          serialNumber: input.serialNumber,
          assetId: input.assetId && input.assetId.trim() ? (input.assetId as any) : undefined,
          capacityLph: input.capacityLph,
          installationLocation: input.installationLocation,
          machineCondition: (input.machineCondition as any) || 'GOOD',
          accessories: input.accessories,
          remarks: input.remarks,
          rentalStartDate: startDate,
          rentalEndDate: input.rentalEndDate ? new Date(input.rentalEndDate) : undefined,
          rentalDuration: (input.rentalDuration as any) || 'MONTHLY',
          minimumRentalPeriodMonths: input.minimumRentalPeriodMonths || 1,
          billingFrequency: (freq as any) || 'MONTHLY',
          monthlyRent: String(monthlyRent),
          billingAmount: String(billingAmount),
          securityDeposit: String(securityDeposit),
          depositStatus: (depositStatus as any),
          initialPaymentAmount: String(initialPaymentTotal),
          totalPaid: String(totalPaid),
          outstandingAmount: String(outstandingAmount),
          nextDueDate,
          rentalStatus: 'ACTIVE',
          paymentStatus: (paymentStatus as any),
          installationDate: input.installationDate ? new Date(input.installationDate) : undefined,
          installationTime: input.installationTime,
          installationAddress: input.installationAddress,
          technicianId: input.technicianId && input.technicianId.trim() ? (input.technicianId as any) : undefined,
          technicianName: input.technicianId ? undefined : undefined,
          installationStatus: (input.installationStatus as any) || 'PENDING',
          installationNotes: input.installationNotes,
          notes: input.notes,
          createdBy: input.createdBy && input.createdBy.trim() ? (input.createdBy as any) : undefined,
        })
        .returning();

      // 3. Record initial payment ledger records if collected
      if (input.initialDepositPaid && securityDeposit > 0) {
        const depositReceipt = await generateBusinessNumber(tx, 'RENTAL_PAYMENT', 'RCP-RNT');
        await tx.insert(rentalPayments).values({
          rentalId: newRental.id,
          customerId: input.customerId,
          amount: String(securityDeposit),
          paymentDate: startDate,
          paymentMethod: input.paymentMethod || 'UPI',
          paymentType: 'SECURITY_DEPOSIT',
          receiptNumber: depositReceipt.sequenceNumber,
          referenceNumber: input.referenceNumber,
          notes: 'Initial security deposit collected',
          recordedBy: input.createdBy && input.createdBy.trim() ? (input.createdBy as any) : undefined,
        });
      }

      if (input.initialRentPaid && billingAmount > 0) {
        const rentReceipt = await generateBusinessNumber(tx, 'RENTAL_PAYMENT', 'RCP-RNT');
        await tx.insert(rentalPayments).values({
          rentalId: newRental.id,
          customerId: input.customerId,
          amount: String(billingAmount),
          paymentDate: startDate,
          paymentMethod: input.paymentMethod || 'UPI',
          paymentType: 'MONTHLY_RENT',
          receiptNumber: rentReceipt.sequenceNumber,
          referenceNumber: input.referenceNumber,
          periodStartDate: startDate,
          periodEndDate: nextDueDate,
          notes: 'First cycle advance rent payment collected',
          recordedBy: input.createdBy && input.createdBy.trim() ? (input.createdBy as any) : undefined,
        });
      }

      // 4. Log Creation Event
      await tx.insert(rentalEvents).values({
        rentalId: newRental.id,
        eventType: 'RENTAL_CREATED',
        description: `Rental agreement ${rentalNumber} created for machine ${input.machineModel} (Serial: ${input.serialNumber}) with monthly rent ₹${monthlyRent}.`,
        actorId: input.createdBy,
        actorName: input.actorName || 'Admin',
      });

      return newRental;
    });
  }

  /**
   * Update rental details
   */
  async update(id: string, data: Partial<CreateRentalInput>, database = db) {
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.machineType !== undefined) updatePayload.machineType = data.machineType;
    if (data.machineModel !== undefined) updatePayload.machineModel = data.machineModel;
    if (data.serialNumber !== undefined) updatePayload.serialNumber = data.serialNumber;
    if (data.capacityLph !== undefined) updatePayload.capacityLph = data.capacityLph;
    if (data.installationLocation !== undefined) updatePayload.installationLocation = data.installationLocation;
    if (data.machineCondition !== undefined) updatePayload.machineCondition = data.machineCondition;
    if (data.accessories !== undefined) updatePayload.accessories = data.accessories;
    if (data.remarks !== undefined) updatePayload.remarks = data.remarks;
    if (data.rentalStartDate !== undefined) updatePayload.rentalStartDate = new Date(data.rentalStartDate);
    if (data.rentalEndDate !== undefined) updatePayload.rentalEndDate = data.rentalEndDate ? new Date(data.rentalEndDate) : null;
    if (data.rentalDuration !== undefined) updatePayload.rentalDuration = data.rentalDuration;
    if (data.minimumRentalPeriodMonths !== undefined) updatePayload.minimumRentalPeriodMonths = data.minimumRentalPeriodMonths;
    if (data.billingFrequency !== undefined) updatePayload.billingFrequency = data.billingFrequency;
    if (data.monthlyRent !== undefined) updatePayload.monthlyRent = String(data.monthlyRent);
    if (data.billingAmount !== undefined) updatePayload.billingAmount = String(data.billingAmount);
    if (data.securityDeposit !== undefined) updatePayload.securityDeposit = String(data.securityDeposit);
    if (data.depositStatus !== undefined) updatePayload.depositStatus = data.depositStatus;
    if (data.technicianId !== undefined) updatePayload.technicianId = data.technicianId && data.technicianId.trim() ? data.technicianId : null;
    if (data.installationDate !== undefined) updatePayload.installationDate = data.installationDate ? new Date(data.installationDate) : null;
    if (data.installationTime !== undefined) updatePayload.installationTime = data.installationTime;
    if (data.installationAddress !== undefined) updatePayload.installationAddress = data.installationAddress;
    if (data.installationStatus !== undefined) updatePayload.installationStatus = data.installationStatus;
    if (data.installationNotes !== undefined) updatePayload.installationNotes = data.installationNotes;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    const [updated] = await database
      .update(rentals)
      .set(updatePayload)
      .where(eq(rentals.id, id))
      .returning();

    return updated;
  }

  /**
   * Record recurring rental payment
   */
  async recordPayment(input: RecordRentalPaymentInput, database = db) {
    return await database.transaction(async (tx) => {
      const [rental] = await tx.select().from(rentals).where(eq(rentals.id, input.rentalId)).limit(1);
      if (!rental) throw new Error('Rental not found');

      const paymentAmount = Number(input.amount || 0);
      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

      // 1. Insert payment transaction
      // Generate official rental receipt number
      const receiptRes = await generateBusinessNumber(tx, 'RENTAL_PAYMENT', 'RCP-RNT');

      const [newPayment] = await tx
        .insert(rentalPayments)
        .values({
          rentalId: rental.id,
          customerId: rental.customerId,
          amount: String(paymentAmount),
          paymentDate,
          paymentMethod: input.paymentMethod || 'UPI',
          paymentType: (input.paymentType as any) || 'MONTHLY_RENT',
          receiptNumber: receiptRes.sequenceNumber,
          referenceNumber: input.referenceNumber,
          periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : undefined,
          periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : undefined,
          notes: input.notes,
          recordedBy: input.recordedBy && input.recordedBy.trim() ? (input.recordedBy as any) : undefined,
        })
        .returning();

      // 2. Sum all rental payments for this rental
      const allPayments = await tx
        .select({ amount: rentalPayments.amount })
        .from(rentalPayments)
        .where(eq(rentalPayments.rentalId, rental.id));

      const totalPaidSum = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Calculate outstanding amount: from existing outstanding balance or cycle monthly rent
      const monthlyRentNum = Number(rental.monthlyRent || 0);
      const previousOutstanding = Number(rental.outstandingAmount || 0);
      const dueForThisCycle = previousOutstanding > 0 ? previousOutstanding : monthlyRentNum;
      const outstandingAmount = Math.max(0, dueForThisCycle - paymentAmount);
      const isFullPayment = outstandingAmount === 0;
      const paymentStatus = isFullPayment ? 'PAID' : 'PARTIALLY_PAID';

      // Advance due date only when full payment is satisfied
      let nextDue = new Date(rental.nextDueDate);
      if (isFullPayment && (input.paymentType === 'MONTHLY_RENT' || input.paymentType === 'ADVANCE_RENT')) {
        const freq = rental.billingFrequency || 'MONTHLY';
        if (freq === 'QUARTERLY') nextDue.setMonth(nextDue.getMonth() + 3);
        else if (freq === 'HALF_YEARLY') nextDue.setMonth(nextDue.getMonth() + 6);
        else if (freq === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
        else nextDue.setMonth(nextDue.getMonth() + 1);
      }

      // Update rental status
      const [updatedRental] = await tx
        .update(rentals)
        .set({
          totalPaid: String(totalPaidSum),
          outstandingAmount: String(outstandingAmount),
          paymentStatus: paymentStatus as any,
          rentalStatus: rental.rentalStatus === 'RETURNED' ? 'RETURNED' : 'ACTIVE',
          nextDueDate: nextDue,
          updatedAt: new Date(),
        })
        .where(eq(rentals.id, rental.id))
        .returning();

      // 3. Log Payment Event
      await tx.insert(rentalEvents).values({
        rentalId: rental.id,
        eventType: 'PAYMENT_RECORDED',
        description: `Payment of ₹${paymentAmount} recorded via ${input.paymentMethod || 'UPI'} (${input.paymentType || 'MONTHLY_RENT'}). Receipt: ${receiptRes.sequenceNumber}. New total paid: ₹${totalPaidSum}.`,
        actorId: input.recordedBy,
        actorName: input.actorName || 'Staff',
      });

      return {
        payment: newPayment,
        rental: updatedRental,
      };
    });
  }

  /**
   * Find paginated rental payment ledger records with search & filters
   */
  async findRentalPayments(
    filters: {
      search?: string;
      paymentMethod?: string;
      paymentType?: string;
      customerId?: string;
      rentalId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
    database = db
  ) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.search && filters.search.trim()) {
      const s = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          ilike(customers.fullName, s),
          ilike(customers.phone, s),
          ilike(customers.customerNumber, s),
          ilike(rentals.rentalNumber, s),
          ilike(rentals.machineModel, s),
          ilike(rentals.serialNumber, s),
          ilike(rentalPayments.referenceNumber, s),
          ilike(rentalPayments.receiptNumber, s),
          ilike(rentalPayments.notes, s)
        )
      );
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
      conditions.push(eq(rentalPayments.paymentMethod, filters.paymentMethod));
    }

    if (filters.paymentType && filters.paymentType !== 'ALL') {
      conditions.push(eq(rentalPayments.paymentType, filters.paymentType as any));
    }

    if (filters.customerId) {
      conditions.push(eq(rentalPayments.customerId, filters.customerId));
    }

    if (filters.rentalId) {
      conditions.push(eq(rentalPayments.rentalId, filters.rentalId));
    }

    if (filters.startDate) {
      conditions.push(gte(rentalPayments.paymentDate, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      conditions.push(lte(rentalPayments.paymentDate, new Date(filters.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total Count
    const countResult = await database
      .select({ count: count() })
      .from(rentalPayments)
      .leftJoin(rentals, eq(rentalPayments.rentalId, rentals.id))
      .leftJoin(customers, eq(rentalPayments.customerId, customers.id))
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Records
    const rows = await database
      .select({
        id: rentalPayments.id,
        rentalId: rentalPayments.rentalId,
        customerId: rentalPayments.customerId,
        amount: rentalPayments.amount,
        paymentDate: rentalPayments.paymentDate,
        paymentMethod: rentalPayments.paymentMethod,
        paymentType: rentalPayments.paymentType,
        receiptNumber: rentalPayments.receiptNumber,
        referenceNumber: rentalPayments.referenceNumber,
        periodStartDate: rentalPayments.periodStartDate,
        periodEndDate: rentalPayments.periodEndDate,
        notes: rentalPayments.notes,
        recordedBy: rentalPayments.recordedBy,
        createdAt: rentalPayments.createdAt,
        updatedAt: rentalPayments.updatedAt,
        // Rental details
        rentalNumber: rentals.rentalNumber,
        machineType: rentals.machineType,
        machineModel: rentals.machineModel,
        serialNumber: rentals.serialNumber,
        monthlyRent: rentals.monthlyRent,
        securityDeposit: rentals.securityDeposit,
        totalPaid: rentals.totalPaid,
        outstandingAmount: rentals.outstandingAmount,
        rentalStatus: rentals.rentalStatus,
        paymentStatus: rentals.paymentStatus,
        nextDueDate: rentals.nextDueDate,
        // Customer details
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerNumber: customers.customerNumber,
        customerEmail: customers.email,
        // User details
        recordedByName: users.displayName,
      })
      .from(rentalPayments)
      .leftJoin(rentals, eq(rentalPayments.rentalId, rentals.id))
      .leftJoin(customers, eq(rentalPayments.customerId, customers.id))
      .leftJoin(users, eq(rentalPayments.recordedBy, users.id))
      .where(whereClause)
      .orderBy(desc(rentalPayments.paymentDate), desc(rentalPayments.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map((r) => ({
        ...r,
        receiptNumber:
          r.receiptNumber ||
          `RCP-RNT-${new Date(r.paymentDate).getFullYear()}-${r.id.slice(0, 4).toUpperCase()}`,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find single rental payment with full details
   */
  async findRentalPaymentById(id: string, database = db) {
    const rows = await database
      .select({
        id: rentalPayments.id,
        rentalId: rentalPayments.rentalId,
        customerId: rentalPayments.customerId,
        amount: rentalPayments.amount,
        paymentDate: rentalPayments.paymentDate,
        paymentMethod: rentalPayments.paymentMethod,
        paymentType: rentalPayments.paymentType,
        receiptNumber: rentalPayments.receiptNumber,
        referenceNumber: rentalPayments.referenceNumber,
        periodStartDate: rentalPayments.periodStartDate,
        periodEndDate: rentalPayments.periodEndDate,
        notes: rentalPayments.notes,
        recordedBy: rentalPayments.recordedBy,
        createdAt: rentalPayments.createdAt,
        updatedAt: rentalPayments.updatedAt,
        // Rental details
        rentalNumber: rentals.rentalNumber,
        machineType: rentals.machineType,
        machineModel: rentals.machineModel,
        serialNumber: rentals.serialNumber,
        monthlyRent: rentals.monthlyRent,
        securityDeposit: rentals.securityDeposit,
        totalPaid: rentals.totalPaid,
        outstandingAmount: rentals.outstandingAmount,
        rentalStatus: rentals.rentalStatus,
        paymentStatus: rentals.paymentStatus,
        nextDueDate: rentals.nextDueDate,
        // Customer details
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerNumber: customers.customerNumber,
        customerEmail: customers.email,
        // User details
        recordedByName: users.displayName,
      })
      .from(rentalPayments)
      .leftJoin(rentals, eq(rentalPayments.rentalId, rentals.id))
      .leftJoin(customers, eq(rentalPayments.customerId, customers.id))
      .leftJoin(users, eq(rentalPayments.recordedBy, users.id))
      .where(eq(rentalPayments.id, id))
      .limit(1);

    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...r,
      receiptNumber:
        r.receiptNumber ||
        `RCP-RNT-${new Date(r.paymentDate).getFullYear()}-${r.id.slice(0, 4).toUpperCase()}`,
    };
  }

  /**
   * Record machine return
   */
  async recordReturn(input: RecordRentalReturnInput, database = db) {
    return await database.transaction(async (tx) => {
      const [rental] = await tx.select().from(rentals).where(eq(rentals.id, input.rentalId)).limit(1);
      if (!rental) throw new Error('Rental not found');

      const returnDate = input.returnDate ? new Date(input.returnDate) : new Date();

      const [updatedRental] = await tx
        .update(rentals)
        .set({
          rentalStatus: 'RETURNED',
          returnDate,
          returnCondition: input.returnCondition,
          damageCharges: String(input.damageCharges || 0),
          depositAdjustment: String(input.depositAdjustment || 0),
          refundAmount: String(input.refundAmount || 0),
          returnNotes: input.returnNotes,
          updatedAt: new Date(),
        })
        .where(eq(rentals.id, rental.id))
        .returning();

      // Log Return Event
      await tx.insert(rentalEvents).values({
        rentalId: rental.id,
        eventType: 'MACHINE_RETURNED',
        description: `Machine returned on ${returnDate.toLocaleDateString()}. Condition: ${input.returnCondition}. Refund: ₹${input.refundAmount || 0}. Damage charges: ₹${input.damageCharges || 0}.`,
        actorId: input.actorId,
        actorName: input.actorName || 'Admin',
      });

      return updatedRental;
    });
  }

  /**
   * Hard delete rental record
   */
  async delete(id: string, database = db) {
    const [deleted] = await database.delete(rentals).where(eq(rentals.id, id)).returning();
    return deleted;
  }

  /**
   * Compute high-level KPI stats across rental database
   */
  async getSummaryStats(database = db) {
    const allRentals = await database.select().from(rentals);

    const totalRentals = allRentals.length;
    const totalActive = allRentals.filter((r) => r.rentalStatus === 'ACTIVE').length;
    const totalDue = allRentals.filter((r) => r.rentalStatus === 'PAYMENT_DUE' || r.paymentStatus === 'DUE').length;
    const totalOverdue = allRentals.filter((r) => r.rentalStatus === 'OVERDUE' || r.paymentStatus === 'OVERDUE').length;
    const totalReturned = allRentals.filter((r) => ['RETURNED', 'COMPLETED', 'TERMINATED'].includes(r.rentalStatus)).length;

    const monthlyRunRate = allRentals
      .filter((r) => r.rentalStatus === 'ACTIVE')
      .reduce((sum, r) => sum + Number(r.monthlyRent || 0), 0);

    const totalOutstanding = allRentals.reduce((sum, r) => sum + Number(r.outstandingAmount || 0), 0);
    const totalDepositsHeld = allRentals
      .filter((r) => r.depositStatus === 'COLLECTED')
      .reduce((sum, r) => sum + Number(r.securityDeposit || 0), 0);

    return {
      totalRentals,
      totalActive,
      totalDue,
      totalOverdue,
      totalReturned,
      monthlyRunRate,
      totalOutstanding,
      totalDepositsHeld,
    };
  }
}

export const rentalRepository = new RentalRepository();
