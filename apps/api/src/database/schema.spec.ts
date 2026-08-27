import { describe, it, expect } from 'vitest';
import * as schema from './schema';
import { getTableColumns } from 'drizzle-orm';

describe('Phase 1 — Database Domain Schema Verification', () => {
  it('should export all 25 core domain tables', () => {
    const expectedTables = [
      'users',
      'roles',
      'permissions',
      'rolePermissions',
      'customers',
      'customerAddresses',
      'products',
      'customerAssets',
      'sales',
      'saleItems',
      'invoices',
      'invoiceItems',
      'payments',
      'warranties',
      'warrantyEvents',
      'services',
      'serviceSchedules',
      'jobCards',
      'technicians',
      'inquiries',
      'notifications',
      'customerActivities',
      'auditLogs',
      'documents',
      'businessSequences',
    ];

    for (const tableName of expectedTables) {
      expect(schema).toHaveProperty(tableName);
      expect((schema as Record<string, any>)[tableName]).toBeDefined();
    }
  });

  it('should verify customer table structure and constraints', () => {
    const columns = getTableColumns(schema.customers);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('customerNumber');
    expect(columns).toHaveProperty('fullName');
    expect(columns).toHaveProperty('phone');
    expect(columns).toHaveProperty('email');
    expect(columns).toHaveProperty('customerType');
    expect(columns).toHaveProperty('status');
    expect(columns).toHaveProperty('createdAt');
    expect(columns).toHaveProperty('updatedAt');
    expect(columns).toHaveProperty('archivedAt');
  });

  it('should verify products table structure and numeric precision', () => {
    const columns = getTableColumns(schema.products);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('sku');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('productType');
    expect(columns).toHaveProperty('unitPrice');
    expect(columns).toHaveProperty('taxRatePercent');
    expect(columns).toHaveProperty('defaultWarrantyMonths');
    expect(columns).toHaveProperty('defaultServiceIntervalMonths');
    expect(columns).toHaveProperty('isActive');
  });

  it('should verify customer assets table structure', () => {
    const columns = getTableColumns(schema.customerAssets);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('assetNumber');
    expect(columns).toHaveProperty('customerId');
    expect(columns).toHaveProperty('productId');
    expect(columns).toHaveProperty('assetType');
    expect(columns).toHaveProperty('serialNumber');
    expect(columns).toHaveProperty('purchaseDate');
    expect(columns).toHaveProperty('status');
  });

  it('should verify sales and sale items immutable snapshot fields', () => {
    const saleCols = getTableColumns(schema.sales);
    expect(saleCols).toHaveProperty('saleNumber');
    expect(saleCols).toHaveProperty('customerId');
    expect(saleCols).toHaveProperty('subtotal');
    expect(saleCols).toHaveProperty('discountAmount');
    expect(saleCols).toHaveProperty('taxAmount');
    expect(saleCols).toHaveProperty('totalAmount');

    const itemCols = getTableColumns(schema.saleItems);
    expect(itemCols).toHaveProperty('saleId');
    expect(itemCols).toHaveProperty('productId');
    expect(itemCols).toHaveProperty('productNameSnapshot');
    expect(itemCols).toHaveProperty('skuSnapshot');
    expect(itemCols).toHaveProperty('quantity');
    expect(itemCols).toHaveProperty('unitPriceSnapshot');
    expect(itemCols).toHaveProperty('taxRatePercent');
    expect(itemCols).toHaveProperty('lineTotal');
  });

  it('should verify invoices and payments structure', () => {
    const invCols = getTableColumns(schema.invoices);
    expect(invCols).toHaveProperty('invoiceNumber');
    expect(invCols).toHaveProperty('customerId');
    expect(invCols).toHaveProperty('invoiceDate');
    expect(invCols).toHaveProperty('dueDate');
    expect(invCols).toHaveProperty('status');
    expect(invCols).toHaveProperty('totalAmount');

    const payCols = getTableColumns(schema.payments);
    expect(payCols).toHaveProperty('paymentNumber');
    expect(payCols).toHaveProperty('customerId');
    expect(payCols).toHaveProperty('invoiceId');
    expect(payCols).toHaveProperty('amount');
    expect(payCols).toHaveProperty('paymentMethod');
    expect(payCols).toHaveProperty('status');
  });

  it('should verify services, service schedules and job cards structure', () => {
    const srvCols = getTableColumns(schema.services);
    expect(srvCols).toHaveProperty('serviceNumber');
    expect(srvCols).toHaveProperty('customerId');
    expect(srvCols).toHaveProperty('assetId');
    expect(srvCols).toHaveProperty('serviceType');
    expect(srvCols).toHaveProperty('serviceClassification');
    expect(srvCols).toHaveProperty('scheduledDate');
    expect(srvCols).toHaveProperty('status');

    const schedCols = getTableColumns(schema.serviceSchedules);
    expect(schedCols).toHaveProperty('customerId');
    expect(schedCols).toHaveProperty('assetId');
    expect(schedCols).toHaveProperty('warrantyId');
    expect(schedCols).toHaveProperty('scheduleIndex');
    expect(schedCols).toHaveProperty('totalSchedules');
    expect(schedCols).toHaveProperty('plannedDate');
    expect(schedCols).toHaveProperty('targetMonth');

    const jcCols = getTableColumns(schema.jobCards);
    expect(jcCols).toHaveProperty('jobCardNumber');
    expect(jcCols).toHaveProperty('serviceId');
    expect(jcCols).toHaveProperty('laborCharges');
    expect(jcCols).toHaveProperty('partsCharges');
    expect(jcCols).toHaveProperty('totalCharges');
    expect(jcCols).toHaveProperty('status');
  });

  it('should verify warranties and warranty events structure', () => {
    const warCols = getTableColumns(schema.warranties);
    expect(warCols).toHaveProperty('warrantyNumber');
    expect(warCols).toHaveProperty('customerId');
    expect(warCols).toHaveProperty('assetId');
    expect(warCols).toHaveProperty('warrantyType');
    expect(warCols).toHaveProperty('startDate');
    expect(warCols).toHaveProperty('endDate');
    expect(warCols).toHaveProperty('durationMonths');
    expect(warCols).toHaveProperty('status');

    const eventCols = getTableColumns(schema.warrantyEvents);
    expect(eventCols).toHaveProperty('warrantyId');
    expect(eventCols).toHaveProperty('eventType');
    expect(eventCols).toHaveProperty('eventDate');
    expect(eventCols).toHaveProperty('replacementAssetId');
  });

  it('should verify audit logs, activities, inquiries, documents, and notifications', () => {
    expect(getTableColumns(schema.auditLogs)).toHaveProperty('action');
    expect(getTableColumns(schema.customerActivities)).toHaveProperty('eventType');
    expect(getTableColumns(schema.inquiries)).toHaveProperty('inquiryNumber');
    expect(getTableColumns(schema.documents)).toHaveProperty('fileKey');
    expect(getTableColumns(schema.notifications)).toHaveProperty('notificationType');
    expect(getTableColumns(schema.businessSequences)).toHaveProperty('currentVal');
  });
});
