import { sql, or, ilike, and } from 'drizzle-orm';
import { db } from '../../../database/client';
import { products } from '../../../database/schema/products';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class ProductSearchProvider implements ISearchProvider {
  readonly entityType = 'product' as const;
  readonly categoryName = 'Products & Spare Parts';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions = [
      ilike(products.sku, `%${clean}%`),
      ilike(products.name, `%${clean}%`),
      ilike(products.brand, `%${clean}%`),
      ilike(products.model, `%${clean}%`),
      ilike(products.description, `%${clean}%`),
    ];

    const records = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        brand: products.brand,
        model: products.model,
        productType: products.productType,
        unitPrice: products.unitPrice,
        isActive: products.isActive,
      })
      .from(products)
      .where(and(sql`${products.archivedAt} IS NULL`, or(...conditions)))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((p: any) => {
      let score = 30;
      let matchType: SearchMatchType = 'SECONDARY';

      const skuUpper = (p.sku || '').toUpperCase();
      const nameUpper = (p.name || '').toUpperCase();
      const brandUpper = (p.brand || '').toUpperCase();

      if (skuUpper === upper) {
        score = 100;
        matchType = 'EXACT';
      } else if (nameUpper === upper) {
        score = 95;
        matchType = 'EXACT';
      } else if (skuUpper.startsWith(upper) || nameUpper.startsWith(upper)) {
        score = 80;
        matchType = 'PREFIX';
      } else if (nameUpper.includes(upper) || brandUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      const formattedPrice = `₹${Number(p.unitPrice || 0).toLocaleString('en-IN')}`;

      return {
        type: this.entityType,
        id: p.id,
        title: p.name,
        subtitle: `SKU: ${p.sku} • ${formattedPrice} • ${p.brand} • ${p.productType}`,
        matchType,
        score,
        navigationTarget: `/sales`,
        metadata: {
          sku: p.sku,
          brand: p.brand,
          unitPrice: p.unitPrice,
          isActive: p.isActive,
        },
      };
    });

    return results;
  }
}
