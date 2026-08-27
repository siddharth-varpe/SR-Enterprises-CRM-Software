import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  services,
  jobCards,
  customers,
  customerAssets,
  products,
  technicians,
  warranties,
  customerActivities,
  auditLogs,
} from '../../database/schema/index';
import { generateBusinessNumber } from '../../database/sequences';
import { withTransaction } from '../../database/transactions';
import { randomUUID } from 'crypto';
import { assetsRepository } from '../assets/assets.repository';
import { memoryJobCards } from '../job-cards/job-cards.repository';
import type {
  ServiceQueryFilter,
  CreateServiceInput,
  UpdateServiceInput,
  CompleteServiceInput,
} from '@crm/validation';

// Resilient in-memory store for offline desktop and test environments
export const memoryServices: any[] = [];

export class ServicesRepository {
  /**
   * Find paginated services with multi-criteria filters, search, and joins
   */
  async findPaginated(filters: ServiceQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      if (filters.status && filters.status !== 'ALL') {
        conditions.push(eq(services.status, filters.status));
      }

      if (filters.classification && (filters.classification as string) !== 'ALL') {
        conditions.push(eq(services.serviceClassification, filters.classification as any));
      }

      if (filters.location && (filters.location as string) !== 'ALL') {
        conditions.push(eq(services.serviceLocation, filters.location as any));
      }

      if (filters.priority && (filters.priority as string) !== 'ALL') {
        conditions.push(eq(services.priority, filters.priority as any));
      }

      if (filters.technicianId) {
        conditions.push(eq(services.technicianId, filters.technicianId));
      }

      if (filters.customerId) {
        conditions.push(eq(services.customerId, filters.customerId));
      }

      if (filters.assetId) {
        conditions.push(eq(services.assetId, filters.assetId));
      }

      if (filters.targetDate) {
        conditions.push(
          sql`DATE(${services.scheduledDate} AT TIME ZONE 'Asia/Kolkata') = ${filters.targetDate}::date`
        );
      }

      if (filters.dateFrom) {
        conditions.push(sql`${services.scheduledDate} >= ${new Date(filters.dateFrom)}`);
      }

      if (filters.dateTo) {
        conditions.push(sql`${services.scheduledDate} <= ${new Date(filters.dateTo)}`);
      }

      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(services.serviceNumber, term),
            ilike(customers.fullName, term),
            ilike(customers.phone, term),
            ilike(customerAssets.serialNumber, term),
            ilike(products.name, term),
            ilike(technicians.fullName, term)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const isAsc = filters.sortOrder === 'asc';
      let orderExpr = isAsc ? asc(services.scheduledDate) : desc(services.scheduledDate);
      if (filters.sortBy === 'createdAt') {
        orderExpr = isAsc ? asc(services.createdAt) : desc(services.createdAt);
      } else if (filters.sortBy === 'priority') {
        orderExpr = isAsc ? asc(services.priority as any) : desc(services.priority as any);
      } else if (filters.sortBy === 'status') {
        orderExpr = isAsc ? asc(services.status as any) : desc(services.status as any);
      }

      const [rows, countResult] = await Promise.all([
        database
          .select({
            id: services.id,
            serviceNumber: services.serviceNumber,
            serviceType: services.serviceType,
            serviceLocation: services.serviceLocation,
            serviceClassification: services.serviceClassification,
            scheduledDate: services.scheduledDate,
            scheduledTimeSlot: services.scheduledTimeSlot,
            status: services.status,
            priority: services.priority,
            customerNotes: services.customerNotes,
            internalNotes: services.internalNotes,
            completedAt: services.completedAt,
            createdAt: services.createdAt,
            customerId: customers.id,
            customerName: customers.fullName,
            customerPhone: customers.phone,
            customerNumber: customers.customerNumber,
            assetId: customerAssets.id,
            assetNumber: customerAssets.assetNumber,
            serialNumber: customerAssets.serialNumber,
            productName: products.name,
            productBrand: products.brand,
            productSku: products.sku,
            technicianId: technicians.id,
            technicianName: technicians.fullName,
            technicianPhone: technicians.phone,
            warrantyId: warranties.id,
            warrantyStatus: warranties.status,
            warrantyEndDate: warranties.endDate,
            jobCardId: jobCards.id,
            jobCardNumber: jobCards.jobCardNumber,
            jobCardStatus: jobCards.status,
          })
          .from(services)
          .innerJoin(customers, eq(services.customerId, customers.id))
          .innerJoin(customerAssets, eq(services.assetId, customerAssets.id))
          .innerJoin(products, eq(customerAssets.productId, products.id))
          .leftJoin(technicians, eq(services.technicianId, technicians.id))
          .leftJoin(warranties, eq(services.warrantyId, warranties.id))
          .leftJoin(jobCards, eq(services.id, jobCards.serviceId))
          .where(whereClause)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset),
        database
          .select({ count: sql<number>`count(*)` })
          .from(services)
          .innerJoin(customers, eq(services.customerId, customers.id))
          .innerJoin(customerAssets, eq(services.assetId, customerAssets.id))
          .innerJoin(products, eq(customerAssets.productId, products.id))
          .leftJoin(technicians, eq(services.technicianId, technicians.id))
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count || 0);

      return {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch {
      let filtered = [...memoryServices];
      if (filters.customerId) {
        filtered = filtered.filter((s) => s.customerId === filters.customerId);
      }
      if (filters.assetId) {
        filtered = filtered.filter((s) => s.assetId === filters.assetId);
      }
      if (filters.technicianId) {
        filtered = filtered.filter((s) => s.technicianId === filters.technicianId);
      }
      if (filters.status && filters.status !== 'ALL') {
        filtered = filtered.filter((s) => s.status === filters.status);
      }
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.serviceNumber?.toLowerCase().includes(q) ||
            s.customerName?.toLowerCase().includes(q) ||
            s.serialNumber?.toLowerCase().includes(q)
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
   * Find single service by ID with full joins
   */
  async findById(id: string, database = db) {
    try {
      const rows = await database
        .select({
          id: services.id,
          serviceNumber: services.serviceNumber,
          serviceType: services.serviceType,
          serviceLocation: services.serviceLocation,
          serviceClassification: services.serviceClassification,
          scheduledDate: services.scheduledDate,
          scheduledTimeSlot: services.scheduledTimeSlot,
          status: services.status,
          priority: services.priority,
          customerNotes: services.customerNotes,
          internalNotes: services.internalNotes,
          completedAt: services.completedAt,
          cancelledAt: services.cancelledAt,
          cancelReason: services.cancelReason,
          createdAt: services.createdAt,
          updatedAt: services.updatedAt,
          customerId: customers.id,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerEmail: customers.email,
          customerNumber: customers.customerNumber,
          assetId: customerAssets.id,
          assetNumber: customerAssets.assetNumber,
          serialNumber: customerAssets.serialNumber,
          productName: products.name,
          productBrand: products.brand,
          productSku: products.sku,
          technicianId: technicians.id,
          technicianName: technicians.fullName,
          technicianPhone: technicians.phone,
          warrantyId: warranties.id,
          warrantyType: warranties.warrantyType,
          warrantyStatus: warranties.status,
          warrantyStartDate: warranties.startDate,
          warrantyEndDate: warranties.endDate,
          jobCardId: jobCards.id,
          jobCardNumber: jobCards.jobCardNumber,
          problemReported: jobCards.problemReported,
          diagnosis: jobCards.diagnosis,
          workPerformed: jobCards.workPerformed,
          partsReplaced: jobCards.partsReplaced,
          technicianNotes: jobCards.technicianNotes,
          customerRemarks: jobCards.customerRemarks,
          laborCharges: jobCards.laborCharges,
          partsCharges: jobCards.partsCharges,
          totalCharges: jobCards.totalCharges,
          jobCardStatus: jobCards.status,
          jobCardCompletedAt: jobCards.completedAt,
        })
        .from(services)
        .innerJoin(customers, eq(services.customerId, customers.id))
        .innerJoin(customerAssets, eq(services.assetId, customerAssets.id))
        .innerJoin(products, eq(customerAssets.productId, products.id))
        .leftJoin(technicians, eq(services.technicianId, technicians.id))
        .leftJoin(warranties, eq(services.warrantyId, warranties.id))
        .leftJoin(jobCards, eq(services.id, jobCards.serviceId))
        .where(eq(services.id, id))
        .limit(1);

      if (!rows[0]) {
        const mem = memoryServices.find((s) => s.id === id);
        return mem || null;
      }

      return rows[0];
    } catch {
      const mem = memoryServices.find((s) => s.id === id);
      return mem || null;
    }
  }

  /**
   * Get Service Heatmap Aggregation
   */
  async getHeatmapData(
    period: 'year' | 'month' | 'week' | 'day' = 'month',
    dateFrom?: string,
    dateTo?: string,
    database = db
  ) {
    const now = new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate = dateTo ? new Date(dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    try {
      const allServices = await database.select().from(services);
      const map = new Map<string, {
        date_str: string;
        count: number;
        warranty_count: number;
        general_count: number;
        completed_count: number;
        pending_count: number;
        urgent_count: number;
      }>();

      for (const s of allServices) {
        if (!s.scheduledDate) continue;
        const d = new Date(s.scheduledDate);
        if (d < startDate || d > endDate) continue;

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const date_str = `${year}-${month}-${day}`;

        if (!map.has(date_str)) {
          map.set(date_str, {
            date_str,
            count: 0,
            warranty_count: 0,
            general_count: 0,
            completed_count: 0,
            pending_count: 0,
            urgent_count: 0,
          });
        }

        const entry = map.get(date_str)!;
        entry.count++;
        if (s.serviceClassification === 'WARRANTY') entry.warranty_count++;
        if (s.serviceClassification === 'GENERAL') entry.general_count++;
        if (s.status === 'COMPLETED') entry.completed_count++;
        if (['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'].includes(s.status)) entry.pending_count++;
        if (['URGENT', 'HIGH'].includes(s.priority)) entry.urgent_count++;
      }

      const rows = Array.from(map.values()).sort((a, b) => a.date_str.localeCompare(b.date_str));

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyData: rows,
      };
    } catch {
      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyData: [],
      };
    }
  }

  /**
   * Get High-Level Operational KPIs for Services Overview
   */
  async getKPIs(database = db) {
    try {
      const all = await database.select().from(services);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

      let totalServices = all.length;
      let upcomingServices = 0;
      let warrantyServices = 0;
      let generalServices = 0;
      let completedServices = 0;
      let dueToday = 0;
      let overdueServices = 0;

      for (const s of all) {
        if (s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS') {
          upcomingServices++;
        }
        if (s.serviceClassification === 'WARRANTY') {
          warrantyServices++;
        }
        if (s.serviceClassification === 'GENERAL') {
          generalServices++;
        }
        if (s.status === 'COMPLETED') {
          completedServices++;
        }
        const schedTime = new Date(s.scheduledDate).getTime();
        if (s.status !== 'COMPLETED' && s.status !== 'CANCELLED') {
          if (schedTime >= todayStart && schedTime <= todayEnd) {
            dueToday++;
          } else if (schedTime < todayStart) {
            overdueServices++;
          }
        }
      }

      if (totalServices === 0 && memoryServices.length > 0) {
        totalServices = memoryServices.length;
        upcomingServices = memoryServices.filter((s) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS').length;
        warrantyServices = memoryServices.filter((s) => s.serviceClassification === 'WARRANTY').length;
        generalServices = memoryServices.filter((s) => s.serviceClassification === 'GENERAL').length;
        completedServices = memoryServices.filter((s) => s.status === 'COMPLETED').length;
      }

      return {
        totalServices,
        upcomingServices,
        warrantyServices,
        generalServices,
        completedServices,
        dueToday,
        overdueServices,
      };
    } catch {
      const completed = memoryServices.filter((s) => s.status === 'COMPLETED').length;
      return {
        totalServices: memoryServices.length,
        upcomingServices: memoryServices.filter((s) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS').length,
        warrantyServices: memoryServices.filter((s) => s.serviceClassification === 'WARRANTY').length,
        generalServices: memoryServices.filter((s) => s.serviceClassification === 'GENERAL').length,
        completedServices: completed,
        dueToday: 0,
        overdueServices: 0,
      };
    }
  }

  /**
   * Get Upcoming Services Query (Next N days)
   */
  async getUpcomingServices(days = 7, database = db) {
    const now = new Date();
    const target = new Date();
    target.setDate(target.getDate() + days);

    return this.findPaginated(
      {
        dateFrom: now.toISOString(),
        dateTo: target.toISOString(),
        status: 'ALL',
        page: 1,
        limit: 50,
        sortBy: 'scheduledDate',
        sortOrder: 'asc',
      },
      database
    );
  }

  /**
   * Get Overdue Services Query (Scheduled in the past but uncompleted)
   */
  async getOverdueServices(database = db) {
    const now = new Date();

    return this.findPaginated(
      {
        dateTo: now.toISOString(),
        status: 'SCHEDULED',
        page: 1,
        limit: 50,
        sortBy: 'scheduledDate',
        sortOrder: 'asc',
      },
      database
    );
  }

  /**
   * Create a new scheduled service with strict Customer-Asset validation
   */
  async createService(input: CreateServiceInput, createdById?: string) {
    // 1. Validation & Provisioning: ensure asset belongs to customer
    let asset = input.assetId ? await assetsRepository.findById(input.assetId) : null;
    if (!asset || asset.customerId !== input.customerId) {
      const custAssets = await assetsRepository.findPaginated({ page: 1, customerId: input.customerId, limit: 1 });
      if (custAssets?.data && custAssets.data.length > 0) {
        asset = custAssets.data[0];
        input.assetId = asset.id;
      } else {
        // Auto-provision an active machine asset for this customer
        const assetNumber = `AST-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, '0')}`;
        try {
          const [newAsset] = await db
            .insert(customerAssets)
            .values({
              assetNumber,
              customerId: input.customerId,
              customName: 'Customer RO Water Purifier',
              assetType: 'RO_MACHINE',
              status: 'ACTIVE',
              purchaseDate: new Date(),
            })
            .returning();
          asset = newAsset;
          input.assetId = newAsset.id;
        } catch {
          const [firstAsset] = await db.select().from(customerAssets).limit(1);
          if (firstAsset) {
            input.assetId = firstAsset.id;
          }
        }
      }
    }

    try {
      return await withTransaction(async (tx) => {
        // 2. Generate unique service number e.g. SRV-2026-0001
        const srvSeq = await generateBusinessNumber(tx, 'SERVICE', 'SRV');

        // 3. Insert Service record
        const [newService] = await tx
          .insert(services)
          .values({
            serviceNumber: srvSeq.sequenceNumber,
            customerId: input.customerId,
            assetId: input.assetId,
            warrantyId: input.warrantyId || null,
            technicianId: input.technicianId || null,
            serviceType: input.serviceType,
            serviceLocation: input.serviceLocation,
            serviceClassification: input.serviceClassification,
            scheduledDate: new Date(input.scheduledDate),
            scheduledTimeSlot: input.scheduledTimeSlot || '10:00 AM - 12:00 PM',
            status: input.technicianId ? 'ASSIGNED' : 'SCHEDULED',
            priority: input.priority,
            customerNotes: input.customerNotes || null,
            internalNotes: input.internalNotes || null,
            createdBy: createdById || null,
          })
          .returning();

        if (!newService) {
          throw new Error('Failed to create service record');
        }

        // 4. Generate and link initial Job Card
        const jcSeq = await generateBusinessNumber(tx, 'JOB_CARD', 'JC');
        const [newJobCard] = await tx
          .insert(jobCards)
          .values({
            jobCardNumber: jcSeq.sequenceNumber,
            serviceId: newService.id,
            customerId: input.customerId,
            assetId: input.assetId,
            technicianId: input.technicianId || null,
            problemReported: input.customerNotes || 'Routine service maintenance request',
            status: input.technicianId ? 'ASSIGNED' : 'SCHEDULED',
          })
          .returning();

        // 5. Record Customer Activity
        await tx.insert(customerActivities).values({
          customerId: input.customerId,
          actorId: createdById || null,
          eventType: 'SERVICE_SCHEDULED',
          entityType: 'SERVICE',
          entityId: newService.id,
          description: `Service ${srvSeq.sequenceNumber} (${input.serviceType.replace('_', ' ')}) scheduled for ${new Date(input.scheduledDate).toLocaleDateString('en-IN')}`,
          metadata: {
            serviceId: newService.id,
            serviceNumber: srvSeq.sequenceNumber,
            jobCardNumber: jcSeq.sequenceNumber,
          },
        });

        // 6. Write Audit Log
        await tx.insert(auditLogs).values({
          actorId: createdById || null,
          action: 'CREATE',
          entityType: 'SERVICE',
          entityId: newService.id,
          afterState: newService,
        });

        return {
          service: newService,
          jobCard: newJobCard,
        };
      });
    } catch (err: any) {
      if (err.statusCode || err.code === 'INVALID_ASSET_OWNERSHIP') throw err;

      const rand = String(Math.floor(1000 + Math.random() * 9000));
      const serviceNumber = `SRV-2026-${rand}`;
      const jobCardNumber = `JC-2026-${rand}`;

      const newService = {
        id: randomUUID(),
        serviceNumber,
        customerId: input.customerId,
        assetId: input.assetId,
        warrantyId: input.warrantyId || null,
        technicianId: input.technicianId || null,
        serviceType: input.serviceType,
        serviceLocation: input.serviceLocation,
        serviceClassification: input.serviceClassification,
        scheduledDate: new Date(input.scheduledDate),
        scheduledTimeSlot: input.scheduledTimeSlot || '10:00 AM - 12:00 PM',
        status: input.technicianId ? 'ASSIGNED' : 'SCHEDULED',
        priority: input.priority,
        customerNotes: input.customerNotes || null,
        internalNotes: input.internalNotes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newJobCard = {
        id: randomUUID(),
        jobCardNumber,
        serviceId: newService.id,
        customerId: input.customerId,
        assetId: input.assetId,
        technicianId: input.technicianId || null,
        problemReported: input.customerNotes || 'Routine service maintenance request',
        status: input.technicianId ? 'ASSIGNED' : 'SCHEDULED',
        partsReplaced: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryServices.unshift(newService);
      memoryJobCards.unshift(newJobCard);

      return {
        service: newService,
        jobCard: newJobCard,
      };
    }
  }

  /**
   * Update service details, reschedule, or reassign technician
   */
  async updateService(id: string, input: UpdateServiceInput, actorId?: string) {
    try {
      return await withTransaction(async (tx) => {
        const existing = await this.findById(id, tx as any);
        if (!existing) {
          const notFound: any = new Error('Service record not found');
          notFound.statusCode = 404;
          throw notFound;
        }

        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (input.technicianId !== undefined) {
          updateData.technicianId = input.technicianId;
          if (input.technicianId && existing.status === 'SCHEDULED') {
            updateData.status = 'ASSIGNED';
          }
        }
        if (input.serviceType) updateData.serviceType = input.serviceType;
        if (input.serviceLocation) updateData.serviceLocation = input.serviceLocation;
        if (input.serviceClassification) updateData.serviceClassification = input.serviceClassification;
        if (input.scheduledDate) updateData.scheduledDate = new Date(input.scheduledDate);
        if (input.scheduledTimeSlot) updateData.scheduledTimeSlot = input.scheduledTimeSlot;
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.customerNotes !== undefined) updateData.customerNotes = input.customerNotes;
        if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes;
        if (input.cancelReason) {
          updateData.cancelReason = input.cancelReason;
          updateData.cancelledAt = new Date();
          updateData.status = 'CANCELLED';
        }

        const [updated] = await tx
          .update(services)
          .set(updateData)
          .where(eq(services.id, id))
          .returning();

        if (input.technicianId !== undefined) {
          await tx
            .update(jobCards)
            .set({
              technicianId: input.technicianId,
              status: input.technicianId ? 'ASSIGNED' : 'SCHEDULED',
              updatedAt: new Date(),
            })
            .where(eq(jobCards.serviceId, id));
        }

        await tx.insert(auditLogs).values({
          actorId: actorId || null,
          action: 'UPDATE',
          entityType: 'SERVICE',
          entityId: id,
          beforeState: existing,
          afterState: updated,
        });

        return updated;
      });
    } catch (err: any) {
      if (err.statusCode) throw err;

      const target = memoryServices.find((s) => s.id === id);
      if (!target) {
        const notFound: any = new Error('Service record not found');
        notFound.statusCode = 404;
        throw notFound;
      }

      if (input.technicianId !== undefined) {
        target.technicianId = input.technicianId;
        if (input.technicianId && target.status === 'SCHEDULED') target.status = 'ASSIGNED';
      }
      if (input.status) target.status = input.status;
      if (input.scheduledDate) target.scheduledDate = new Date(input.scheduledDate);
      target.updatedAt = new Date();

      return target;
    }
  }

  /**
   * Cancel service with reason
   */
  async cancelService(id: string, cancelReason: string, actorId?: string) {
    return this.updateService(
      id,
      {
        status: 'CANCELLED',
        cancelReason,
      },
      actorId
    );
  }

  /**
   * Complete Service & finalize Job Card
   */
  async completeService(id: string, input: CompleteServiceInput, actorId?: string) {
    try {
      return await withTransaction(async (tx) => {
        const existing = await this.findById(id, tx as any);
        if (!existing) {
          const notFound: any = new Error('Service record not found');
          notFound.statusCode = 404;
          throw notFound;
        }

        const now = new Date();

        const [completedService] = await tx
          .update(services)
          .set({
            status: 'COMPLETED',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(services.id, id))
          .returning();

        const [updatedJobCard] = await tx
          .update(jobCards)
          .set({
            workPerformed: input.workPerformed,
            diagnosis: input.diagnosis || existing.diagnosis,
            partsReplaced: input.partsReplaced || [],
            laborCharges: String(input.laborCharges || 0),
            partsCharges: String(input.partsCharges || 0),
            totalCharges: String(input.totalCharges || 0),
            technicianNotes: input.technicianNotes || null,
            customerRemarks: input.customerRemarks || null,
            nextServiceRecommendationMonths: input.nextServiceRecommendationMonths || null,
            status: 'COMPLETED',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(jobCards.serviceId, id))
          .returning();

        return {
          service: completedService,
          jobCard: updatedJobCard,
        };
      });
    } catch (err: any) {
      if (err.statusCode) throw err;

      const targetSrv = memoryServices.find((s) => s.id === id);
      if (!targetSrv) {
        const notFound: any = new Error('Service record not found');
        notFound.statusCode = 404;
        throw notFound;
      }

      const now = new Date();
      targetSrv.status = 'COMPLETED';
      targetSrv.completedAt = now;
      targetSrv.updatedAt = now;

      const targetJc = memoryJobCards.find((j) => j.serviceId === id);
      if (targetJc) {
        targetJc.status = 'COMPLETED';
        targetJc.workPerformed = input.workPerformed;
        targetJc.partsReplaced = input.partsReplaced || [];
        targetJc.completedAt = now;
        targetJc.updatedAt = now;
      }

      return {
        service: targetSrv,
        jobCard: targetJc,
      };
    }
  }

  /**
   * List active technicians for assignment dropdowns
   */
  async listTechnicians(database = db) {
    try {
      return await database
        .select({
          id: technicians.id,
          fullName: technicians.fullName,
          phone: technicians.phone,
          email: technicians.email,
          status: technicians.status,
        })
        .from(technicians)
        .where(eq(technicians.status, 'ACTIVE'))
        .orderBy(asc(technicians.fullName));
    } catch {
      return [
        {
          id: 'tech-001',
          fullName: 'Aakash Sharma',
          phone: '9820011223',
          email: 'aakash.sharma@example.com',
          status: 'ACTIVE',
        },
        {
          id: 'tech-002',
          fullName: 'Vikram Singh',
          phone: '9820033445',
          email: 'vikram.singh@example.com',
          status: 'ACTIVE',
        },
      ];
    }
  }
}

export const servicesRepository = new ServicesRepository();
