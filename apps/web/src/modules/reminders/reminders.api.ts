import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  ReminderQueryFilter,
  CreateReminderInput,
  UpdateReminderInput,
  CompleteReminderInput,
} from '@crm/validation';

export interface ReminderItem {
  id: string;
  reminderNumber: string;
  reminderType: 'PAYMENT_FOLLOW_UP' | 'OVERDUE_PAYMENT' | 'INVOICE_DUE' | 'SERVICE_DUE' | 'WARRANTY_EXPIRY' | 'CUSTOMER_FOLLOW_UP';
  reminderDate: string;
  reminderTime: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Customer
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNumber: string;
  // Invoice
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceTotal: string | null;
  invoiceStatus: string | null;
  dueDate: string | null;
  // User
  createdById?: string;
  createdByName?: string;
}

export interface ReminderKPIs {
  totalReminders: number;
  pendingCount: number;
  dueTodayCount: number;
  overdueCount: number;
  completedCount: number;
}

export function useReminderKPIs() {
  return useQuery({
    queryKey: ['reminders', 'kpis'],
    queryFn: async () => {
      const response = await apiClient.get<ReminderKPIs>('/reminders/kpis');
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
  });
}

export function useReminders(filters: Partial<ReminderQueryFilter> = {}) {
  return useQuery({
    queryKey: ['reminders', 'list', filters],
    queryFn: async () => {
      const response = await apiClient.get<any>('/reminders', { params: filters });
      return (response as any)?.data?.data ? (response as any).data : response;
    },
  });
}

export function useReminder(id: string) {
  return useQuery({
    queryKey: ['reminders', 'detail', id],
    queryFn: async () => {
      const response = await apiClient.get<ReminderItem>(`/reminders/${id}`);
      return (response as any)?.data?.data ?? response?.data ?? response;
    },
    enabled: Boolean(id),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReminderInput) => {
      const response = await apiClient.post<{ success: boolean; data: any }>('/reminders', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateReminderInput }) => {
      const response = await apiClient.patch<{ success: boolean; data: any }>(
        `/reminders/${id}`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CompleteReminderInput }) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/reminders/${id}/complete`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ success: boolean; data: any }>(
        `/reminders/${id}/cancel`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
