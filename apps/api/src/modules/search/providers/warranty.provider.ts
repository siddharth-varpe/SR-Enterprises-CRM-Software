import { sql, or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../database/client';
import { warranties } from '../../../database/schema/warranties';
import { customers } from '../../../database/schema/customers';
import { customerAssets } from '../../../database/schema/assets';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class WarrantySearchProvider implements ISearchProvider {
  readonly entityType = 'warranty' as const;
  readonly categoryName = 'Warranty & Claims';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions = [
      ilike(warranties.warrantyNumber, `%${clean}%`),
      ilike(customers.fullName, `%${clean}%`),
      ilike(customerAssets.serialNumber, `%${clean}%`),
      ilike(warranties.terms, `%${clean}%`),
    ];

    const records = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        status: warranties.status,
        warrantyType: warranties.warrantyType,
        endDate: warranties.endDate,
        customerId: customers.id,
        customerName: customers.fullName,
        serialNumber: customerAssets.serialNumber,
      })
      .from(warranties)
      .innerJoin(customers, eq(warranties.customerId, customers.id))
      .leftJoin(customerAssets, eq(warranties.assetId, customerAssets.id))
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((w: any) => {
      let score = 30;
      let matchType: SearchMatchType = 'SECONDARY';

      const warUpper = (w.warrantyNumber || '').toUpperCase();
      const serialUpper = (w.serialNumber || '').toUpperCase();

      if (warUpper === upper || (serialUpper && serialUpper === upper)) {
        score = 100;
        matchType = 'EXACT';
      } else if (warUpper.startsWith(upper)) {
        score = 85;
        matchType = 'PREFIX';
      } else if (warUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      const formattedEndDate = w.endDate ? new Date(w.endDate).toLocaleDateString('en-IN') : 'N/A';

      return {
        type: this.entityType,
        id: w.id,
        title: `Warranty #${w.warrantyNumber} — ${w.status}`,
        subtitle: `Customer: ${w.customerName} • Asset: ${w.serialNumber || 'N/A'} • Exp: ${formattedEndDate}`,
        matchType,
        score,
        navigationTarget: `/warranty`,
        metadata: {
          warrantyNumber: w.warrantyNumber,
          status: w.status,
          customerId: w.customerId,
        },
      };
    });

    return results;
  }
}
