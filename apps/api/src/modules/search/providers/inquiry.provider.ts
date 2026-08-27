import { sql, or, ilike } from 'drizzle-orm';
import { db } from '../../../database/client';
import { inquiries } from '../../../database/schema/inquiries';
import type { ISearchProvider, NormalizedQuery, SearchContext } from '../search.types';
import type { SearchItemResult, SearchMatchType } from '@crm/types';

export class InquirySearchProvider implements ISearchProvider {
  readonly entityType = 'inquiry' as const;
  readonly categoryName = 'Inquiries & Leads';

  isAuthorized(_context: SearchContext): boolean {
    return true;
  }

  async search(query: NormalizedQuery, limit: number, _context: SearchContext): Promise<SearchItemResult[]> {
    const { clean, upper, digitsOnly } = query;
    if (!clean) return [];

    const conditions = [
      ilike(inquiries.inquiryNumber, `%${clean}%`),
      ilike(inquiries.name, `%${clean}%`),
      ilike(inquiries.city, `%${clean}%`),
      ilike(inquiries.productInterest, `%${clean}%`),
      ilike(inquiries.serviceInterest, `%${clean}%`),
    ];

    if (clean.includes('@') || clean.length >= 3) {
      conditions.push(ilike(inquiries.email, `%${clean}%`));
    }

    if (digitsOnly.length >= 3) {
      conditions.push(sql`REPLACE(REPLACE(REPLACE(${inquiries.phone}, ' ', ''), '-', ''), '+91', '') LIKE ${'%' + digitsOnly + '%'}`);
    }

    const records = await db
      .select({
        id: inquiries.id,
        inquiryNumber: inquiries.inquiryNumber,
        name: inquiries.name,
        phone: inquiries.phone,
        email: inquiries.email,
        city: inquiries.city,
        status: inquiries.status,
        inquiryType: inquiries.inquiryType,
      })
      .from(inquiries)
      .where(or(...conditions))
      .limit(limit * 2);

    const results: SearchItemResult[] = records.map((inq: any) => {
      let score = 30;
      let matchType: SearchMatchType = 'SECONDARY';

      const inqNumUpper = (inq.inquiryNumber || '').toUpperCase();
      const nameUpper = (inq.name || '').toUpperCase();
      const normPhone = (inq.phone || '').replace(/\D/g, '');

      if (inqNumUpper === upper || (digitsOnly.length >= 10 && normPhone.endsWith(digitsOnly))) {
        score = 100;
        matchType = 'EXACT';
      } else if (inqNumUpper.startsWith(upper) || nameUpper === upper) {
        score = 85;
        matchType = 'PREFIX';
      } else if (nameUpper.includes(upper)) {
        score = 55;
        matchType = 'PARTIAL';
      }

      return {
        type: this.entityType,
        id: inq.id,
        title: `Inquiry #${inq.inquiryNumber} — ${inq.name}`,
        subtitle: `${inq.phone} • ${inq.city || 'Lead'} • Status: ${inq.status}`,
        matchType,
        score,
        navigationTarget: `/inquiries`,
        metadata: {
          inquiryNumber: inq.inquiryNumber,
          phone: inq.phone,
          status: inq.status,
        },
      };
    });

    return results;
  }
}
