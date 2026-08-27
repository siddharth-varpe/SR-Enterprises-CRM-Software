import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type { AssetQueryFilter, UpdateAssetInput } from '@crm/validation';

export interface CustomerAssetItem {
  id: string;
  assetNumber: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  customerPhone: string;
  productId: string;
  productName: string;
  productSku: string;
  productBrand: string;
  productModel?: string | null;
  assetType: 'RO_MACHINE' | 'SPARE_PART';
  serialNumber?: string | null;
  customName?: string | null;
  purchaseDate: string;
  initialWarrantyMonths: number;
  serviceIntervalMonths: number;
  status: 'ACTIVE' | 'IN_SERVICE' | 'REPLACED' | 'DECOMMISSIONED';
  notes?: string | null;
  createdAt: string;
}

export interface CustomerAssetDetail extends CustomerAssetItem {
  customerEmail?: string | null;
  installationAddress?: {
    id: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  warranties?: {
    id: string;
    warrantyNumber: string;
    warrantyType: string;
    startDate: string;
    endDate: string;
    durationMonths: number;
    status: string;
    terms?: string | null;
  }[];
  services?: {
    id: string;
    serviceNumber: string;
    serviceType: string;
    status: string;
    createdAt: string;
  }[];
}

export function useAssetsQuery(filters: Partial<AssetQueryFilter>) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.assetType) params.append('assetType', filters.assetType);
      if (filters.status) params.append('status', filters.status);
      if (filters.serialNumber) params.append('serialNumber', filters.serialNumber);

      const res = await apiClient.get<CustomerAssetItem[]>(`/assets?${params.toString()}`);
      return {
        data: res.data || [],
        pagination: (res as any).pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    },
  });
}

export function useAssetQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<CustomerAssetDetail>(`/assets/${id}`);
      return res.data || null;
    },
    enabled: !!id,
  });
}

export function useUpdateAssetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssetInput }) => {
      const res = await apiClient.patch<CustomerAssetDetail>(`/assets/${id}`, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
