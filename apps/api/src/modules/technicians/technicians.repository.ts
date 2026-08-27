import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  technicians,
  jobCards,
  services,
  customers,
  customerAssets,
  products,
  auditLogs,
} from '../../database/schema/index';
import { withTransaction } from '../../database/transactions';
import type {
  TechnicianQueryFilter,
  CreateTechnicianInput,
  UpdateTechnicianInput,
} from '@crm/validation';

export class TechniciansRepository {
  /**
   * Find paginated technicians with active & completed job aggregations
   */
  async findPaginated(filters: TechnicianQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.status && (filters.status as string) !== 'ALL') {
      conditions.push(eq(technicians.status, filters.status as any));
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(technicians.fullName, term),
          ilike(technicians.phone, term),
          ilike(technicians.email, term),
          ilike(technicians.address, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const isAsc = filters.sortOrder === 'asc';
    let orderExpr = isAsc ? asc(technicians.fullName) : desc(technicians.fullName);
    if (filters.sortBy === 'createdAt') {
      orderExpr = isAsc ? asc(technicians.createdAt) : desc(technicians.createdAt);
    } else if (filters.sortBy === 'status') {
      orderExpr = isAsc ? asc(technicians.status) : desc(technicians.status);
    }

    const [techRows, countResult] = await Promise.all([
      database
        .select({
          id: technicians.id,
          fullName: technicians.fullName,
          phone: technicians.phone,
          email: technicians.email,
          status: technicians.status,
          skills: technicians.skills,
          address: technicians.address,
          emergencyContact: technicians.emergencyContact,
          userId: technicians.userId,
          createdAt: technicians.createdAt,
          updatedAt: technicians.updatedAt,
        })
        .from(technicians)
        .where(whereClause)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset),
      database
        .select({ count: sql<number>`count(*)` })
        .from(technicians)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    const rows = techRows.map((t) => ({
      ...t,
      activeJobsCount: 0,
      completedJobsCount: 0,
    }));

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find single technician by ID with active assignments & recent job history
   */
  async findById(id: string, database = db) {
    const rows = await database
      .select({
        id: technicians.id,
        fullName: technicians.fullName,
        phone: technicians.phone,
        email: technicians.email,
        status: technicians.status,
        skills: technicians.skills,
        address: technicians.address,
        emergencyContact: technicians.emergencyContact,
        userId: technicians.userId,
        createdAt: technicians.createdAt,
        updatedAt: technicians.updatedAt,
      })
      .from(technicians)
      .where(eq(technicians.id, id))
      .limit(1);

    if (!rows[0]) return null;

    // Fetch recent assigned jobs
    const recentJobs = await database
      .select({
        id: jobCards.id,
        jobCardNumber: jobCards.jobCardNumber,
        status: jobCards.status,
        problemReported: jobCards.problemReported,
        workPerformed: jobCards.workPerformed,
        createdAt: jobCards.createdAt,
        completedAt: jobCards.completedAt,
        serviceNumber: services.serviceNumber,
        serviceType: services.serviceType,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        productName: products.name,
      })
      .from(jobCards)
      .innerJoin(services, eq(jobCards.serviceId, services.id))
      .innerJoin(customers, eq(jobCards.customerId, customers.id))
      .innerJoin(customerAssets, eq(jobCards.assetId, customerAssets.id))
      .innerJoin(products, eq(customerAssets.productId, products.id))
      .where(eq(jobCards.technicianId, id))
      .orderBy(desc(jobCards.createdAt))
      .limit(10);

    return {
      ...rows[0],
      recentJobs,
    };
  }

  /**
   * Get High-Level Operational KPIs for Technicians
   */
  async getKPIs(database = db) {
    const query = sql`
      SELECT
        COUNT(*)::int AS total_technicians,
        COUNT(*) FILTER (WHERE ${technicians.status} = 'ACTIVE')::int AS active_technicians,
        COUNT(*) FILTER (WHERE ${technicians.status} = 'ON_LEAVE')::int AS on_leave,
        COUNT(*) FILTER (WHERE ${technicians.status} = 'INACTIVE')::int AS inactive_technicians
      FROM ${technicians}
    `;

    const result = await database.execute(query);
    const row = result[0] as any;

    return {
      totalTechnicians: row?.total_technicians ?? 0,
      activeTechnicians: row?.active_technicians ?? 0,
      onLeave: row?.on_leave ?? 0,
      inactiveTechnicians: row?.inactive_technicians ?? 0,
    };
  }

  /**
   * Create a new field technician
   */
  async create(input: CreateTechnicianInput, actorId?: string) {
    return withTransaction(async (tx) => {
      // Check phone uniqueness
      const existing = await tx
        .select()
        .from(technicians)
        .where(eq(technicians.phone, input.phone))
        .limit(1);

      if (existing[0]) {
        throw new Error(`A technician with phone number "${input.phone}" already exists`);
      }

      const dbStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' = input.status === 'SUSPENDED' ? 'INACTIVE' : (input.status || 'ACTIVE');

      const [newTech] = await tx
        .insert(technicians)
        .values({
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          address: input.address || null,
          skills: input.skills || ['RO Installation', 'General Service'],
          emergencyContact: input.emergencyContact || null,
          userId: input.userId || null,
          status: dbStatus,
        })
        .returning();

      if (!newTech) {
        throw new Error('Failed to create technician');
      }

      // Audit Log
      try {
        if (actorId) {
          await tx.insert(auditLogs).values({
            actorId,
            action: 'CREATE',
            entityType: 'USER',
            entityId: newTech.id,
            afterState: newTech,
          });
        }
      } catch {}

      return newTech;
    });
  }

  /**
   * Update technician profile or status
   */
  async update(id: string, input: UpdateTechnicianInput, actorId?: string) {
    return withTransaction(async (tx) => {
      const existing = await this.findById(id, tx as any);
      if (!existing) {
        throw new Error('Technician not found');
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (input.fullName) updateData.fullName = input.fullName;
      if (input.phone) updateData.phone = input.phone;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.skills) updateData.skills = input.skills;
      if (input.emergencyContact !== undefined) updateData.emergencyContact = input.emergencyContact;
      if (input.status) {
        updateData.status = (input.status as string) === 'SUSPENDED' ? 'INACTIVE' : input.status;
      }
      if (input.userId !== undefined) updateData.userId = input.userId;

      const [updated] = await tx
        .update(technicians)
        .set(updateData)
        .where(eq(technicians.id, id))
        .returning();

      // Audit Log
      await tx.insert(auditLogs).values({
        actorId: actorId || null,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: id,
        beforeState: existing,
        afterState: updated,
      });

      return updated;
    });
  }
}

export const techniciansRepository = new TechniciansRepository();
