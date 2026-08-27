import { eq, ne, gt, gte, lt, lte, inArray, notInArray, and, or, sql, ilike, type SQL } from 'drizzle-orm';
import type { SearchEntityType, SearchFilterClause, SearchFilterOperator } from '@crm/types';

export const ALLOWED_FILTER_FIELDS: Record<SearchEntityType, string[]> = {
  customer: ['status', 'customerType', 'city', 'state', 'createdAt'],
  contact: ['isPrimary', 'createdAt'],
  asset: ['status', 'customerId', 'productId', 'serialNumber', 'createdAt'],
  invoice: ['status', 'customerId', 'dueDate', 'invoiceDate', 'totalAmount', 'createdAt'],
  sale: ['status', 'customerId', 'saleDate', 'totalAmount', 'createdAt'],
  payment: ['status', 'paymentMethod', 'paymentDate', 'amount', 'customerId', 'invoiceId', 'createdAt'],
  service: ['status', 'serviceType', 'priority', 'technicianId', 'scheduledDate', 'classification', 'createdAt'],
  job_card: ['status', 'technicianId', 'customerId', 'assetId', 'createdAt'],
  warranty: ['status', 'warrantyType', 'customerId', 'assetId', 'startDate', 'endDate', 'createdAt'],
  product: ['type', 'brand', 'model', 'isActive', 'createdAt'],
  inventory: ['currentStock', 'minimumAlertStock', 'productId'],
  technician: ['status', 'specialization', 'isActive', 'createdAt'],
  inquiry: ['status', 'source', 'priority', 'assignedTo', 'createdAt'],
};

export const ALLOWED_SORT_FIELDS: Set<string> = new Set([
  'createdAt',
  'updatedAt',
  'name',
  'fullName',
  'title',
  'totalAmount',
  'amount',
  'subtotal',
  'dueDate',
  'invoiceDate',
  'saleDate',
  'paymentDate',
  'scheduledDate',
  'startDate',
  'endDate',
  'status',
  'priority',
  'currentStock',
]);

export class FilterEngine {
  /**
   * Validate filter clauses against strict whitelists
   */
  public static validateFilters(
    entityType: SearchEntityType,
    filters: SearchFilterClause[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allowed = new Set(ALLOWED_FILTER_FIELDS[entityType] || []);

    for (const f of filters) {
      if (!allowed.has(f.field)) {
        errors.push(`Field '${f.field}' is not filterable on entity '${entityType}'`);
      }

      if (!f.operator) {
        errors.push(`Filter operator is required for field '${f.field}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate sort key
   */
  public static validateSort(field?: string): boolean {
    if (!field) return true;
    return ALLOWED_SORT_FIELDS.has(field);
  }
}
