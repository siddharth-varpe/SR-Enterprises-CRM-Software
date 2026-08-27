import { sql, or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../database/client';
import { jobCards } from '../../../database/schema/job-cards';
import { customers } from '../../../database/schema/customers';
import { customerAssets } from '../../../database/schema/assets';
import { technicians } from '../../../database/schema/technicians';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class JobCardSearchProvider implements ISearchProvider {
  readonly entityType = 'job_card' as const;
  readonly categoryName = 'Job Cards & Work Orders';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper } = query;
    if (!clean) return [];

    const conditions = [
      ilike(jobCards.jobCardNumber, `%${clean}%`),
      ilike(jobCards.problemReported, `%${clean}%`),
      ilike(jobCards.diagnosis, `%${clean}%`),
      ilike(customers.fullName, `%${clean}%`),
      ilike(customerAssets.serialNumber, `%${clean}%`),
      ilike(technicians.fullName, `%${clean}%`),
    ];

    const records = await db
      .select({
        id: jobCards.id,
        jobCardNumber: jobCards.jobCardNumber,
        status: jobCards.status,
        problemReported: jobCards.problemReported,
        totalCharges: jobCards.totalCharges,
        customerId: customers.id,
        customerName: customers.fullName,
        serialNumber: customerAssets.serialNumber,
        technicianName: technicians.fullName,
      })
      .from(jobCards)
      .innerJoin(customers, eq(jobCards.customerId, customers.id))
      .leftJoin(customerAssets, eq(jobCards.assetId, customerAssets.id))
      .leftJoin(technicians, eq(jobCards.technicianId, technicians.id))
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((jc: any) => {
      let score = 30;
      let matchType: SearchMatchType = 'SECONDARY';

      const jcUpper = (jc.jobCardNumber || '').toUpperCase();
      const serialUpper = (jc.serialNumber || '').toUpperCase();

      if (jcUpper === upper || (serialUpper && serialUpper === upper)) {
        score = 100;
        matchType = 'EXACT';
      } else if (jcUpper.startsWith(upper)) {
        score = 85;
        matchType = 'PREFIX';
      } else if (jcUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      return {
        type: this.entityType,
        id: jc.id,
        title: `Job Card #${jc.jobCardNumber} — ${jc.status}`,
        subtitle: `Customer: ${jc.customerName} • Asset: ${jc.serialNumber || 'N/A'} • Tech: ${jc.technicianName || 'Unassigned'}`,
        matchType,
        score,
        navigationTarget: `/job-cards`,
        metadata: {
          jobCardNumber: jc.jobCardNumber,
          status: jc.status,
          customerId: jc.customerId,
        },
      };
    });

    return results;
  }
}
