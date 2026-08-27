import { sql, or, ilike, eq, and } from 'drizzle-orm';
import { db } from '../../../database/client';
import { customers } from '../../../database/schema/customers';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class CustomerSearchProvider implements ISearchProvider {
  readonly entityType = 'customer' as const;
  readonly categoryName = 'Customers';

  isAuthorized(context: SearchContext): boolean {
    if (!context.userRole) return true;
    // Any internal CRM user with customer view permissions or standard role
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper, digitsOnly } = query;
    if (!clean) return [];

    const conditions: any[] = [];

    // Identifier exact / prefix
    conditions.push(ilike(customers.customerNumber, `%${clean}%`));

    // Full name search
    conditions.push(ilike(customers.fullName, `%${clean}%`));

    // Email search
    if (clean.includes('@') || clean.length >= 3) {
      conditions.push(ilike(customers.email, `%${clean}%`));
    }

    // Phone search (normalized numeric match)
    if (digitsOnly.length >= 3) {
      conditions.push(sql`REPLACE(REPLACE(REPLACE(${customers.phone}, ' ', ''), '-', ''), '+91', '') LIKE ${'%' + digitsOnly + '%'}`);
    }

    // Company name
    conditions.push(ilike(customers.companyName, `%${clean}%`));

    try {
      const records = await db
        .select({
          id: customers.id,
          customerNumber: customers.customerNumber,
          fullName: customers.fullName,
          phone: customers.phone,
          email: customers.email,
          companyName: customers.companyName,
          status: customers.status,
        })
        .from(customers)
        .where(and(sql`${customers.archivedAt} IS NULL`, or(...conditions)))
        .limit(limit * 2);

      const results: SearchItemResult[] = records.map((c: any) => {
        let score = 30;
        let matchType: SearchMatchType = 'SECONDARY';

        const normPhone = (c.phone || '').replace(/\D/g, '');
        const custNumUpper = (c.customerNumber || '').toUpperCase();
        const nameUpper = (c.fullName || '').toUpperCase();
        const emailUpper = (c.email || '').toUpperCase();

        if (custNumUpper === upper || (digitsOnly.length >= 10 && normPhone.endsWith(digitsOnly))) {
          score = 100;
          matchType = 'EXACT';
        } else if (nameUpper.startsWith(upper) || custNumUpper.startsWith(upper)) {
          score = 85;
          matchType = 'PREFIX';
        } else if (nameUpper.includes(upper) || emailUpper.includes(upper)) {
          score = 60;
          matchType = 'PARTIAL';
        }

        return {
          type: 'customer',
          id: c.id,
          title: c.fullName,
          subtitle: `${c.customerNumber} • ${c.phone || 'No phone'} • ${c.companyName || c.status}`,
          matchType,
          score,
          navigationTarget: `/customers/${c.id}`,
          metadata: {
            customerNumber: c.customerNumber,
            phone: c.phone,
            email: c.email,
            companyName: c.companyName,
            status: c.status,
          },
        };
      });

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch {
      return [];
    }
  }
}
