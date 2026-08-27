import type {
  GlobalSearchResponse,
  SearchItemResult,
  SearchSuggestionResponse,
  SearchEntityType,
  SearchSuggestionItem,
  AdvancedSearchRequest,
  AdvancedSearchResponse,
} from '@crm/types';
import type { ISearchProvider, NormalizedQuery, SearchContext } from './search.types';
import { SearchRouter } from './search.router';
import { FilterEngine } from './filter-engine';
import {
  CustomerSearchProvider,
  AssetSearchProvider,
  ProductSearchProvider,
  InvoiceSearchProvider,
  PaymentSearchProvider,
  ServiceSearchProvider,
  JobCardSearchProvider,
  WarrantySearchProvider,
  TechnicianSearchProvider,
  InquirySearchProvider,
  SalesSearchProvider,
  InventorySearchProvider,
} from './providers';

export class GlobalSearchService {
  private providers: Map<SearchEntityType, ISearchProvider> = new Map();

  constructor() {
    this.registerProvider(new CustomerSearchProvider());
    this.registerProvider(new AssetSearchProvider());
    this.registerProvider(new ProductSearchProvider());
    this.registerProvider(new InvoiceSearchProvider());
    this.registerProvider(new PaymentSearchProvider());
    this.registerProvider(new ServiceSearchProvider());
    this.registerProvider(new JobCardSearchProvider());
    this.registerProvider(new WarrantySearchProvider());
    this.registerProvider(new TechnicianSearchProvider());
    this.registerProvider(new InquirySearchProvider());
    this.registerProvider(new SalesSearchProvider());
    this.registerProvider(new InventorySearchProvider());
  }

  registerProvider(provider: ISearchProvider): void {
    this.providers.set(provider.entityType, provider);
  }

  getProvider(entityType: SearchEntityType): ISearchProvider | undefined {
    return this.providers.get(entityType);
  }

  /**
   * Helper: Normalize user query safely
   */
  normalizeQuery(raw: string): NormalizedQuery {
    return SearchRouter.normalizeQuery(raw);
  }

  /**
   * Execute Global Multi-Domain Search
   */
  async search(
    rawQuery: string,
    options: {
      types?: SearchEntityType[] | string;
      limit?: number;
      offset?: number;
    } = {},
    context: SearchContext = {}
  ): Promise<GlobalSearchResponse> {
    const startTime = Date.now();
    const norm = this.normalizeQuery(rawQuery);

    if (!norm.clean || norm.clean.length === 0) {
      return {
        query: '',
        totalMatches: 0,
        executionTimeMs: 0,
        categories: {},
        results: [],
      };
    }

    // Safety guard against abusive length
    if (norm.clean.length > 100) {
      norm.clean = norm.clean.slice(0, 100);
      norm.upper = norm.upper.slice(0, 100);
    }

    const perCategoryLimit = Math.min(Math.max(Number(options.limit || 8), 1), 30);

    // Resolve filter types or route intent
    let requestedTypes: SearchEntityType[] | null = null;
    if (options.types) {
      if (Array.isArray(options.types)) {
        requestedTypes = options.types;
      } else if (typeof options.types === 'string') {
        requestedTypes = options.types.split(',').map((t) => t.trim() as SearchEntityType);
      }
    } else {
      // Use intent router if no explicit types requested
      const intent = SearchRouter.detectIntent(norm);
      if (intent.isSpecificPattern && intent.primaryEntities.length > 0) {
        requestedTypes = intent.primaryEntities;
      }
    }

    // Filter authorized providers
    const activeProviders = Array.from(this.providers.values()).filter((p) => {
      if (requestedTypes && requestedTypes.length > 0 && !requestedTypes.includes(p.entityType)) {
        return false;
      }
      return p.isAuthorized(context);
    });

    // Execute provider searches in parallel
    const searchPromises = activeProviders.map(async (provider) => {
      try {
        const items = await provider.search(norm, perCategoryLimit, context);
        return {
          categoryName: provider.categoryName,
          items,
        };
      } catch {
        // Safe isolation: single domain error does not fail the entire global search
        return {
          categoryName: provider.categoryName,
          items: [] as SearchItemResult[],
        };
      }
    });

    const categoryResults = await Promise.all(searchPromises);

    const categories: Record<string, SearchItemResult[]> = {};
    const allResults: SearchItemResult[] = [];
    const seenMap = new Set<string>();

    for (const cat of categoryResults) {
      if (cat.items && cat.items.length > 0) {
        // Deduplicate within provider results
        const uniqueCatItems: SearchItemResult[] = [];
        for (const item of cat.items) {
          const key = `${item.type}:${item.id}`;
          if (!seenMap.has(key)) {
            seenMap.add(key);
            uniqueCatItems.push(item);
            allResults.push(item);
          }
        }

        // Sort within category by score DESC
        uniqueCatItems.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
        if (uniqueCatItems.length > 0) {
          categories[cat.categoryName] = uniqueCatItems.slice(0, perCategoryLimit);
        }
      }
    }

    // Global deterministic sorting
    allResults.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    const totalMatches = allResults.length;
    const executionTimeMs = Date.now() - startTime;

    return {
      query: norm.clean,
      totalMatches,
      executionTimeMs,
      categories,
      results: allResults.slice(0, perCategoryLimit * 5),
    };
  }

  /**
   * Fast Autocomplete Suggestions
   */
  async suggest(
    rawQuery: string,
    limit: number = 6,
    context: SearchContext = {}
  ): Promise<SearchSuggestionResponse> {
    const norm = this.normalizeQuery(rawQuery);
    if (!norm.clean) {
      return { query: '', suggestions: [] };
    }

    const searchRes = await this.search(rawQuery, { limit }, context);
    const suggestions: SearchSuggestionItem[] = searchRes.results.slice(0, limit).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      subtitle: r.subtitle,
      navigationTarget: r.navigationTarget,
    }));

    return {
      query: norm.clean,
      suggestions,
    };
  }

  /**
   * Advanced Entity-Targeted Search with Filtering
   */
  async advancedSearch(
    req: AdvancedSearchRequest,
    context: SearchContext = {}
  ): Promise<AdvancedSearchResponse> {
    const startTime = Date.now();
    const provider = this.getProvider(req.entityType);

    if (!provider || !provider.isAuthorized(context)) {
      return {
        entityType: req.entityType,
        query: req.q,
        page: req.page || 1,
        limit: req.limit || 20,
        total: 0,
        totalPages: 0,
        executionTimeMs: Date.now() - startTime,
        items: [],
      };
    }

    // Validate filters
    if (req.filters && req.filters.length > 0) {
      const validation = FilterEngine.validateFilters(req.entityType, req.filters);
      if (!validation.valid) {
        throw new Error(`Invalid filter parameters: ${validation.errors.join(', ')}`);
      }
    }

    const norm = this.normalizeQuery(req.q || '');
    const page = Math.max(1, Number(req.page || 1));
    const limit = Math.min(Math.max(Number(req.limit || 20), 1), 100);

    const items = await provider.search(norm, limit * page, context);
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      entityType: req.entityType,
      query: norm.clean || undefined,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      executionTimeMs: Date.now() - startTime,
      items: paginatedItems,
    };
  }
}

export const globalSearchService = new GlobalSearchService();
