import { sql, or, ilike, and } from 'drizzle-orm';
import { db } from '../../../database/client';
import { sales, customers } from '../../../database/schema/index';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class SalesSearchProvider implements ISearchProvider {
  readonly entityType = 'sale' as const;
  readonly categoryName = 'Sales';

  isAuthorized(context: SearchContext): boolean {
    if (!context.userRole) return true;
    if (context.userRole === 'Technician') {
      return context.permissions?.includes('sales.view') ?? false;
    }
    return true;
  }

  async search(query: NormalizedQuery, limit: number, context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions: any[] = [];

    // Sale Number exact / prefix
    conditions.push(ilike(sales.saleNumber, `%${clean}%`));

    // Customer Name search via join
    conditions.push(ilike(customers.fullName, `%${clean}%`));

    try {
      const records = await db
        .select({
          id: sales.id,
          saleNumber: sales.saleNumber,
          customerId: sales.customerId,
          customerName: customers.fullName,
          totalAmount: sales.totalAmount,
          status: sales.status,
          saleDate: sales.saleDate,
        })
        .from(sales)
        .leftJoin(customers, sql`${sales.customerId} = ${customers.id}`)
        .where(or(...conditions))
        .limit(limit * 2);

      const canViewFinancials = context.userRole !== 'Technician' || context.permissions?.includes('sales.view');

      const results: SearchItemResult[] = records.map((s: any) => {
        let score = 400;
        let matchType: SearchMatchType = 'PARTIAL';

        if (s.saleNumber.toUpperCase() === upper) {
          score = 1000;
          matchType = 'EXACT';
        } else if (s.saleNumber.toUpperCase().startsWith(upper)) {
          score = 750;
          matchType = 'PREFIX';
        } else if (s.customerName && s.customerName.toLowerCase().includes(clean.toLowerCase())) {
          score = 600;
          matchType = 'TOKEN';
        }

        const formattedAmount = canViewFinancials ? `₹${Number(s.totalAmount).toLocaleString('en-IN')}` : '[REDACTED]';

        return {
          type: 'sale',
          id: s.id,
          title: s.saleNumber,
          subtitle: `${s.customerName || 'Customer'} • ${formattedAmount} • ${s.status}`,
          matchType,
          score,
          navigationTarget: `/sales/${s.id}`,
          metadata: {
            saleNumber: s.saleNumber,
            customerName: s.customerName,
            status: s.status,
            totalAmount: canViewFinancials ? s.totalAmount : undefined,
            saleDate: s.saleDate,
          },
        };
      });

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch {
      return [];
    }
  }
}
