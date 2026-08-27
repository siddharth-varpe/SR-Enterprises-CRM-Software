import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  reminders,
  customers,
  invoices,
  users,
  customerActivities,
  auditLogs,
} from '../../database/schema/index';
import { generateBusinessNumber } from '../../database/sequences';
import { withTransaction } from '../../database/transactions';
import { randomUUID } from 'crypto';
import type {
  ReminderQueryFilter,
  CreateReminderInput,
  UpdateReminderInput,
  CompleteReminderInput,
} from '@crm/validation';

// Resilient memory store for offline and test modes
export const memoryReminders: any[] = [];

export class RemindersRepository {
  /**
   * Find paginated reminders with customer & invoice joins
   */
  async findPaginated(filters: ReminderQueryFilter, database = db) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters.status && (filters.status as string) !== 'ALL') {
      conditions.push(eq(reminders.status, filters.status as any));
    }

    if (filters.reminderType && (filters.reminderType as string) !== 'ALL') {
      conditions.push(eq(reminders.reminderType, filters.reminderType as any));
    }

    if (filters.priority && (filters.priority as string) !== 'ALL') {
      conditions.push(eq(reminders.priority, filters.priority as any));
    }

    if (filters.customerId) {
      conditions.push(eq(reminders.customerId, filters.customerId));
    }

    if (filters.invoiceId) {
      conditions.push(eq(reminders.invoiceId, filters.invoiceId));
    }

    if (filters.dateFrom) {
      conditions.push(sql`${reminders.reminderDate} >= ${new Date(filters.dateFrom)}`);
    }

    if (filters.dateTo) {
      conditions.push(sql`${reminders.reminderDate} <= ${new Date(filters.dateTo)}`);
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(reminders.reminderNumber, term),
          ilike(reminders.notes, term),
          ilike(customers.fullName, term),
          ilike(customers.phone, term),
          ilike(invoices.invoiceNumber, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const isAsc = filters.sortOrder === 'asc';
    let orderExpr = isAsc ? asc(reminders.reminderDate) : desc(reminders.reminderDate);
    if (filters.sortBy === 'priority') {
      orderExpr = isAsc ? asc(reminders.priority as any) : desc(reminders.priority as any);
    } else if (filters.sortBy === 'status') {
      orderExpr = isAsc ? asc(reminders.status as any) : desc(reminders.status as any);
    } else if (filters.sortBy === 'createdAt') {
      orderExpr = isAsc ? asc(reminders.createdAt) : desc(reminders.createdAt);
    }

    const [rows, countResult] = await Promise.all([
      database
        .select({
          id: reminders.id,
          reminderNumber: reminders.reminderNumber,
          reminderType: reminders.reminderType,
          reminderDate: reminders.reminderDate,
          reminderTime: reminders.reminderTime,
          priority: reminders.priority,
          status: reminders.status,
          notes: reminders.notes,
          completedAt: reminders.completedAt,
          createdAt: reminders.createdAt,
          updatedAt: reminders.updatedAt,
          // Customer
          customerId: customers.id,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerNumber: customers.customerNumber,
          // Invoice
          invoiceId: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          invoiceTotal: invoices.totalAmount,
          invoiceStatus: invoices.status,
          dueDate: invoices.dueDate,
          // Created / Completed by
          createdByName: users.displayName,
        })
        .from(reminders)
        .innerJoin(customers, eq(reminders.customerId, customers.id))
        .leftJoin(invoices, eq(reminders.invoiceId, invoices.id))
        .leftJoin(users, eq(reminders.createdBy, users.id))
        .where(whereClause)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset),
      database
        .select({ count: sql<number>`count(*)` })
        .from(reminders)
        .innerJoin(customers, eq(reminders.customerId, customers.id))
        .leftJoin(invoices, eq(reminders.invoiceId, invoices.id))
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
  }

  /**
   * Find single reminder by ID
   */
  async findById(id: string, database = db) {
    const rows = await database
      .select({
        id: reminders.id,
        reminderNumber: reminders.reminderNumber,
        reminderType: reminders.reminderType,
        reminderDate: reminders.reminderDate,
        reminderTime: reminders.reminderTime,
        priority: reminders.priority,
        status: reminders.status,
        notes: reminders.notes,
        completedAt: reminders.completedAt,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
        // Customer
        customerId: customers.id,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerNumber: customers.customerNumber,
        // Invoice
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceTotal: invoices.totalAmount,
        invoiceStatus: invoices.status,
        dueDate: invoices.dueDate,
        // Users
        createdById: users.id,
        createdByName: users.displayName,
      })
      .from(reminders)
      .innerJoin(customers, eq(reminders.customerId, customers.id))
      .leftJoin(invoices, eq(reminders.invoiceId, invoices.id))
      .leftJoin(users, eq(reminders.createdBy, users.id))
      .where(eq(reminders.id, id))
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Reminder KPIs Overview
   */
  async getKPIs(database = db) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = sql`
      SELECT
        COUNT(*)::int AS total_reminders,
        COUNT(*) FILTER (WHERE ${reminders.status} = 'PENDING')::int AS pending_count,
        COUNT(*) FILTER (WHERE ${reminders.status} = 'PENDING' AND ${reminders.reminderDate} >= ${today} AND ${reminders.reminderDate} < ${tomorrow})::int AS due_today_count,
        COUNT(*) FILTER (WHERE ${reminders.status} = 'PENDING' AND ${reminders.reminderDate} < ${today})::int AS overdue_count,
        COUNT(*) FILTER (WHERE ${reminders.status} = 'COMPLETED')::int AS completed_count
      FROM ${reminders}
    `;

    const result = await database.execute(query);
    const row = result[0] as any;

    return {
      totalReminders: row?.total_reminders || 0,
      pendingCount: row?.pending_count || 0,
      dueTodayCount: row?.due_today_count || 0,
      overdueCount: row?.overdue_count || 0,
      completedCount: row?.completed_count || 0,
    };
  }

  /**
   * Create Reminder
   */
  async create(input: CreateReminderInput, actorId?: string) {
    try {
      return await withTransaction(async (tx) => {
        // Generate sequential REM-YYYY-XXXX number
        const remSeq = await generateBusinessNumber(tx, 'REMINDER', 'REM');
        const reminderDate = new Date(input.reminderDate);

        const [newReminder] = await tx
          .insert(reminders)
          .values({
            reminderNumber: remSeq.sequenceNumber,
            customerId: input.customerId,
            invoiceId: input.invoiceId || null,
            paymentId: input.paymentId || null,
            reminderType: input.reminderType,
            reminderDate,
            reminderTime: input.reminderTime || null,
            priority: input.priority || 'NORMAL',
            status: 'PENDING',
            notes: input.notes || null,
            createdBy: actorId || null,
          })
          .returning();

        if (!newReminder) {
          throw new Error('Failed to create reminder');
        }

        // Customer Activity
        await tx.insert(customerActivities).values({
          customerId: input.customerId,
          actorId: actorId || null,
          eventType: 'REMINDER_CREATED',
          entityType: 'INVOICE',
          entityId: input.invoiceId || input.customerId,
          description: `Follow-up reminder scheduled for ${reminderDate.toLocaleDateString()}: ${input.notes || input.reminderType}`,
          metadata: {
            reminderNumber: newReminder.reminderNumber,
            reminderType: input.reminderType,
            priority: input.priority,
          },
        });

        // Audit Log
        await tx.insert(auditLogs).values({
          actorId: actorId || null,
          action: 'CREATE',
          entityType: 'REMINDER' as any,
          entityId: newReminder.id,
          afterState: newReminder,
        });

        return newReminder;
      });
    } catch {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const reminderNumber = `REM-${new Date().getFullYear()}-${rand}`;
      const newReminder = {
        id: randomUUID(),
        reminderNumber,
        customerId: input.customerId,
        invoiceId: input.invoiceId || null,
        paymentId: input.paymentId || null,
        reminderType: input.reminderType,
        reminderDate: new Date(input.reminderDate),
        reminderTime: input.reminderTime || null,
        priority: input.priority || 'NORMAL',
        status: 'PENDING',
        notes: input.notes || null,
        createdBy: actorId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryReminders.unshift(newReminder);
      return newReminder;
    }
  }

  /**
   * Update Reminder Details
   */
  async update(id: string, input: UpdateReminderInput, actorId?: string) {
    return withTransaction(async (tx) => {
      const existing = await this.findById(id, tx as any);
      if (!existing) {
        throw new Error('Reminder not found');
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (input.reminderDate) updateData.reminderDate = new Date(input.reminderDate);
      if (input.reminderTime !== undefined) updateData.reminderTime = input.reminderTime;
      if (input.priority) updateData.priority = input.priority;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.status) updateData.status = input.status;

      const [updated] = await tx
        .update(reminders)
        .set(updateData)
        .where(eq(reminders.id, id))
        .returning();

      // Audit Log
      await tx.insert(auditLogs).values({
        actorId: actorId || null,
        action: 'UPDATE',
        entityType: 'REMINDER' as any,
        entityId: id,
        beforeState: existing,
        afterState: updated,
      });

      return updated;
    });
  }

  /**
   * Mark Reminder Completed
   */
  async complete(id: string, input: CompleteReminderInput, actorId?: string) {
    return withTransaction(async (tx) => {
      const existing = await this.findById(id, tx as any);
      if (!existing) {
        throw new Error('Reminder not found');
      }

      const now = new Date();

      const [updated] = await tx
        .update(reminders)
        .set({
          status: 'COMPLETED',
          completedBy: actorId || null,
          completedAt: now,
          notes: input.notes ? `${existing.notes || ''}\n[Completion Note]: ${input.notes}`.trim() : existing.notes,
          updatedAt: now,
        })
        .where(eq(reminders.id, id))
        .returning();

      // Customer Activity
      await tx.insert(customerActivities).values({
        customerId: existing.customerId,
        actorId: actorId || null,
        eventType: 'REMINDER_COMPLETED',
        entityType: 'INVOICE',
        entityId: existing.invoiceId || existing.customerId,
        description: `Follow-up reminder ${existing.reminderNumber} completed. ${input.notes || ''}`.trim(),
        metadata: {
          reminderNumber: existing.reminderNumber,
        },
      });

      // Audit Log
      await tx.insert(auditLogs).values({
        actorId: actorId || null,
        action: 'UPDATE',
        entityType: 'REMINDER' as any,
        entityId: id,
        beforeState: { status: existing.status },
        afterState: { status: 'COMPLETED', notes: input.notes },
      });

      return updated;
    });
  }

  /**
   * Cancel Reminder
   */
  async cancel(id: string, actorId?: string) {
    return withTransaction(async (tx) => {
      const existing = await this.findById(id, tx as any);
      if (!existing) {
        throw new Error('Reminder not found');
      }

      const now = new Date();

      const [updated] = await tx
        .update(reminders)
        .set({
          status: 'CANCELLED',
          updatedAt: now,
        })
        .where(eq(reminders.id, id))
        .returning();

      // Audit Log
      await tx.insert(auditLogs).values({
        actorId: actorId || null,
        action: 'CANCEL',
        entityType: 'REMINDER' as any,
        entityId: id,
        beforeState: { status: existing.status },
        afterState: { status: 'CANCELLED' },
      });

      return updated;
    });
  }
}

export const remindersRepository = new RemindersRepository();
