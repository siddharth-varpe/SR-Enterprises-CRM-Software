import { sql, or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../database/client';
import { inventoryBalances, products } from '../../../database/schema/index';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class InventorySearchProvider implements ISearchProvider {
  readonly entityType = 'inventory' as const;
  readonly categoryName = 'Inventory';

  isAuthorized(context: SearchContext): boolean {
    if (!context.userRole) return true;
    if (context.userRole === 'Technician') {
      return context.permissions?.includes('inventory.view') ?? true;
    }
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions: any[] = [];

    // SKU exact / prefix
    conditions.push(ilike(products.sku, `%${clean}%`));

    // Product Name search
    conditions.push(ilike(products.name, `%${clean}%`));

    // Model search
    conditions.push(ilike(products.model, `%${clean}%`));

    try {
      const records = await db
        .select({
          id: inventoryBalances.id,
          productId: products.id,
          productName: products.name,
          sku: products.sku,
          model: products.model,
          currentStock: inventoryBalances.currentStock,
          minimumAlertStock: inventoryBalances.minimumAlertStock,
        })
        .from(inventoryBalances)
        .innerJoin(products, eq(inventoryBalances.productId, products.id))
        .where(or(...conditions))
        .limit(limit * 2);

      const results: SearchItemResult[] = records.map((inv: any) => {
        let score = 400;
        let matchType: SearchMatchType = 'PARTIAL';

        if (inv.sku.toUpperCase() === upper) {
          score = 1000;
          matchType = 'EXACT';
        } else if (inv.sku.toUpperCase().startsWith(upper)) {
          score = 750;
          matchType = 'PREFIX';
        } else if (inv.productName.toLowerCase().includes(clean.toLowerCase())) {
          score = 600;
          matchType = 'TOKEN';
        }

        const isLow = inv.currentStock <= inv.minimumAlertStock;
        const stockLabel = isLow ? `⚠️ Low Stock: ${inv.currentStock}` : `In Stock: ${inv.currentStock}`;

        return {
          type: 'inventory',
          id: inv.id,
          title: `${inv.productName} (${inv.sku})`,
          subtitle: `${stockLabel} • Min Alert: ${inv.minimumAlertStock}`,
          matchType,
          score,
          navigationTarget: `/inventory`,
          metadata: {
            productId: inv.productId,
            productName: inv.productName,
            sku: inv.sku,
            currentStock: inv.currentStock,
            minimumAlertStock: inv.minimumAlertStock,
          },
        };
      });

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch {
      return [];
    }
  }
}
