import { sql, or, ilike, eq, and } from 'drizzle-orm';
import { db } from '../../../database/client';
import { invoices } from '../../../database/schema/invoices';
import { customers } from '../../../database/schema/customers';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class InvoiceSearchProvider implements ISearchProvider {
  readonly entityType = 'invoice' as const;
  readonly categoryName = 'Invoices & Billing';

  isAuthorized(context: SearchContext): boolean {
    if (!context.userRole) return false;
    const roleStr = String(context.userRole).toUpperCase().replace(/\s+/g, '_');
    return ['ADMIN', 'SUPER_ADMIN', 'SUPER ADMIN', 'MANAGER', 'OWNER', 'EXECUTIVE', 'STAFF'].includes(roleStr);
  }

  async search(query: NormalizedQuery, limit: number, context: SearchContext): Promise<SearchItemResult[]> {
    if (!this.isAuthorized(context)) return [];

    const { clean, upper } = query;
    if (!clean) return [];

    const conditions = [
      ilike(invoices.invoiceNumber, `%${clean}%`),
      ilike(customers.fullName, `%${clean}%`),
    ];

    const records = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        dueDate: invoices.dueDate,
        customerId: invoices.customerId,
        customerName: customers.fullName,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(sql`${invoices.cancelledAt} IS NULL`, or(...conditions)))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((inv: any) => {
      let score = 35;
      let matchType: SearchMatchType = 'SECONDARY';

      const invUpper = (inv.invoiceNumber || '').toUpperCase();
      const custUpper = (inv.customerName || '').toUpperCase();

      if (invUpper === upper) {
        score = 100;
        matchType = 'EXACT';
      } else if (invUpper.startsWith(upper)) {
        score = 85;
        matchType = 'PREFIX';
      } else if (invUpper.includes(upper) || custUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      const formattedAmount = `₹${Number(inv.totalAmount || 0).toLocaleString('en-IN')}`;

      return {
        type: this.entityType,
        id: inv.id,
        title: `Invoice ${inv.invoiceNumber} — ${formattedAmount}`,
        subtitle: `Billed to: ${inv.customerName} • Status: ${inv.status}`,
        matchType,
        score,
        navigationTarget: `/invoices`,
        metadata: {
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          status: inv.status,
          customerId: inv.customerId,
        },
      };
    });

    return results;
  }
}
