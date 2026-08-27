import { eq, and, or, sql, lt, lte, inArray } from 'drizzle-orm';
import { db } from '../../../database/client';
import {
  invoices,
  warranties,
  inventoryBalances,
  products,
} from '../../../database/schema/index';
import { ConfigurationService } from '../../system/configuration.service';
import { WorkflowEngine } from './workflow-engine';
import { StateMachine } from './state-machine';
import type { NotificationSettings, InventorySettings } from '@crm/types';
import crypto from 'crypto';

export class WorkflowScheduler {
  private static configService = new ConfigurationService();

  /**
   * Run all scheduled automations (Overdue invoices, expiring warranties, low stock)
   */
  public static async runAllScheduledAutomations(): Promise<{
    overdueInvoicesProcessed: number;
    expiringWarrantiesProcessed: number;
    lowStockAlertsTriggered: number;
    outboxEventsProcessed: number;
  }> {
    const overdueCount = await this.processOverdueInvoices();
    const warrantyCount = await this.processExpiringWarranties();
    const lowStockCount = await this.processLowStockAlerts();
    const outboxResult = await WorkflowEngine.processOutbox(50);

    return {
      overdueInvoicesProcessed: overdueCount,
      expiringWarrantiesProcessed: warrantyCount,
      lowStockAlertsTriggered: lowStockCount,
      outboxEventsProcessed: outboxResult.processedCount,
    };
  }

  /**
   * Scan and process overdue invoices
   */
  public static async processOverdueInvoices(): Promise<number> {
    const now = new Date();

    try {
      const overdueList = await db
        .select()
        .from(invoices)
        .where(
          and(
            inArray(invoices.status, ['ISSUED', 'PARTIALLY_PAID']),
            lt(invoices.dueDate, now)
          )
        );

      let processed = 0;

      for (const inv of overdueList) {
        // Validate state transition
        if (StateMachine.canTransition('INVOICE', inv.status, 'OVERDUE')) {
          await db
            .update(invoices)
            .set({ status: 'OVERDUE', updatedAt: now })
            .where(eq(invoices.id, inv.id));

          // Emit Domain Event to Outbox
          await WorkflowEngine.publishEvent({
            eventId: crypto.randomUUID(),
            eventType: 'InvoiceOverdue',
            aggregateType: 'INVOICE',
            aggregateId: inv.id,
            payload: {
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              customerId: inv.customerId,
              totalAmount: inv.totalAmount,
              dueDate: inv.dueDate.toISOString(),
            },
            timestamp: now.toISOString(),
          });

          processed++;
        }
      }

      return processed;
    } catch {
      return 0;
    }
  }

  /**
   * Scan and process warranties expiring in configured window (e.g. 30, 15, 7 days)
   */
  public static async processExpiringWarranties(): Promise<number> {
    const notificationConfig = await this.configService.get<NotificationSettings>('NOTIFICATION');
    const reminderDaysList = notificationConfig?.warrantyExpiryReminderDays || [30, 15, 7];
    const now = new Date();

    let totalProcessed = 0;

    for (const days of reminderDaysList) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      const startWindow = new Date(targetDate);
      startWindow.setHours(0, 0, 0, 0);

      const endWindow = new Date(targetDate);
      endWindow.setHours(23, 59, 59, 999);

      try {
        const expiringList = await db
          .select()
          .from(warranties)
          .where(
            and(
              eq(warranties.status, 'ACTIVE'),
              sql`${warranties.endDate} >= ${startWindow} AND ${warranties.endDate} <= ${endWindow}`
            )
          );

        for (const war of expiringList) {
          // Emit Domain Event
          await WorkflowEngine.publishEvent({
            eventId: crypto.randomUUID(),
            eventType: 'WarrantyExpiring',
            aggregateType: 'WARRANTY',
            aggregateId: war.id,
            payload: {
              warrantyId: war.id,
              warrantyNumber: war.warrantyNumber,
              customerId: war.customerId,
              assetId: war.assetId,
              daysRemaining: days,
              endDate: war.endDate.toISOString(),
            },
            timestamp: now.toISOString(),
          });

          totalProcessed++;
        }
      } catch {
        // Fallback for test/offline
      }
    }

    return totalProcessed;
  }

  /**
   * Scan and emit alerts for inventory at or below low stock threshold
   */
  public static async processLowStockAlerts(): Promise<number> {
    const inventoryConfig = await this.configService.get<InventorySettings>('INVENTORY');
    const threshold = inventoryConfig?.lowStockThreshold || 5;
    const now = new Date();

    try {
      const lowStockItems = await db
        .select({
          productId: inventoryBalances.productId,
          currentStock: inventoryBalances.currentStock,
          minimumAlertStock: inventoryBalances.minimumAlertStock,
          productName: products.name,
          sku: products.sku,
        })
        .from(inventoryBalances)
        .innerJoin(products, eq(inventoryBalances.productId, products.id))
        .where(
          or(
            lte(inventoryBalances.currentStock, threshold),
            lte(inventoryBalances.currentStock, inventoryBalances.minimumAlertStock)
          )
        );

      for (const item of lowStockItems) {
        await WorkflowEngine.publishEvent({
          eventId: crypto.randomUUID(),
          eventType: 'LowStockDetected',
          aggregateType: 'INVENTORY',
          aggregateId: item.productId,
          payload: {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            currentStock: item.currentStock,
            threshold,
          },
          timestamp: now.toISOString(),
        });
      }

      return lowStockItems.length;
    } catch {
      return 0;
    }
  }
}
