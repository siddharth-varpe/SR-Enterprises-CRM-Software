import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GlobalSearchService } from './search.service';
import type { ISearchProvider, NormalizedQuery, SearchContext } from './search.types';
import type { SearchItemResult } from '@crm/types';
import { InvoiceSearchProvider, PaymentSearchProvider } from './providers';

describe('GlobalSearchService — Unit & Architecture Tests', () => {
  let service: GlobalSearchService;

  beforeEach(() => {
    service = new GlobalSearchService();
  });

  describe('Query Normalization (Rule 7)', () => {
    it('correctly trims whitespace, collapses spaces, and extracts digits', () => {
      const norm = service.normalizeQuery('  +91 98765-43210  ');
      expect(norm.clean).toBe('+91 98765-43210');
      expect(norm.digitsOnly).toBe('919876543210');
      expect(norm.upper).toBe('+91 98765-43210');
    });

    it('safely handles empty or whitespace-only queries', () => {
      const norm = service.normalizeQuery('   ');
      expect(norm.clean).toBe('');
      expect(norm.digitsOnly).toBe('');
    });

    it('returns empty result set for empty queries without scanning DB', async () => {
      const result = await service.search('   ');
      expect(result.totalMatches).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.categories).toEqual({});
    });
  });

  describe('Deterministic Ranking & Deduplication (Rules 9, 10, 11, 12, 55)', () => {
    it('ranks exact matches higher than prefix and partial matches', async () => {
      const customService = new GlobalSearchService();
      // Replace providers with a mock provider returning items with different scores
      const mockProvider: ISearchProvider = {
        entityType: 'customer',
        categoryName: 'Customers',
        isAuthorized: () => true,
        search: async () => [
          {
            type: 'customer',
            id: 'c-partial',
            title: 'Siddharth Varpe',
            subtitle: 'CUST-002 • 9823456789',
            matchType: 'PARTIAL',
            score: 55,
            navigationTarget: '/customers/c-partial',
          },
          {
            type: 'customer',
            id: 'c-exact',
            title: 'Exact Match Customer',
            subtitle: 'CUST-001 • 9876543210',
            matchType: 'EXACT',
            score: 100,
            navigationTarget: '/customers/c-exact',
          },
          {
            type: 'customer',
            id: 'c-prefix',
            title: 'Prefix Match Customer',
            subtitle: 'CUST-003 • 9876500000',
            matchType: 'PREFIX',
            score: 85,
            navigationTarget: '/customers/c-prefix',
          },
        ],
      };

      // Clear default providers and register mock
      (customService as any).providers = [mockProvider];

      const res = await customService.search('query');
      expect(res.results).toHaveLength(3);
      expect(res.results[0].id).toBe('c-exact');
      expect(res.results[0].score).toBe(100);
      expect(res.results[1].id).toBe('c-prefix');
      expect(res.results[1].score).toBe(85);
      expect(res.results[2].id).toBe('c-partial');
      expect(res.results[2].score).toBe(55);
    });

    it('deduplicates identical entities matched across multiple fields', async () => {
      const customService = new GlobalSearchService();
      const mockProvider: ISearchProvider = {
        entityType: 'product',
        categoryName: 'Products & Spare Parts',
        isAuthorized: () => true,
        search: async () => [
          {
            type: 'product',
            id: 'prod-1',
            title: 'RO Membrane 75 GPD',
            subtitle: 'SKU: RO-MEM-75',
            matchType: 'EXACT',
            score: 100,
            navigationTarget: '/sales',
          },
          {
            type: 'product',
            id: 'prod-1', // Duplicate ID
            title: 'RO Membrane 75 GPD (Secondary match)',
            subtitle: 'SKU: RO-MEM-75',
            matchType: 'PARTIAL',
            score: 55,
            navigationTarget: '/sales',
          },
        ],
      };

      (customService as any).providers = [mockProvider];

      const res = await customService.search('RO-MEM');
      expect(res.totalMatches).toBe(1);
      expect(res.results).toHaveLength(1);
      expect(res.results[0].score).toBe(100);
    });
  });

  describe('RBAC & Financial Data Protection (Rules 20, 73)', () => {
    it('denies TECHNICIAN and unauthenticated contexts from searching financial invoices', () => {
      const invoiceProvider = new InvoiceSearchProvider();
      expect(invoiceProvider.isAuthorized({ userRole: 'TECHNICIAN' })).toBe(false);
      expect(invoiceProvider.isAuthorized({ userRole: 'USER' })).toBe(false);
      expect(invoiceProvider.isAuthorized({})).toBe(false);
    });

    it('permits ADMIN, SUPER_ADMIN, and MANAGER to search financial invoices', () => {
      const invoiceProvider = new InvoiceSearchProvider();
      expect(invoiceProvider.isAuthorized({ userRole: 'ADMIN' })).toBe(true);
      expect(invoiceProvider.isAuthorized({ userRole: 'SUPER_ADMIN' })).toBe(true);
      expect(invoiceProvider.isAuthorized({ userRole: 'MANAGER' })).toBe(true);
      expect(invoiceProvider.isAuthorized({ userRole: 'STAFF' })).toBe(true);
    });

    it('denies unauthorized roles from searching payments', () => {
      const paymentProvider = new PaymentSearchProvider();
      expect(paymentProvider.isAuthorized({ userRole: 'TECHNICIAN' })).toBe(false);
      expect(paymentProvider.isAuthorized({ userRole: 'ADMIN' })).toBe(true);
    });

    it('excludes financial categories when searching as field technician', async () => {
      const res = await service.search('INV-2026', {}, { userRole: 'TECHNICIAN' });
      expect(res.categories['Invoices & Billing']).toBeUndefined();
      expect(res.categories['Payments & Ledger']).toBeUndefined();
    });
  });

  describe('Query Abuse & Length Safeguards (Rule 6, 47)', () => {
    it('truncates excessively large search queries to 100 characters', async () => {
      const longQuery = 'A'.repeat(250);
      const res = await service.search(longQuery);
      expect(res.query.length).toBeLessThanOrEqual(100);
    });

    it('safely handles special SQL and regex injection characters', async () => {
      const maliciousQuery = "' OR 1=1 -- \"; DROP TABLE users; /*";
      const res = await service.search(maliciousQuery);
      expect(res.totalMatches).toBeDefined();
      expect(Array.isArray(res.results)).toBe(true);
    });
  });

  describe('Autocomplete Suggest API', () => {
    it('returns quick suggestion DTOs', async () => {
      const customService = new GlobalSearchService();
      const mockProvider: ISearchProvider = {
        entityType: 'customer',
        categoryName: 'Customers',
        isAuthorized: () => true,
        search: async () => [
          {
            type: 'customer',
            id: 'c-1',
            title: 'Rahul Sharma',
            subtitle: 'CUST-001 • 9876543210',
            matchType: 'EXACT',
            score: 100,
            navigationTarget: '/customers/c-1',
          },
        ],
      };
      (customService as any).providers = [mockProvider];

      const res = await customService.suggest('Rahul', 5);
      expect(res.query).toBe('Rahul');
      expect(res.suggestions).toHaveLength(1);
      expect(res.suggestions[0].title).toBe('Rahul Sharma');
      expect(res.suggestions[0].navigationTarget).toBe('/customers/c-1');
    });
  });
});
