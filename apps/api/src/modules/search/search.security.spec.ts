import { describe, it, expect } from 'vitest';
import { GlobalSearchService } from './search.service';
import { PaymentSearchProvider } from './providers/payment.provider';
import { SalesSearchProvider } from './providers/sales.provider';
import type { SearchContext } from './search.types';

describe('Search Security & Field-Level Authorization', () => {
  const searchService = new GlobalSearchService();

  it('blocks PaymentSearchProvider when user is a Technician without payment permissions', () => {
    const provider = new PaymentSearchProvider();
    const techContext: SearchContext = {
      userRole: 'Technician',
      permissions: ['services.view', 'job_cards.view'],
    };

    expect(provider.isAuthorized(techContext)).toBe(false);

    const adminContext: SearchContext = {
      userRole: 'Admin',
      permissions: ['payments.view'],
    };

    expect(provider.isAuthorized(adminContext)).toBe(true);
  });

  it('blocks SalesSearchProvider for unauthorized Technician', () => {
    const provider = new SalesSearchProvider();
    const techContext: SearchContext = {
      userRole: 'Technician',
      permissions: ['services.view'],
    };

    expect(provider.isAuthorized(techContext)).toBe(false);
  });

  it('safely handles empty queries without running database operations', async () => {
    const res = await searchService.search('', {}, {});
    expect(res.totalMatches).toBe(0);
    expect(res.results.length).toBe(0);
    expect(res.executionTimeMs).toBe(0);
  });

  it('truncates excessively long pathological search queries', async () => {
    const longQuery = 'A'.repeat(500);
    const res = await searchService.search(longQuery, {}, {});
    expect(res.query.length).toBeLessThanOrEqual(100);
  });
});
