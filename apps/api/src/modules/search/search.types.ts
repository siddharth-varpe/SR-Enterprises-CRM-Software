import type { SearchEntityType, SearchItemResult, UserRole } from '@crm/types';

export interface SearchContext {
  userId?: string;
  userRole?: string | UserRole;
  permissions?: string[];
}

export interface NormalizedQuery {
  raw: string;
  clean: string;
  upper: string;
  digitsOnly: string;
  normalizedPhone?: string;
}

export interface ISearchProvider {
  readonly entityType: SearchEntityType;
  readonly categoryName: string;
  isAuthorized(context: SearchContext): boolean;
  search(query: NormalizedQuery, limit: number, context: SearchContext): Promise<SearchItemResult[]>;
}
