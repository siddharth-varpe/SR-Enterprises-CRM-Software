import { describe, it, expect } from 'vitest';
import { FilterEngine } from './filter-engine';
import type { SearchFilterClause } from '@crm/types';

describe('FilterEngine Validation', () => {
  it('validates allowed filter fields for customer entity', () => {
    const validFilters: SearchFilterClause[] = [
      { field: 'status', operator: 'eq', value: 'ACTIVE' },
      { field: 'city', operator: 'eq', value: 'Pune' },
    ];

    const result = FilterEngine.validateFilters('customer', validFilters);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects disallowed arbitrary filter fields to prevent query injection', () => {
    const invalidFilters: SearchFilterClause[] = [
      { field: 'passwordHash', operator: 'eq', value: 'secret' },
      { field: '1=1; DROP TABLE users', operator: 'eq', value: 'inject' },
    ];

    const result = FilterEngine.validateFilters('customer', invalidFilters);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it('validates sort columns against whitelist', () => {
    expect(FilterEngine.validateSort('createdAt')).toBe(true);
    expect(FilterEngine.validateSort('totalAmount')).toBe(true);
    expect(FilterEngine.validateSort('dueDate')).toBe(true);
    expect(FilterEngine.validateSort('arbitrary_sql_injection')).toBe(false);
  });
});
