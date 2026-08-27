import { db } from '../../database/client';
import {
  notifications,
  notificationPreferences,
  type NotificationRecord,
  type NewNotificationRecord,
  type NotificationPreferenceRecord,
} from '../../database/schema/notifications';
import { eq, and, or, desc, sql, count, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { NotificationQueryFilterInput, UpdateNotificationPreferencesInput } from '@crm/validation';

export const memoryNotifications: any[] = [];
export const memoryNotificationPreferences: Map<string, any> = new Map();

export class NotificationsRepository {
  /**
   * Create a new notification
   */
  async create(data: NewNotificationRecord): Promise<NotificationRecord> {
    try {
      const [record] = await db.insert(notifications).values(data).returning();
      if (!record) throw new Error('Failed to create notification');
      return record;
    } catch {
      const newRec: any = {
        id: randomUUID(),
        userId: data.userId || null,
        targetRole: data.targetRole || null,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        severity: data.severity || 'INFO',
        priority: data.priority || 'NORMAL',
        isRead: false,
        readAt: null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        actionUrl: data.actionUrl || null,
        eventKey: data.eventKey || null,
        expiresAt: data.expiresAt || null,
        createdAt: new Date(),
      };
      memoryNotifications.unshift(newRec);
      return newRec;
    }
  }

  /**
   * Deduplication check by eventKey
   */
  async findByEventKey(eventKey: string): Promise<NotificationRecord | null> {
    try {
      const [record] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.eventKey, eventKey))
        .limit(1);
      return record || null;
    } catch {
      const record = memoryNotifications.find((n) => n.eventKey === eventKey);
      return record || null;
    }
  }

  /**
   * List notifications accessible to a user/role
   */
  async listForUser(
    userId: string,
    userRole: string,
    filter: NotificationQueryFilterInput
  ): Promise<{ data: NotificationRecord[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    try {
      // Condition: targeted to user, or targeted to role, or broadcast to all
      const userScope = or(
        eq(notifications.userId, userId),
        eq(notifications.targetRole, userRole as any),
        and(isNull(notifications.userId), isNull(notifications.targetRole))
      );

      const conditions = [userScope];

      if (filter.isRead !== undefined) {
        conditions.push(eq(notifications.isRead, filter.isRead));
      }

      if (filter.severity) {
        conditions.push(eq(notifications.severity, filter.severity as any));
      }

      if (filter.notificationType) {
        conditions.push(eq(notifications.notificationType, filter.notificationType as any));
      }

      if (filter.entityType) {
        conditions.push(eq(notifications.entityType, filter.entityType));
      }

      const whereClause = and(...conditions);

      const [countResult] = await db
        .select({ total: count(notifications.id) })
        .from(notifications)
        .where(whereClause);

      const rows = await db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: rows,
        total: Number(countResult?.total || 0),
        page,
        limit,
      };
    } catch {
      let filtered = memoryNotifications.filter((n) => {
        const matchesUser = !n.userId || n.userId === userId || !n.targetRole || n.targetRole === userRole;
        if (!matchesUser) return false;
        if (filter.isRead !== undefined && n.isRead !== filter.isRead) return false;
        if (filter.severity && n.severity !== filter.severity) return false;
        if (filter.notificationType && n.notificationType !== filter.notificationType) return false;
        if (filter.entityType && n.entityType !== filter.entityType) return false;
        return true;
      });

      const total = filtered.length;
      const data = filtered.slice(offset, offset + limit);
      return { data, total, page, limit };
    }
  }

  /**
   * Get unread notification counts
   */
  async getUnreadCount(
    userId: string,
    userRole: string
  ): Promise<{ unreadCount: number; criticalCount: number; warningCount: number }> {
    try {
      const userScope = or(
        eq(notifications.userId, userId),
        eq(notifications.targetRole, userRole as any),
        and(isNull(notifications.userId), isNull(notifications.targetRole))
      );

      const [summary] = await db
        .select({
          unread: count(notifications.id),
          critical: sql<string>`COUNT(CASE WHEN ${notifications.severity} = 'CRITICAL' THEN 1 END)`,
          warning: sql<string>`COUNT(CASE WHEN ${notifications.severity} = 'WARNING' THEN 1 END)`,
        })
        .from(notifications)
        .where(and(userScope, eq(notifications.isRead, false)));

      return {
        unreadCount: Number(summary?.unread || 0),
        criticalCount: Number(summary?.critical || 0),
        warningCount: Number(summary?.warning || 0),
      };
    } catch {
      const unreadList = memoryNotifications.filter(
        (n) =>
          !n.isRead &&
          (!n.userId || n.userId === userId || !n.targetRole || n.targetRole === userRole)
      );
      const criticalCount = unreadList.filter((n) => n.severity === 'CRITICAL').length;
      const warningCount = unreadList.filter((n) => n.severity === 'WARNING').length;
      return {
        unreadCount: unreadList.length,
        criticalCount,
        warningCount,
      };
    }
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string, userId: string, userRole: string): Promise<NotificationRecord | null> {
    try {
      const userScope = or(
        eq(notifications.userId, userId),
        eq(notifications.targetRole, userRole as any),
        and(isNull(notifications.userId), isNull(notifications.targetRole))
      );

      const [updated] = await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(notifications.id, id), userScope))
        .returning();

      return updated || null;
    } catch {
      const found = memoryNotifications.find((n) => n.id === id);
      if (found) {
        found.isRead = true;
        found.readAt = new Date();
        return found;
      }
      return null;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string, userRole: string): Promise<number> {
    try {
      const userScope = or(
        eq(notifications.userId, userId),
        eq(notifications.targetRole, userRole as any),
        and(isNull(notifications.userId), isNull(notifications.targetRole))
      );

      const updated = await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(userScope, eq(notifications.isRead, false)))
        .returning({ id: notifications.id });

      return updated.length;
    } catch {
      let count = 0;
      for (const n of memoryNotifications) {
        if (!n.isRead && (!n.userId || n.userId === userId || !n.targetRole || n.targetRole === userRole)) {
          n.isRead = true;
          n.readAt = new Date();
          count++;
        }
      }
      return count;
    }
  }

  /**
   * Get user preferences (with automatic default initialization)
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceRecord> {
    try {
      const [existing] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      if (existing) return existing;

      const [created] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          newInquiries: true,
          paymentAlerts: true,
          jobAssignments: true,
          warrantyAlerts: true,
          serviceReminders: true,
          systemAlerts: true,
        })
        .returning();
      if (!created) throw new Error('Failed to initialize preferences');
      return created;
    } catch {
      if (memoryNotificationPreferences.has(userId)) {
        return memoryNotificationPreferences.get(userId);
      }
      const defaultPref = {
        id: randomUUID(),
        userId,
        newInquiries: true,
        paymentAlerts: true,
        jobAssignments: true,
        warrantyAlerts: true,
        serviceReminders: true,
        systemAlerts: true,
        updatedAt: new Date(),
      };
      memoryNotificationPreferences.set(userId, defaultPref);
      return defaultPref;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    prefs: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferenceRecord> {
    try {
      // Ensure default row exists
      await this.getPreferences(userId);

      const [updated] = await db
        .update(notificationPreferences)
        .set({
          ...prefs,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))
        .returning();

      if (!updated) throw new Error('Failed to update preferences');
      return updated;
    } catch {
      const current = await this.getPreferences(userId);
      const updated = {
        ...current,
        ...prefs,
        updatedAt: new Date(),
      };
      memoryNotificationPreferences.set(userId, updated);
      return updated;
    }
  }
}

export const notificationsRepository = new NotificationsRepository();
