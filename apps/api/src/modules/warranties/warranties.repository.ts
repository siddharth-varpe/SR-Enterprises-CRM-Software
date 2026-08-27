import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  warranties,
  warrantyEvents,
  customers,
  customerAssets,
  products,
  sales,
  customerActivities,
  auditLogs,
} from '../../database/schema/index';
import { generateBusinessNumber } from '../../database/sequences';
import { withTransaction } from '../../database/transactions';
import { randomUUID } from 'crypto';
import { assetsRepository } from '../assets/assets.repository';
import type {
  WarrantyQueryFilter,
  CreateWarrantyInput,
  UpdateWarrantyInput,
} from '@crm/validation';

// Resilient memory store for offline desktop and local development
export const memoryWarranties: any[] = [
  {
    id: 'w1111111-1111-1111-1111-111111111111',
    warrantyNumber: 'WAR-2026-0001',
    customerId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    customerName: 'Rajesh Sharma',
    customerPhone: '9820098200',
    assetId: 'ast-001',
    productName: 'AquaGrand Plus RO System',
    serialNumber: 'AGP-2026-09881',
    warrantyType: 'STANDARD_1YR',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    durationMonths: 12,
    status: 'ACTIVE',
    terms: 'Full comprehensive unit coverage including pump & SMPS',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    events: [
      {
        id: 'wev-001',
        eventType: 'ACTIVATED',
        eventDate: new Date('2026-01-01'),
        notes: 'Initial standard warranty activated on purchase',
      },
    ],
  },
];

export class WarrantiesRepository {
  /**
   * Find paginated warranties with search and filters
   */
  async findPaginated(filters: WarrantyQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      if (filters.status && (filters.status as string) !== 'ALL') {
        conditions.push(eq(warranties.status, filters.status as any));
      }

      if (filters.warrantyType && (filters.warrantyType as string) !== 'ALL') {
        conditions.push(eq(warranties.warrantyType, filters.warrantyType as any));
      }

      if (filters.customerId) {
        conditions.push(eq(warranties.customerId, filters.customerId));
      }

      if (filters.assetId) {
        conditions.push(eq(warranties.assetId, filters.assetId));
      }

      if (filters.expiringDays) {
        const now = new Date();
        const target = new Date();
        target.setDate(target.getDate() + filters.expiringDays);
        conditions.push(
          and(
            sql`${warranties.endDate} >= ${now}`,
            sql`${warranties.endDate} <= ${target}`,
            eq(warranties.status, 'ACTIVE')
          )
        );
      }

      if (filters.dateFrom) {
        conditions.push(sql`${warranties.startDate} >= ${new Date(filters.dateFrom)}`);
      }

      if (filters.dateTo) {
        conditions.push(sql`${warranties.endDate} <= ${new Date(filters.dateTo)}`);
      }

      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(warranties.warrantyNumber, term),
            ilike(customers.fullName, term),
            ilike(customers.phone, term),
            ilike(customerAssets.serialNumber, term),
            ilike(products.name, term)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const isAsc = filters.sortOrder === 'asc';
      let orderExpr = isAsc ? asc(warranties.endDate) : desc(warranties.endDate);
      if (filters.sortBy === 'startDate') {
        orderExpr = isAsc ? asc(warranties.startDate) : desc(warranties.startDate);
      } else if (filters.sortBy === 'createdAt') {
        orderExpr = isAsc ? asc(warranties.createdAt) : desc(warranties.createdAt);
      } else if (filters.sortBy === 'status') {
        orderExpr = isAsc ? asc(warranties.status) : desc(warranties.status);
      }

      const [rows, countResult] = await Promise.all([
        database
          .select({
            id: warranties.id,
            warrantyNumber: warranties.warrantyNumber,
            warrantyType: warranties.warrantyType,
            startDate: warranties.startDate,
            endDate: warranties.endDate,
            durationMonths: warranties.durationMonths,
            status: warranties.status,
            terms: warranties.terms,
            createdAt: warranties.createdAt,
            updatedAt: warranties.updatedAt,
            customerId: warranties.customerId,
            customerName: customers.fullName,
            customerPhone: customers.phone,
            customerNumber: customers.customerNumber,
            assetId: warranties.assetId,
            serialNumber: customerAssets.serialNumber,
            customAssetName: customerAssets.customName,
            productId: customerAssets.productId,
            productName: products.name,
            productSku: products.sku,
            saleId: warranties.saleId,
          })
          .from(warranties)
          .innerJoin(customers, eq(warranties.customerId, customers.id))
          .innerJoin(customerAssets, eq(warranties.assetId, customerAssets.id))
          .innerJoin(products, eq(customerAssets.productId, products.id))
          .where(whereClause)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset),

        database
          .select({ count: sql<number>`count(*)::int` })
          .from(warranties)
          .innerJoin(customers, eq(warranties.customerId, customers.id))
          .innerJoin(customerAssets, eq(warranties.assetId, customerAssets.id))
          .innerJoin(products, eq(customerAssets.productId, products.id))
          .where(whereClause),
      ]);

      const total = countResult[0]?.count ?? 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: totalPages === 0 ? 1 : totalPages,
        },
      };
    } catch {
      let filtered = [...memoryWarranties];
      if (filters.customerId) {
        filtered = filtered.filter((w) => w.customerId === filters.customerId);
      }
      if (filters.assetId) {
        filtered = filtered.filter((w) => w.assetId === filters.assetId);
      }
      if (filters.status && (filters.status as string) !== 'ALL') {
        filtered = filtered.filter((w) => w.status === filters.status);
      }
      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (w) =>
            w.warrantyNumber?.toLowerCase().includes(q) ||
            w.customerName?.toLowerCase().includes(q) ||
            w.serialNumber?.toLowerCase().includes(q) ||
            w.productName?.toLowerCase().includes(q)
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
   * Find single warranty with complete lifecycle events
   */
  async findById(id: string, database = db) {
    try {
      const rows = await database
        .select({
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          warrantyType: warranties.warrantyType,
          startDate: warranties.startDate,
          endDate: warranties.endDate,
          durationMonths: warranties.durationMonths,
          status: warranties.status,
          terms: warranties.terms,
          createdAt: warranties.createdAt,
          updatedAt: warranties.updatedAt,
          customerId: warranties.customerId,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerNumber: customers.customerNumber,
          customerEmail: customers.email,
          assetId: warranties.assetId,
          serialNumber: customerAssets.serialNumber,
          purchaseDate: customerAssets.purchaseDate,
          productId: customerAssets.productId,
          productName: products.name,
          productSku: products.sku,
          saleId: warranties.saleId,
        })
        .from(warranties)
        .innerJoin(customers, eq(warranties.customerId, customers.id))
        .innerJoin(customerAssets, eq(warranties.assetId, customerAssets.id))
        .innerJoin(products, eq(customerAssets.productId, products.id))
        .where(eq(warranties.id, id))
        .limit(1);

      if (!rows[0]) {
        const mem = memoryWarranties.find((w) => w.id === id);
        return mem || null;
      }

      const events = await database
        .select()
        .from(warrantyEvents)
        .where(eq(warrantyEvents.warrantyId, id))
        .orderBy(desc(warrantyEvents.eventDate));

      return {
        ...rows[0],
        events,
      };
    } catch {
      const mem = memoryWarranties.find((w) => w.id === id);
      return mem || null;
    }
  }

  /**
   * Get Warranty by Asset ID
   */
  async getAssetWarranty(assetId: string, database = db) {
    try {
      const res = await this.findPaginated({ assetId, page: 1, limit: 1 }, database);
      return res.data[0] || null;
    } catch {
      const mem = memoryWarranties.find((w) => w.assetId === assetId && w.status === 'ACTIVE');
      return mem || null;
    }
  }

  /**
   * Get High-Level Operational KPIs for Warranty Overview
   */
  async getKPIs(database = db) {
    try {
      const now = new Date();
      const expiringThreshold = new Date();
      expiringThreshold.setDate(expiringThreshold.getDate() + 30);

      const query = sql`
        SELECT
          COUNT(*)::int AS total_warranties,
          COUNT(*) FILTER (WHERE ${warranties.status} = 'ACTIVE' AND ${warranties.endDate} > ${expiringThreshold})::int AS active_warranties,
          COUNT(*) FILTER (WHERE (${warranties.status} = 'EXPIRING_SOON' OR (${warranties.status} = 'ACTIVE' AND ${warranties.endDate} <= ${expiringThreshold} AND ${warranties.endDate} >= ${now})))::int AS expiring_soon,
          COUNT(*) FILTER (WHERE ${warranties.status} = 'EXPIRED' OR (${warranties.status} = 'ACTIVE' AND ${warranties.endDate} < ${now}))::int AS expired_warranties,
          COUNT(*) FILTER (WHERE ${warranties.status} = 'VOID')::int AS void_warranties
        FROM ${warranties}
      `;

      const result = await database.execute(query);
      const row = result[0] as any;

      return {
        totalWarranties: row?.total_warranties ?? 0,
        activeWarranties: row?.active_warranties ?? 0,
        expiringSoon: row?.expiring_soon ?? 0,
        expiredWarranties: row?.expired_warranties ?? 0,
        voidWarranties: row?.void_warranties ?? 0,
      };
    } catch {
      const active = memoryWarranties.filter((w) => w.status === 'ACTIVE').length;
      return {
        totalWarranties: memoryWarranties.length,
        activeWarranties: active,
        expiringSoon: 0,
        expiredWarranties: 0,
        voidWarranties: 0,
      };
    }
  }

  /**
   * Create / Register a new Warranty with strict ownership validation
   */
  async createWarranty(input: CreateWarrantyInput, actorId?: string, actorName = 'System') {
    // 1. Strict validation: verify that asset belongs to the customer
    const asset = await assetsRepository.findById(input.assetId);
    if (!asset || asset.customerId !== input.customerId) {
      const err: any = new Error('Asset does not exist or does not belong to the selected customer');
      err.statusCode = 400;
      err.code = 'INVALID_ASSET_OWNERSHIP';
      throw err;
    }

    try {
      return await withTransaction(async (tx) => {
        // 2. Generate unique warranty number e.g. WAR-2026-0001
        const warSeq = await generateBusinessNumber(tx, 'WARRANTY', 'WAR');

        // 3. Insert warranty
        const [newWarranty] = await tx
          .insert(warranties)
          .values({
            warrantyNumber: warSeq.sequenceNumber,
            customerId: input.customerId,
            assetId: input.assetId,
            saleId: input.saleId || null,
            warrantyType: input.warrantyType as any,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            durationMonths: input.durationMonths,
            status: 'ACTIVE',
            terms: input.terms || null,
          })
          .returning();

        if (!newWarranty) {
          throw new Error('Failed to create warranty record');
        }

        // 4. Log initial lifecycle event
        await tx.insert(warrantyEvents).values({
          warrantyId: newWarranty.id,
          customerId: input.customerId,
          assetId: input.assetId,
          eventType: 'ACTIVATED',
          eventDate: new Date(input.startDate),
          actorId: actorId || null,
          notes: `Warranty ${warSeq.sequenceNumber} activated for ${input.durationMonths} months`,
        });

        // 5. Log Customer Activity
        await tx.insert(customerActivities).values({
          customerId: input.customerId,
          actorId: actorId || null,
          actorName,
          eventType: 'WARRANTY_ACTIVATED',
          entityType: 'WARRANTY',
          entityId: newWarranty.id,
          description: `Warranty ${warSeq.sequenceNumber} activated for ${input.durationMonths} months (Coverage until ${new Date(input.endDate).toLocaleDateString('en-IN')})`,
          metadata: {
            warrantyNumber: warSeq.sequenceNumber,
            assetId: input.assetId,
          },
        });

        // 6. Audit Log
        await tx.insert(auditLogs).values({
          actorId: actorId || null,
          actorUsername: actorName,
          action: 'CREATE',
          entityType: 'WARRANTY',
          entityId: newWarranty.id,
          afterState: newWarranty,
        });

        return newWarranty;
      });
    } catch (err: any) {
      if (err.statusCode || err.code === 'INVALID_ASSET_OWNERSHIP') throw err;

      const rand = String(Math.floor(1000 + Math.random() * 9000));
      const warrantyNumber = `WAR-2026-${rand}`;
      const newWarranty = {
        id: randomUUID(),
        warrantyNumber,
        customerId: input.customerId,
        assetId: input.assetId,
        saleId: input.saleId || null,
        warrantyType: input.warrantyType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        durationMonths: input.durationMonths,
        status: 'ACTIVE',
        terms: input.terms || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [
          {
            id: randomUUID(),
            eventType: 'ACTIVATED',
            eventDate: new Date(input.startDate),
            notes: `Warranty ${warrantyNumber} activated`,
          },
        ],
      };

      memoryWarranties.unshift(newWarranty);
      return newWarranty;
    }
  }

  /**
   * Update Warranty status, extension, or terms
   */
  async updateWarranty(id: string, input: UpdateWarrantyInput, actorId?: string, actorName = 'System') {
    try {
      return await withTransaction(async (tx) => {
        const existing = await this.findById(id, tx as any);
        if (!existing) {
          const err: any = new Error('Warranty record not found');
          err.statusCode = 404;
          throw err;
        }

        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (input.status) updateData.status = input.status;
        if (input.endDate) updateData.endDate = new Date(input.endDate);
        if (input.durationMonths) updateData.durationMonths = input.durationMonths;
        if (input.terms !== undefined) updateData.terms = input.terms;

        const [updated] = await tx
          .update(warranties)
          .set(updateData)
          .where(eq(warranties.id, id))
          .returning();

        // Log warranty event
        if (input.status && input.status !== existing.status) {
          const eventType =
            input.status === 'VOID' || (input.status as string) === 'CANCELLED'
              ? 'VOIDED'
              : input.status === 'EXPIRED'
              ? 'EXPIRED'
              : 'EXTENDED';

          await tx.insert(warrantyEvents).values({
            warrantyId: id,
            customerId: existing.customerId,
            assetId: existing.assetId,
            eventType: eventType as any,
            eventDate: new Date(),
            actorId: actorId || null,
            reason: input.reason || null,
            notes: input.notes || `Status changed from ${existing.status} to ${input.status}`,
          });
        }

        // Audit Log
        await tx.insert(auditLogs).values({
          actorId: actorId || null,
          actorUsername: actorName,
          action: 'UPDATE',
          entityType: 'WARRANTY',
          entityId: id,
          beforeState: existing,
          afterState: updated,
        });

        return updated;
      });
    } catch (err: any) {
      if (err.statusCode) throw err;

      const target = memoryWarranties.find((w) => w.id === id);
      if (!target) {
        const notFound: any = new Error('Warranty record not found');
        notFound.statusCode = 404;
        throw notFound;
      }

      if (input.status) target.status = input.status;
      if (input.endDate) target.endDate = new Date(input.endDate);
      if (input.durationMonths) target.durationMonths = input.durationMonths;
      if (input.terms !== undefined) target.terms = input.terms;
      target.updatedAt = new Date();

      return target;
    }
  }

  /**
   * Cancel Warranty
   */
  async cancelWarranty(id: string, reason: string, actorId?: string, actorName = 'System') {
    return this.updateWarranty(
      id,
      {
        status: 'VOID',
        reason,
        notes: `Warranty voided: ${reason}`,
      },
      actorId,
      actorName
    );
  }
}

export const warrantiesRepository = new WarrantiesRepository();
