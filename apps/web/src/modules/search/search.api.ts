import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import type {
  GlobalSearchResponse,
  GlobalSearchQuery,
  SearchSuggestionResponse,
} from '@crm/types';

export const searchApi = {
  /**
   * Execute Global Multi-Domain Search
   */
  async search(params: GlobalSearchQuery): Promise<GlobalSearchResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.types) {
      if (Array.isArray(params.types)) {
        searchParams.set('types', params.types.join(','));
      } else {
        searchParams.set('types', params.types);
      }
    }
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));

    const response = await apiRequest<{ success: boolean; data: GlobalSearchResponse }>(
      `/api/v1/search?${searchParams.toString()}`
    );
    return response.data;
  },

  /**
   * Fast Autocomplete Suggestions
   */
  async suggest(q: string, limit: number = 6): Promise<SearchSuggestionResponse> {
    const searchParams = new URLSearchParams();
    if (q) searchParams.set('q', q);
    if (limit) searchParams.set('limit', String(limit));

    const response = await apiRequest<{ success: boolean; data: SearchSuggestionResponse }>(
      `/api/v1/search/suggest?${searchParams.toString()}`
    );
    return response.data;
  },
};

export const searchKeys = {
  all: ['search'] as const,
  global: (params: GlobalSearchQuery) => [...searchKeys.all, 'global', params] as const,
  suggest: (q: string, limit?: number) => [...searchKeys.all, 'suggest', q, limit] as const,
};

export function useGlobalSearch(params: GlobalSearchQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: searchKeys.global(params),
    queryFn: () => searchApi.search(params),
    enabled: options?.enabled !== false && Boolean(params.q && params.q.trim().length > 0),
    staleTime: 30 * 1000,
  });
}

export function useSearchSuggestions(q: string, limit: number = 6, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: searchKeys.suggest(q, limit),
    queryFn: () => searchApi.suggest(q, limit),
    enabled: options?.enabled !== false && Boolean(q && q.trim().length > 0),
    staleTime: 30 * 1000,
  });
}
