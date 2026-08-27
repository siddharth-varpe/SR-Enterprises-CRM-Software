import { sql, or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../database/client';
import { customerAssets } from '../../../database/schema/assets';
import { products } from '../../../database/schema/products';
import { customers } from '../../../database/schema/customers';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class AssetSearchProvider implements ISearchProvider {
  readonly entityType = 'asset' as const;
  readonly categoryName = 'Assets & Serial Numbers';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions: any[] = [];

    // Serial number exact / partial
    conditions.push(ilike(customerAssets.serialNumber, `%${clean}%`));
    // Asset number
    conditions.push(ilike(customerAssets.assetNumber, `%${clean}%`));
    // Custom name
    conditions.push(ilike(customerAssets.customName, `%${clean}%`));
    // Product model / name
    conditions.push(ilike(products.name, `%${clean}%`));
    // Customer name
    conditions.push(ilike(customers.fullName, `%${clean}%`));

    const records = await db
      .select({
        id: customerAssets.id,
        assetNumber: customerAssets.assetNumber,
        serialNumber: customerAssets.serialNumber,
        customName: customerAssets.customName,
        status: customerAssets.status,
        customerId: customerAssets.customerId,
        customerName: customers.fullName,
        productName: products.name,
      })
      .from(customerAssets)
      .innerJoin(products, eq(customerAssets.productId, products.id))
      .innerJoin(customers, eq(customerAssets.customerId, customers.id))
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((a: any) => {
      let score = 35;
      let matchType: SearchMatchType = 'SECONDARY';

      const serialUpper = (a.serialNumber || '').toUpperCase();
      const assetNumUpper = (a.assetNumber || '').toUpperCase();
      const prodNameUpper = (a.productName || '').toUpperCase();

      if (serialUpper === upper || assetNumUpper === upper) {
        score = 100;
        matchType = 'EXACT';
      } else if (serialUpper.startsWith(upper) || assetNumUpper.startsWith(upper)) {
        score = 85;
        matchType = 'PREFIX';
      } else if (serialUpper.includes(upper) || prodNameUpper.includes(upper)) {
        score = 60;
        matchType = 'PARTIAL';
      }

      return {
        type: this.entityType,
        id: a.id,
        title: `${a.customName || a.productName || 'Asset'} — ${a.serialNumber || a.assetNumber}`,
        subtitle: `Asset #${a.assetNumber} • Owner: ${a.customerName} • ${a.status}`,
        matchType,
        score,
        navigationTarget: `/customers/${a.customerId}`,
        metadata: {
          assetNumber: a.assetNumber,
          serialNumber: a.serialNumber,
          customerId: a.customerId,
          status: a.status,
        },
      };
    });

    return results;
  }
}
