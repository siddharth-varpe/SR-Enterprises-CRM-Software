import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export interface RentalCustomer {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string;
  email?: string;
  addressLine1?: string;
  city?: string;
}

export interface RentalTechnician {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
}

export interface RentalPaymentRecord {
  id: string;
  rentalId: string;
  customerId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  paymentType: string;
  referenceNumber?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  notes?: string;
  createdAt: string;
}

export interface RentalEventRecord {
  id: string;
  rentalId: string;
  eventType: string;
  description: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
}

export interface RentalItem {
  id: string;
  rentalNumber: string;
  customerId: string;
  machineType: string;
  machineModel: string;
  serialNumber: string;
  assetId?: string;
  capacityLph?: string;
  installationLocation?: string;
  machineCondition: 'NEW' | 'GOOD' | 'USED_GOOD' | 'USED_FAIR' | 'NEEDS_ATTENTION';
  accessories?: string;
  remarks?: string;
  rentalStartDate: string;
  rentalEndDate?: string;
  rentalDuration: 'MONTHLY' | '3_MONTHS' | '6_MONTHS' | '12_MONTHS' | 'CUSTOM';
  minimumRentalPeriodMonths: number;
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  monthlyRent: string;
  billingAmount: string;
  securityDeposit: string;
  depositStatus: 'NOT_COLLECTED' | 'COLLECTED' | 'PARTIALLY_REFUNDED' | 'FULLY_REFUNDED' | 'FORFEITED_ADJUSTED';
  initialPaymentAmount: string;
  totalPaid: string;
  outstandingAmount: string;
  nextDueDate: string;
  rentalStatus: 'ACTIVE' | 'PAYMENT_DUE' | 'OVERDUE' | 'SUSPENDED' | 'RETURNED' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED';
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'NOT_PAID' | 'DUE' | 'OVERDUE';
  installationDate?: string;
  installationTime?: string;
  installationAddress?: string;
  technicianId?: string;
  technicianName?: string;
  installationStatus: 'PENDING' | 'SCHEDULED' | 'INSTALLED' | 'CANCELLED';
  installationNotes?: string;
  returnDate?: string;
  returnCondition?: string;
  damageCharges?: string;
  depositAdjustment?: string;
  refundAmount?: string;
  returnNotes?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: RentalCustomer;
  technician?: RentalTechnician;
  payments?: RentalPaymentRecord[];
  events?: RentalEventRecord[];
}

export interface RentalSummaryStats {
  totalRentals: number;
  totalActive: number;
  totalDue: number;
  totalOverdue: number;
  totalReturned: number;
  monthlyRunRate: number;
  totalOutstanding: number;
  totalDepositsHeld: number;
}

export interface RentalListResponse {
  data: RentalItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: RentalSummaryStats;
}

export interface RentalQueryParams {
  tab?: 'active' | 'due' | 'overdue' | 'returned' | 'all';
  search?: string;
  rentalStatus?: string;
  paymentStatus?: string;
  billingFrequency?: string;
  machineType?: string;
  customerId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest' | 'dueDate' | 'outstanding' | 'customer';
  page?: number;
  limit?: number;
}

export interface CreateRentalPayload {
  customerId: string;
  machineType?: string;
  machineModel: string;
  serialNumber: string;
  assetId?: string;
  capacityLph?: string;
  installationLocation?: string;
  machineCondition?: 'NEW' | 'GOOD' | 'USED_GOOD' | 'USED_FAIR' | 'NEEDS_ATTENTION';
  accessories?: string;
  remarks?: string;
  rentalStartDate: string;
  rentalEndDate?: string;
  rentalDuration?: 'MONTHLY' | '3_MONTHS' | '6_MONTHS' | '12_MONTHS' | 'CUSTOM';
  minimumRentalPeriodMonths?: number;
  billingFrequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  monthlyRent: number;
  billingAmount?: number;
  securityDeposit?: number;
  depositStatus?: 'NOT_COLLECTED' | 'COLLECTED' | 'PARTIALLY_REFUNDED' | 'FULLY_REFUNDED' | 'FORFEITED_ADJUSTED';
  initialDepositPaid?: boolean;
  initialRentPaid?: boolean;
  paymentMethod?: string;
  referenceNumber?: string;
  installationDate?: string;
  installationTime?: string;
  installationAddress?: string;
  technicianId?: string;
  installationStatus?: 'PENDING' | 'SCHEDULED' | 'INSTALLED' | 'CANCELLED';
  installationNotes?: string;
  notes?: string;
}

export interface RecordRentalPaymentPayload {
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentType?: 'SECURITY_DEPOSIT' | 'MONTHLY_RENT' | 'ADVANCE_RENT' | 'DAMAGE_CHARGE' | 'OTHER';
  referenceNumber?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  notes?: string;
}

export interface RecordRentalReturnPayload {
  returnDate: string;
  returnCondition: string;
  damageCharges?: number;
  depositAdjustment?: number;
  refundAmount?: number;
  returnNotes?: string;
}

export interface RentalPaymentListItem {
  id: string;
  rentalId: string;
  customerId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  paymentType: string;
  receiptNumber: string;
  referenceNumber?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  notes?: string | null;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Rental details
  rentalNumber: string;
  machineType: string;
  machineModel: string;
  serialNumber: string;
  monthlyRent: string;
  securityDeposit: string;
  totalPaid: string;
  outstandingAmount: string;
  rentalStatus: string;
  paymentStatus: string;
  nextDueDate: string;
  // Customer details
  customerName: string;
  customerPhone: string;
  customerNumber: string;
  customerEmail?: string;
  customerAddress?: string;
  // User details
  recordedByName?: string;
}

export interface RentalPaymentQueryParams {
  search?: string;
  paymentMethod?: string;
  paymentType?: string;
  customerId?: string;
  rentalId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RentalPaymentListResponse {
  data: RentalPaymentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const RENTAL_QUERY_KEYS = {
  all: ['rentals'] as const,
  list: (params?: RentalQueryParams) => ['rentals', 'list', params] as const,
  detail: (id: string) => ['rentals', 'detail', id] as const,
  customer: (customerId: string) => ['rentals', 'customer', customerId] as const,
  payments: (params?: RentalPaymentQueryParams) => ['rentals', 'payments', params] as const,
  paymentDetail: (id: string) => ['rentals', 'payment-detail', id] as const,
};

/**
 * Hook to query paginated list of rentals with filters & summary
 */
export function useRentalsQuery(params?: RentalQueryParams) {
  return useQuery({
    queryKey: RENTAL_QUERY_KEYS.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            queryParams.append(k, String(v));
          }
        });
      }
      const url = `/rentals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await apiClient.get<RentalListResponse>(url);
      return res as unknown as RentalListResponse;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

/**
 * Hook to query single rental detail
 */
export function useRentalDetailQuery(id?: string) {
  return useQuery({
    queryKey: RENTAL_QUERY_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<RentalItem>(`/rentals/${id}`);
      return (res.data as unknown as RentalItem) || null;
    },
    enabled: Boolean(id),
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

/**
 * Hook to query rentals for a specific customer
 */
export function useCustomerRentalsQuery(customerId?: string) {
  return useQuery({
    queryKey: RENTAL_QUERY_KEYS.customer(customerId || ''),
    queryFn: async () => {
      if (!customerId) return [];
      const res = await apiClient.get<RentalItem[]>(`/rentals/customer/${customerId}`);
      return (res.data as unknown as RentalItem[]) || [];
    },
    enabled: Boolean(customerId),
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

/**
 * Hook to query all rental payments across the system
 */
export function useRentalPaymentsQuery(params?: RentalPaymentQueryParams) {
  return useQuery({
    queryKey: RENTAL_QUERY_KEYS.payments(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            queryParams.append(k, String(v));
          }
        });
      }
      const url = `/rentals/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await apiClient.get<RentalPaymentListResponse>(url);
      return res as unknown as RentalPaymentListResponse;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

/**
 * Hook to query single rental payment detail
 */
export function useRentalPaymentDetailQuery(id?: string) {
  return useQuery({
    queryKey: RENTAL_QUERY_KEYS.paymentDetail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<RentalPaymentListItem>(`/rentals/payments/${id}`);
      return (res.data as unknown as RentalPaymentListItem) || null;
    },
    enabled: Boolean(id),
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

/**
 * Hook to create a new rental
 */
export function useCreateRentalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRentalPayload) => {
      const res = await apiClient.post<RentalItem>('/rentals', payload);
      return (res.data as unknown as RentalItem) || (res as any);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.customer(variables.customerId) });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }
    },
  });
}

/**
 * Hook to update a rental
 */
export function useUpdateRentalMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<CreateRentalPayload>) => {
      const res = await apiClient.put<RentalItem>(`/rentals/${id}`, payload);
      return (res.data as any) || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'payments'] });
    },
  });
}

/**
 * Hook to record a recurring rental payment
 */
export function useRecordRentalPaymentMutation(rentalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordRentalPaymentPayload) => {
      const res = await apiClient.post<{ payment: RentalPaymentRecord; rental: RentalItem }>(
        `/rentals/${rentalId}/payments`,
        payload
      );
      return (res.data as any) || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.detail(rentalId) });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/**
 * Hook to record machine return
 */
export function useReturnRentalMutation(rentalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordRentalReturnPayload) => {
      const res = await apiClient.post<RentalItem>(`/rentals/${rentalId}/return`, payload);
      return (res.data as any) || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.detail(rentalId) });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/**
 * Hook to delete a rental
 */
export function useDeleteRentalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rentalId: string) => {
      const res = await apiClient.delete<{ success: boolean }>(`/rentals/${rentalId}`);
      return (res.data as any) || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RENTAL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
