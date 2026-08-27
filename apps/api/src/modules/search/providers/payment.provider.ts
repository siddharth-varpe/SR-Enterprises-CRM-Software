import { sql, or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../database/client';
import { payments } from '../../../database/schema/payments';
import { invoices } from '../../../database/schema/invoices';
import { customers } from '../../../database/schema/customers';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class PaymentSearchProvider implements ISearchProvider {
  readonly entityType = 'payment' as const;
  readonly categoryName = 'Payments & Ledger';

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
      ilike(payments.paymentNumber, `%${clean}%`),
      ilike(payments.referenceNumber, `%${clean}%`),
      ilike(invoices.invoiceNumber, `%${clean}%`),
      ilike(customers.fullName, `%${clean}%`),
    ];

    const records = await db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        referenceNumber: payments.referenceNumber,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        status: payments.status,
        paymentDate: payments.paymentDate,
        invoiceNumber: invoices.invoiceNumber,
        customerId: customers.id,
        customerName: customers.fullName,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(customers, eq(payments.customerId, customers.id))
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((pay: any) => {
      let score = 35;
      let matchType: SearchMatchType = 'SECONDARY';

      const payUpper = (pay.paymentNumber || '').toUpperCase();
      const refUpper = (pay.referenceNumber || '').toUpperCase();
      const invUpper = (pay.invoiceNumber || '').toUpperCase();

      if (payUpper === upper || (refUpper && refUpper === upper)) {
        score = 100;
        matchType = 'EXACT';
      } else if (payUpper.startsWith(upper) || invUpper === upper) {
        score = 85;
        matchType = 'PREFIX';
      } else if (payUpper.includes(upper) || invUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      const formattedAmount = `₹${Number(pay.amount || 0).toLocaleString('en-IN')}`;

      return {
        type: this.entityType,
        id: pay.id,
        title: `Payment ${pay.paymentNumber} — ${formattedAmount}`,
        subtitle: `For: ${pay.invoiceNumber} • Paid by: ${pay.customerName} • ${pay.paymentMethod}`,
        matchType,
        score,
        navigationTarget: `/payments`,
        metadata: {
          paymentNumber: pay.paymentNumber,
          amount: pay.amount,
          status: pay.status,
          invoiceNumber: pay.invoiceNumber,
        },
      };
    });

    return results;
  }
}
