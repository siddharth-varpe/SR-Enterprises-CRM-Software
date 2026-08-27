import { eq, and, sql, lt, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  warranties,
  customerAssets,
  customers,
  invoices,
  reminders,
} from '../../database/schema/index';
import { remindersRepository, memoryReminders } from './reminders.repository';
import { notificationsService } from '../notifications/notifications.service';
import { memoryWarranties } from '../warranties/warranties.repository';
import { memoryInvoices } from '../invoices/invoices.repository';

export interface FollowUpScanResult {
  warrantiesScanned: number;
  warrantyRemindersCreated: number;
  servicesScanned: number;
  serviceRemindersCreated: number;
  invoicesScanned: number;
  invoiceRemindersCreated: number;
  timestamp: Date;
}

export class AutomatedFollowUpService {
  /**
   * Scan active warranties and generate milestone follow-up reminders
   */
  async scanWarrantyExpirations(database = db): Promise<{ scanned: number; created: number }> {
    const now = new Date();
    let scanned = 0;
    let created = 0;

    try {
      // Find all active warranties
      const activeWarranties = await database
        .select({
          warrantyId: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
          customerId: warranties.customerId,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          assetId: warranties.assetId,
          assetNumber: customerAssets.assetNumber,
          serialNumber: customerAssets.serialNumber,
          endDate: warranties.endDate,
        })
        .from(warranties)
        .innerJoin(customers, eq(warranties.customerId, customers.id))
        .innerJoin(customerAssets, eq(warranties.assetId, customerAssets.id))
        .where(eq(warranties.status, 'ACTIVE'));

      scanned = activeWarranties.length;

      for (const war of activeWarranties) {
        const daysRemaining = Math.ceil(
          (new Date(war.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        let milestone: string | null = null;
        let priority: 'NORMAL' | 'HIGH' = 'NORMAL';

        if (daysRemaining <= 1 && daysRemaining >= 0) {
          milestone = '1D';
          priority = 'HIGH';
        } else if (daysRemaining <= 7 && daysRemaining > 1) {
          milestone = '7D';
          priority = 'HIGH';
        } else if (daysRemaining <= 15 && daysRemaining > 7) {
          milestone = '15D';
          priority = 'NORMAL';
        } else if (daysRemaining <= 30 && daysRemaining > 15) {
          milestone = '30D';
          priority = 'NORMAL';
        }

        if (milestone) {
          const deduplicationKey = `WARRANTY_EXP_${war.warrantyId}_${milestone}`;

          // Check if reminder already created
          const [existing] = await database
            .select()
            .from(reminders)
            .where(
              and(
                eq(reminders.customerId, war.customerId),
                sql`${reminders.notes} LIKE ${`%[Key:${deduplicationKey}]%`}`
              )
            );

          if (!existing) {
            await remindersRepository.create({
              customerId: war.customerId,
              reminderType: 'WARRANTY_EXPIRY',
              reminderDate: new Date().toISOString(),
              reminderTime: '10:00 AM',
              priority,
              notes: `Automated Warranty Follow-Up: Warranty ${war.warrantyNumber} for ${war.customerName} (${war.serialNumber}) expires in ${daysRemaining} days. [Key:${deduplicationKey}]`,
            });

            await notificationsService.createNotification({
              targetRole: 'Staff',
              notificationType: 'WARRANTY_EXPIRING',
              title: `Warranty Expiring (${milestone}): ${war.customerName}`,
              message: `Warranty ${war.warrantyNumber} for machine (${war.serialNumber}) expires on ${new Date(war.endDate).toLocaleDateString('en-IN')}.`,
              severity: priority === 'HIGH' ? 'WARNING' : 'INFO',
              entityType: 'WARRANTY',
              entityId: war.warrantyId,
              actionUrl: '/warranties',
              eventKey: deduplicationKey,
            });

            created++;
          }
        }
      }
    } catch {
      // Memory fallback scan
      scanned = memoryWarranties.length;
      for (const war of memoryWarranties) {
        if (war.status !== 'ACTIVE') continue;

        const daysRemaining = Math.ceil(
          (new Date(war.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        let milestone: string | null = null;
        let priority: 'NORMAL' | 'HIGH' = 'NORMAL';

        if (daysRemaining <= 1 && daysRemaining >= 0) {
          milestone = '1D';
          priority = 'HIGH';
        } else if (daysRemaining <= 7 && daysRemaining > 1) {
          milestone = '7D';
          priority = 'HIGH';
        } else if (daysRemaining <= 15 && daysRemaining > 7) {
          milestone = '15D';
          priority = 'NORMAL';
        } else if (daysRemaining <= 30 && daysRemaining > 15) {
          milestone = '30D';
          priority = 'NORMAL';
        }

        if (milestone) {
          const deduplicationKey = `WARRANTY_EXP_${war.id}_${milestone}`;
          const existing = memoryReminders.find(
            (r: any) => r.customerId === war.customerId && r.notes?.includes(`[Key:${deduplicationKey}]`)
          );

          if (!existing) {
            await remindersRepository.create({
              customerId: war.customerId,
              reminderType: 'WARRANTY_EXPIRY',
              reminderDate: new Date().toISOString(),
              reminderTime: '10:00 AM',
              priority,
              notes: `Automated Warranty Follow-Up: Warranty ${war.warrantyNumber} expires in ${daysRemaining} days. [Key:${deduplicationKey}]`,
            });

            await notificationsService.createNotification({
              targetRole: 'Staff',
              notificationType: 'WARRANTY_EXPIRING',
              title: `Warranty Expiring (${milestone}): ${war.customerName || 'Customer'}`,
              message: `Warranty ${war.warrantyNumber} expires on ${new Date(war.endDate).toLocaleDateString('en-IN')}.`,
              severity: priority === 'HIGH' ? 'WARNING' : 'INFO',
              entityType: 'WARRANTY',
              entityId: war.id,
              actionUrl: '/warranties',
              eventKey: deduplicationKey,
            });

            created++;
          }
        }
      }
    }

    return { scanned, created };
  }

  /**
   * Scan overdue invoices and generate payment follow-up reminders
   */
  async scanOverdueInvoices(database = db): Promise<{ scanned: number; created: number }> {
    const now = new Date();
    let scanned = 0;
    let created = 0;

    try {
      const overdueList = await database
        .select({
          invoiceId: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          customerName: customers.fullName,
          totalAmount: invoices.totalAmount,
          dueDate: invoices.dueDate,
          status: invoices.status,
        })
        .from(invoices)
        .innerJoin(customers, eq(invoices.customerId, customers.id))
        .where(
          and(
            inArray(invoices.status, ['ISSUED', 'PARTIALLY_PAID']),
            lt(invoices.dueDate, now)
          )
        );

      scanned = overdueList.length;

      for (const inv of overdueList) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        let milestone = 'OVERDUE_1D';
        if (daysOverdue >= 15) milestone = 'OVERDUE_15D';
        else if (daysOverdue >= 7) milestone = 'OVERDUE_7D';

        const deduplicationKey = `INV_OVERDUE_${inv.invoiceId}_${milestone}`;

        const [existing] = await database
          .select()
          .from(reminders)
          .where(
            and(
              eq(reminders.invoiceId, inv.invoiceId),
              sql`${reminders.notes} LIKE ${`%[Key:${deduplicationKey}]%`}`
            )
          );

        if (!existing) {
          await remindersRepository.create({
            customerId: inv.customerId,
            invoiceId: inv.invoiceId,
            reminderType: 'PAYMENT_FOLLOW_UP',
            reminderDate: new Date().toISOString(),
            reminderTime: '11:00 AM',
            priority: 'HIGH',
            notes: `Automated Payment Reminder: Invoice #${inv.invoiceNumber} for ${inv.customerName} is overdue by ${daysOverdue} days. [Key:${deduplicationKey}]`,
          });

          await notificationsService.dispatchInvoiceOverdue({
            invoiceId: inv.invoiceId,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            overdueAmount: parseFloat(inv.totalAmount),
          });

          created++;
        }
      }
    } catch {
      // Memory fallback scan
      const overdue = memoryInvoices.filter(
        (i) =>
          ['ISSUED', 'PARTIALLY_PAID'].includes(i.status) &&
          new Date(i.dueDate) < now
      );
      scanned = overdue.length;

      for (const inv of overdue) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        let milestone = 'OVERDUE_1D';
        if (daysOverdue >= 15) milestone = 'OVERDUE_15D';
        else if (daysOverdue >= 7) milestone = 'OVERDUE_7D';

        const deduplicationKey = `INV_OVERDUE_${inv.id}_${milestone}`;
        const existing = memoryReminders.find(
          (r: any) => r.invoiceId === inv.id && r.notes?.includes(`[Key:${deduplicationKey}]`)
        );

        if (!existing) {
          await remindersRepository.create({
            customerId: inv.customerId,
            invoiceId: inv.id,
            reminderType: 'PAYMENT_FOLLOW_UP',
            reminderDate: new Date().toISOString(),
            reminderTime: '11:00 AM',
            priority: 'HIGH',
            notes: `Automated Payment Reminder: Invoice #${inv.invoiceNumber} is overdue by ${daysOverdue} days. [Key:${deduplicationKey}]`,
          });

          await notificationsService.dispatchInvoiceOverdue({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || 'Customer',
            overdueAmount: parseFloat(inv.outstandingAmount || inv.totalAmount),
          });

          created++;
        }
      }
    }

    return { scanned, created };
  }

  /**
   * Orchestrate all automated follow-up rules and scans
   */
  async processAllAutomatedFollowUps(): Promise<FollowUpScanResult> {
    const warResult = await this.scanWarrantyExpirations();
    const invResult = await this.scanOverdueInvoices();

    return {
      warrantiesScanned: warResult.scanned,
      warrantyRemindersCreated: warResult.created,
      servicesScanned: 0,
      serviceRemindersCreated: 0,
      invoicesScanned: invResult.scanned,
      invoiceRemindersCreated: invResult.created,
      timestamp: new Date(),
    };
  }
}

export const automatedFollowUpService = new AutomatedFollowUpService();
