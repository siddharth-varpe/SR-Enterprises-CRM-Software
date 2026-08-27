import { sql, or, ilike } from 'drizzle-orm';
import { db } from '../../../database/client';
import { technicians } from '../../../database/schema/technicians';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class TechnicianSearchProvider implements ISearchProvider {
  readonly entityType = 'technician' as const;
  readonly categoryName = 'Technicians & Field Force';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper, digitsOnly } = query;
    if (!clean) return [];

    const conditions = [
      ilike(technicians.fullName, `%${clean}%`),
      ilike(technicians.address, `%${clean}%`),
    ];

    if (clean.includes('@') || clean.length >= 3) {
      conditions.push(ilike(technicians.email, `%${clean}%`));
    }

    if (digitsOnly.length >= 3) {
      conditions.push(sql`REPLACE(REPLACE(REPLACE(${technicians.phone}, ' ', ''), '-', ''), '+91', '') LIKE ${'%' + digitsOnly + '%'}`);
    }

    const records = await db
      .select({
        id: technicians.id,
        fullName: technicians.fullName,
        phone: technicians.phone,
        email: technicians.email,
        status: technicians.status,
        skills: technicians.skills,
      })
      .from(technicians)
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((t: any) => {
      let score = 30;
      let matchType: SearchMatchType = 'SECONDARY';

      const nameUpper = (t.fullName || '').toUpperCase();
      const normPhone = (t.phone || '').replace(/\D/g, '');

      if (nameUpper === upper || (digitsOnly.length >= 10 && normPhone.endsWith(digitsOnly))) {
        score = 100;
        matchType = 'EXACT';
      } else if (nameUpper.startsWith(upper)) {
        score = 85;
        matchType = 'PREFIX';
      } else if (nameUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      return {
        type: this.entityType,
        id: t.id,
        title: t.fullName,
        subtitle: `Technician • ${t.phone} • Status: ${t.status}`,
        matchType,
        score,
        navigationTarget: `/technicians`,
        metadata: {
          phone: t.phone,
          status: t.status,
          skills: t.skills,
        },
      };
    });

    return results;
  }
}
