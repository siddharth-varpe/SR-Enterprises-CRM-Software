/**
 * Central Data Export Service
 * Orchestrates multi-domain data query, CSV/JSON serialization, formula injection sanitization, and RBAC isolation.
 */

import { db } from '../../database/client';
import { formatCsvRow } from '../../security/csv-sanitizer';
import { auditLogs } from '../../database/schema/audit';
import type { ExportEntityType, ExportFormat, ExportFilterParams, UserRole } from '@crm/types';
import { desc, asc, eq, and, or, gte, lte, ilike, inArray } from 'drizzle-orm';
import { customers, customerAddresses } from '../../database/schema/customers';
import { products } from '../../database/schema/products';
import { inventoryBalances } from '../../database/schema/inventory';
import { sales } from '../../database/schema/sales';
import { invoices } from '../../database/schema/invoices';
import { payments } from '../../database/schema/payments';
import { services } from '../../database/schema/services';
import { jobCards } from '../../database/schema/job-cards';
import { warranties } from '../../database/schema/warranties';
import { technicians } from '../../database/schema/technicians';
import { inquiries } from '../../database/schema/inquiries';

export interface ExportContext {
  userId?: string;
  userRole?: string | UserRole;
  ipAddress?: string;
}

export interface GeneratedExportFile {
  filename: string;
  mimeType: string;
  content: string;
  totalRecords: number;
}

export class DataExportService {
  /**
   * Check if role has financial metrics & exports viewing permissions
   */
  checkFinancialPermission(userRole?: string | UserRole): boolean {
    if (!userRole) return false;
    const roleStr = String(userRole).toUpperCase().replace(/\s+/g, '_');
    return ['ADMIN', 'SUPER_ADMIN', 'SUPER ADMIN', 'MANAGER', 'OWNER', 'EXECUTIVE', 'STAFF'].includes(roleStr);
  }

  async exportData(
    entityType: ExportEntityType,
    format: ExportFormat = 'csv',
    filters?: ExportFilterParams,
    context?: ExportContext
  ): Promise<GeneratedExportFile> {
    const limit = Math.min(filters?.limit || 50000, 100000);

    // RBAC Security Check for Financial Exports
    if (['sales', 'invoices', 'payments'].includes(entityType)) {
      if (!this.checkFinancialPermission(context?.userRole)) {
        throw new Error(`Unauthorized: User role '${context?.userRole}' cannot export financial ${entityType} records.`);
      }
    }

    let records: Array<Record<string, any>> = [];
    let headers: string[] = [];

    switch (entityType) {
      case 'customers': {
        headers = [
          'Customer Number',
          'Full Name',
          'Phone',
          'Email',
          'Customer Type',
          'Company Name',
          'GST Number',
          'Address',
          'City',
          'State',
          'Pincode',
          'Status',
          'Created At',
        ];

        const conditions: any[] = [];
        if (filters?.status && filters.status !== 'ALL') {
          conditions.push(eq(customers.status, filters.status as any));
        }
        if (filters?.customerType && filters.customerType !== 'ALL') {
          conditions.push(eq(customers.customerType, filters.customerType as any));
        }
        if (filters?.city && filters.city !== 'ALL') {
          const cityQuery = db
            .select({ customerId: customerAddresses.customerId })
            .from(customerAddresses)
            .where(ilike(customerAddresses.city, `%${filters.city.trim()}%`));
          conditions.push(inArray(customers.id, cityQuery));
        }
        if (filters?.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          conditions.push(gte(customers.createdAt, start));
        }
        if (filters?.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          conditions.push(lte(customers.createdAt, end));
        }
        if (filters?.search && filters.search.trim()) {
          const pattern = `%${filters.search.trim()}%`;
          conditions.push(
            or(
              ilike(customers.fullName, pattern),
              ilike(customers.phone, pattern),
              ilike(customers.email, pattern),
              ilike(customers.customerNumber, pattern),
              ilike(customers.companyName, pattern)
            )
          );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const direction = filters?.sortOrder === 'asc' ? asc : desc;
        const orderBy = [direction(customers.createdAt), desc(customers.id)];

        const data = await db.query.customers.findMany({
          where: whereClause,
          limit,
          orderBy,
          with: {
            addresses: {
              where: eq(customerAddresses.isDefault, true),
              limit: 1,
            },
          },
        });

        records = data.map((c) => {
          const defaultAddr = c.addresses?.[0];
          return {
            'Customer Number': c.customerNumber,
            'Full Name': c.fullName,
            'Phone': c.phone,
            'Email': c.email || '',
            'Customer Type': c.customerType,
            'Company Name': c.companyName || '',
            'GST Number': c.gstNumber || '',
            'Address': defaultAddr ? defaultAddr.addressLine1 : '',
            'City': defaultAddr ? defaultAddr.city : '',
            'State': defaultAddr ? defaultAddr.state : '',
            'Pincode': defaultAddr ? defaultAddr.postalCode : '',
            'Status': c.status,
            'Created At': c.createdAt?.toISOString() || '',
          };
        });
        break;
      }

      case 'products': {
        headers = [
          'SKU',
          'Name',
          'Type',
          'Brand',
          'Model',
          'Unit Price (INR)',
          'Tax Rate (%)',
          'Warranty (Months)',
          'Service Interval (Months)',
          'Active',
        ];
        const data = await db.query.products.findMany({
          limit,
          orderBy: [desc(products.createdAt)],
        });
        records = data.map((p) => ({
          'SKU': p.sku,
          'Name': p.name,
          'Type': p.productType,
          'Brand': p.brand,
          'Model': p.model || '',
          'Unit Price (INR)': p.unitPrice,
          'Tax Rate (%)': p.taxRatePercent,
          'Warranty (Months)': p.defaultWarrantyMonths,
          'Service Interval (Months)': p.defaultServiceIntervalMonths,
          'Active': p.isActive ? 'YES' : 'NO',
        }));
        break;
      }

      case 'inventory': {
        headers = ['Product SKU', 'Product Name', 'Current Stock', 'Min Alert Stock', 'Last Updated'];
        const data = await db
          .select({
            sku: products.sku,
            name: products.name,
            currentStock: inventoryBalances.currentStock,
            minimumAlertStock: inventoryBalances.minimumAlertStock,
            updatedAt: inventoryBalances.updatedAt,
          })
          .from(inventoryBalances)
          .leftJoin(products, eq(inventoryBalances.productId, products.id))
          .limit(limit);
        records = data.map((b) => ({
          'Product SKU': b.sku || '',
          'Product Name': b.name || '',
          'Current Stock': b.currentStock,
          'Min Alert Stock': b.minimumAlertStock,
          'Last Updated': b.updatedAt?.toISOString() || '',
        }));
        break;
      }

      case 'sales': {
        headers = [
          'Sale Number',
          'Customer Name',
          'Customer Phone',
          'Sale Date',
          'Subtotal (INR)',
          'Tax (INR)',
          'Discount (INR)',
          'Total Amount (INR)',
          'Status',
        ];
        const data = await db.query.sales.findMany({
          limit,
          orderBy: [desc(sales.createdAt)],
          with: { customer: true },
        });
        records = data.map((s) => ({
          'Sale Number': s.saleNumber,
          'Customer Name': s.customer?.fullName || '',
          'Customer Phone': s.customer?.phone || '',
          'Sale Date': s.saleDate?.toISOString().split('T')[0] || '',
          'Subtotal (INR)': s.subtotal,
          'Tax (INR)': s.taxAmount,
          'Discount (INR)': s.discountAmount,
          'Total Amount (INR)': s.totalAmount,
          'Status': s.status,
        }));
        break;
      }

      case 'invoices': {
        headers = [
          'Invoice Number',
          'Customer Name',
          'Customer Phone',
          'Invoice Date',
          'Due Date',
          'Subtotal (INR)',
          'Tax (INR)',
          'Total Amount (INR)',
          'Status',
        ];
        const data = await db.query.invoices.findMany({
          limit,
          orderBy: [desc(invoices.createdAt)],
          with: { customer: true },
        });
        records = data.map((inv) => ({
          'Invoice Number': inv.invoiceNumber,
          'Customer Name': inv.customer?.fullName || '',
          'Customer Phone': inv.customer?.phone || '',
          'Invoice Date': inv.invoiceDate?.toISOString().split('T')[0] || '',
          'Due Date': inv.dueDate?.toISOString().split('T')[0] || '',
          'Subtotal (INR)': inv.subtotal,
          'Tax (INR)': inv.taxAmount,
          'Total Amount (INR)': inv.totalAmount,
          'Status': inv.status,
        }));
        break;
      }

      case 'payments': {
        headers = [
          'Payment Number',
          'Reference Number',
          'Invoice Number',
          'Customer Name',
          'Payment Date',
          'Amount (INR)',
          'Payment Method',
          'Status',
        ];
        const data = await db.query.payments.findMany({
          limit,
          orderBy: [desc(payments.createdAt)],
          with: { invoice: { with: { customer: true } } },
        });
        records = data.map((pay) => ({
          'Payment Number': pay.paymentNumber,
          'Reference Number': pay.referenceNumber || '',
          'Invoice Number': pay.invoice?.invoiceNumber || '',
          'Customer Name': pay.invoice?.customer?.fullName || '',
          'Payment Date': pay.paymentDate?.toISOString().split('T')[0] || '',
          'Amount (INR)': pay.amount,
          'Payment Method': pay.paymentMethod,
          'Status': pay.status,
        }));
        break;
      }

      case 'services': {
        headers = [
          'Service Number',
          'Service Type',
          'Customer Name',
          'Customer Phone',
          'Asset Serial',
          'Scheduled Date',
          'Status',
          'Priority',
        ];
        const data = await db.query.services.findMany({
          limit,
          orderBy: [desc(services.createdAt)],
          with: { customer: true, asset: true },
        });
        records = data.map((srv) => ({
          'Service Number': srv.serviceNumber,
          'Service Type': srv.serviceType,
          'Customer Name': srv.customer?.fullName || '',
          'Customer Phone': srv.customer?.phone || '',
          'Asset Serial': srv.asset?.serialNumber || '',
          'Scheduled Date': srv.scheduledDate?.toISOString().split('T')[0] || '',
          'Status': srv.status,
          'Priority': srv.priority,
        }));
        break;
      }

      case 'job_cards': {
        headers = [
          'Job Card Number',
          'Customer Name',
          'Technician Name',
          'Status',
          'Problem Reported',
          'Diagnosis',
          'Completed At',
        ];
        const data = await db.query.jobCards.findMany({
          limit,
          orderBy: [desc(jobCards.createdAt)],
          with: { customer: true, technician: true },
        });
        records = data.map((jc) => ({
          'Job Card Number': jc.jobCardNumber,
          'Customer Name': jc.customer?.fullName || '',
          'Technician Name': jc.technician?.fullName || 'Unassigned',
          'Status': jc.status,
          'Problem Reported': jc.problemReported || '',
          'Diagnosis': jc.diagnosis || '',
          'Completed At': jc.completedAt?.toISOString() || '',
        }));
        break;
      }

      case 'warranties': {
        headers = [
          'Warranty Number',
          'Customer Name',
          'Customer Phone',
          'Asset Serial',
          'Warranty Type',
          'Start Date',
          'End Date',
          'Duration (Months)',
          'Status',
        ];
        const data = await db.query.warranties.findMany({
          limit,
          orderBy: [desc(warranties.createdAt)],
          with: { customer: true, asset: true },
        });
        records = data.map((w) => ({
          'Warranty Number': w.warrantyNumber,
          'Customer Name': w.customer?.fullName || '',
          'Customer Phone': w.customer?.phone || '',
          'Asset Serial': w.asset?.serialNumber || '',
          'Warranty Type': w.warrantyType,
          'Start Date': w.startDate?.toISOString().split('T')[0] || '',
          'End Date': w.endDate?.toISOString().split('T')[0] || '',
          'Duration (Months)': w.durationMonths,
          'Status': w.status,
        }));
        break;
      }

      case 'technicians': {
        headers = ['Full Name', 'Phone', 'Email', 'Status', 'Address'];
        const data = await db.query.technicians.findMany({
          limit,
        });
        records = data.map((t) => ({
          'Full Name': t.fullName,
          'Phone': t.phone,
          'Email': t.email || '',
          'Status': t.status,
          'Address': t.address || '',
        }));
        break;
      }

      case 'inquiries': {
        headers = [
          'Inquiry Number',
          'Name',
          'Phone',
          'Email',
          'City',
          'Source',
          'Type',
          'Status',
          'Created At',
        ];
        const data = await db.query.inquiries.findMany({
          limit,
          orderBy: [desc(inquiries.createdAt)],
        });
        records = data.map((inq) => ({
          'Inquiry Number': inq.inquiryNumber,
          'Name': inq.name,
          'Phone': inq.phone,
          'Email': inq.email || '',
          'City': inq.city || '',
          'Source': inq.source,
          'Type': inq.inquiryType,
          'Status': inq.status,
          'Created At': inq.createdAt?.toISOString() || '',
        }));
        break;
      }

      default:
        throw new Error(`Unsupported export entity: '${entityType}'`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `srm_${entityType}_export_${timestamp}.${format}`;

    let content = '';
    let mimeType = 'text/csv; charset=utf-8';

    if (format === 'json') {
      content = JSON.stringify(records, null, 2);
      mimeType = 'application/json; charset=utf-8';
    } else {
      // Build CSV with formula injection sanitization
      let csvString = headers.join(',') + '\n';
      for (const row of records) {
        const rowValues = headers.map((h) => row[h]);
        csvString += formatCsvRow(rowValues);
      }
      content = csvString;
    }

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        actorId: context?.userId as any,
        actorUsername: String(context?.userRole || 'SYSTEM'),
        action: 'CREATE',
        entityType: 'DATA_EXPORT',
        entityId: filename,
        afterState: {
          entityType,
          format,
          recordCount: records.length,
        },
        changeReason: `Exported ${records.length} ${entityType} records in ${format.toUpperCase()} format`,
        ipAddress: context?.ipAddress,
      });
    } catch {}

    return {
      filename,
      mimeType,
      content,
      totalRecords: records.length,
    };
  }
}

export const dataExportService = new DataExportService();
