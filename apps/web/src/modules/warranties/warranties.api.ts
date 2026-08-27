import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  WarrantyQueryFilter,
  CreateWarrantyInput,
  UpdateWarrantyInput,
} from '@crm/validation';

export interface WarrantyItem {
  id: string;
  warrantyNumber: string;
  warrantyType: 'STANDARD_MACHINE' | 'EXTENDED_MACHINE' | 'SPARE_PART' | 'MANUFACTURER' | 'SELLER' | 'EXTENDED' | 'SERVICE';
  startDate: string;
  endDate: string;
  durationMonths: number;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'VOID' | 'CANCELLED';
  terms: string | null;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNumber: string;
  assetId: string;
  assetNumber: string;
  serialNumber: string | null;
  productName: string;
  productBrand: string | null;
  productSku: string;
  saleId: string | null;
  saleNumber: string | null;
}

export interface WarrantyEventItem {
  id: string;
  warrantyId: string;
  eventType: 'ACTIVATED' | 'CLAIMED' | 'EXTENDED' | 'VOIDED' | 'EXPIRED';
  eventDate: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WarrantyDetail extends WarrantyItem {
  updatedAt: string;
  customerEmail: string | null;
  events: WarrantyEventItem[];
}

export interface WarrantyKPIs {
  totalWarranties: number;
  activeWarranties: number;
  expiringSoon: number;
  expiredWarranties: number;
  voidWarranties: number;
}

export interface PaginatedWarrantiesResponse {
  data: WarrantyItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to query paginated warranties list
 */
export function useWarrantiesQuery(filters: Partial<WarrantyQueryFilter>) {
  return useQuery({
    queryKey: ['warranties', filters],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedWarrantiesResponse>('/warranties', {
        params: filters,
      });
      return (response as any)?.data?.data ? (response as any).data : response;
    },
    staleTime: 30_000,
  });
}

/**
 * Hook to query single warranty detail
 */
export function useWarrantyDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['warranty', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get<WarrantyDetail>(`/warranties/${id}`);
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to query warranty operational KPIs
 */
export function useWarrantyKPIsQuery() {
  return useQuery({
    queryKey: ['warranties', 'kpis'],
    queryFn: async () => {
      const response = await apiClient.get<WarrantyKPIs>('/warranties/kpis');
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook to query warranties expiring soon
 */
export function useExpiringWarrantiesQuery(days = 30) {
  return useQuery({
    queryKey: ['warranties', 'expiring', days],
    queryFn: async () => {
      const response = await apiClient.get<WarrantyItem[]>('/warranties/expiring', {
        params: { days },
      });
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    staleTime: 60_000,
  });
}

/**
 * Mutation to create/register a new warranty
 */
export function useCreateWarrantyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWarrantyInput) => {
      const response = await apiClient.post<{ success: boolean; data: any }>('/warranties', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['customer-assets'] });
    },
  });
}

/**
 * Mutation to update/extend a warranty
 */
export function useUpdateWarrantyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarrantyInput }) => {
      const response = await apiClient.patch<{ success: boolean; data: any }>(`/warranties/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      queryClient.invalidateQueries({ queryKey: ['warranty', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['customer-assets'] });
    },
  });
}
