import { sql, or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../database/client';
import { services } from '../../../database/schema/services';
import { customers } from '../../../database/schema/customers';
import { customerAssets } from '../../../database/schema/assets';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class ServiceSearchProvider implements ISearchProvider {
  readonly entityType = 'service' as const;
  readonly categoryName = 'Services & Maintenance';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions = [
      ilike(services.serviceNumber, `%${clean}%`),
      ilike(services.serviceType, `%${clean}%`),
      ilike(customers.fullName, `%${clean}%`),
      ilike(customerAssets.serialNumber, `%${clean}%`),
      ilike(services.customerNotes, `%${clean}%`),
    ];

    const records = await db
      .select({
        id: services.id,
        serviceNumber: services.serviceNumber,
        serviceType: services.serviceType,
        status: services.status,
        priority: services.priority,
        scheduledDate: services.scheduledDate,
        customerId: customers.id,
        customerName: customers.fullName,
        serialNumber: customerAssets.serialNumber,
      })
      .from(services)
      .innerJoin(customers, eq(services.customerId, customers.id))
      .leftJoin(customerAssets, eq(services.assetId, customerAssets.id))
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((srv: any) => {
      let score = 30;
      let matchType: SearchMatchType = 'SECONDARY';

      const srvUpper = (srv.serviceNumber || '').toUpperCase();
      const typeUpper = (srv.serviceType || '').toUpperCase();
      const serialUpper = (srv.serialNumber || '').toUpperCase();

      if (srvUpper === upper || (serialUpper && serialUpper === upper)) {
        score = 100;
        matchType = 'EXACT';
      } else if (srvUpper.startsWith(upper)) {
        score = 85;
        matchType = 'PREFIX';
      } else if (srvUpper.includes(upper) || typeUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      const formattedType = (srv.serviceType || 'RO Service').replace(/_/g, ' ');

      return {
        type: this.entityType,
        id: srv.id,
        title: `Service #${srv.serviceNumber} — ${formattedType}`,
        subtitle: `Customer: ${srv.customerName} • Asset: ${srv.serialNumber || 'N/A'} • ${srv.status}`,
        matchType,
        score,
        navigationTarget: `/services`,
        metadata: {
          serviceNumber: srv.serviceNumber,
          serviceType: srv.serviceType,
          status: srv.status,
          priority: srv.priority,
          customerId: srv.customerId,
        },
      };
    });

    return results;
  }
}
