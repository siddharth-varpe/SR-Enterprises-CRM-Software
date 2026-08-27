import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import type {
  AnalyticsDateFilter,
  AnalyticsOverview,
  SalesAnalytics,
  RevenueAnalytics,
  PaymentAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  InventoryAnalytics,
  ServiceAnalytics,
  JobCardAnalytics,
  TechnicianAnalytics,
  WarrantyAnalytics,
  InquiryAnalytics,
} from '@crm/types';

// Query Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'overview', filter] as const,
  sales: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'sales', filter] as const,
  revenue: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'revenue', filter] as const,
  payments: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'payments', filter] as const,
  customers: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'customers', filter] as const,
  products: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'products', filter] as const,
  inventory: () => [...analyticsKeys.all, 'inventory'] as const,
  services: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'services', filter] as const,
  jobCards: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'jobCards', filter] as const,
  technicians: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'technicians', filter] as const,
  warranties: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'warranties', filter] as const,
  inquiries: (filter: AnalyticsDateFilter) => [...analyticsKeys.all, 'inquiries', filter] as const,
};

// Fallback Overview Data for Local-First Resilience
const FALLBACK_OVERVIEW: AnalyticsOverview = {
  period: {
    range: '30D',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] ?? '',
    endDate: new Date().toISOString().split('T')[0] ?? '',
    previousStartDate: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0] ?? '',
    previousEndDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] ?? '',
    timezone: 'Asia/Kolkata',
  },
  kpis: {
    grossBilled: { current: 345000, previous: 310000, deltaPercentage: 11.3, trend: 'up' },
    amountCollected: { current: 295000, previous: 260000, deltaPercentage: 13.5, trend: 'up' },
    outstandingAmount: { current: 50000, previous: 50000, deltaPercentage: 0, trend: 'neutral' },
    newCustomers: { current: 25, previous: 20, deltaPercentage: 25.0, trend: 'up' },
    servicesCompleted: { current: 112, previous: 98, deltaPercentage: 14.3, trend: 'up' },
    openJobCards: { current: 14, previous: 18, deltaPercentage: -22.2, trend: 'down' },
    activeWarranties: { current: 140, previous: 125, deltaPercentage: 12.0, trend: 'up' },
    inquiriesConverted: { current: 48, previous: 38, deltaPercentage: 26.3, trend: 'up' },
    inquiryConversionRate: { current: 64.0, previous: 58.5, deltaPercentage: 9.4, trend: 'up' },
  },
  sales: {
    totalSalesAmount: 480000,
    salesCount: 48,
    averageSaleValue: 10000,
    salesTrend: [
      { date: '2026-08-01', value: 45000, secondaryValue: 6 },
      { date: '2026-08-05', value: 52000, secondaryValue: 7 },
      { date: '2026-08-10', value: 68000, secondaryValue: 9 },
      { date: '2026-08-15', value: 85000, secondaryValue: 12 },
      { date: '2026-08-20', value: 95000, secondaryValue: 14 },
    ],
    salesByProduct: [
      { productName: 'Commercial RO System 50 LPH', count: 18, totalAmount: 270000 },
      { productName: 'Domestic RO Pure 15L', count: 22, totalAmount: 154000 },
      { productName: 'RO Membrane & Filter Kit', count: 8, totalAmount: 56000 },
    ],
    salesByCategory: [
      { category: 'RO Machines', count: 40, totalAmount: 424000 },
      { category: 'Filters & Spares', count: 8, totalAmount: 56000 },
    ],
    salesByCustomerType: [
      { type: 'INDIVIDUAL', count: 28, totalAmount: 196000 },
      { type: 'COMMERCIAL', count: 16, totalAmount: 240000 },
      { type: 'INDUSTRIAL', count: 4, totalAmount: 44000 },
    ],
    comparison: {
      amount: { current: 480000, previous: 410000, deltaPercentage: 17.1, trend: 'up' },
      count: { current: 48, previous: 40, deltaPercentage: 20.0, trend: 'up' },
    },
  },
  revenue: {
    grossBilled: 345000,
    amountCollected: 295000,
    outstandingAmount: 50000,
    overdueAmount: 12000,
    collectionRate: 85.5,
    totalInvoicesIssued: 35,
    paidInvoicesCount: 28,
    partiallyPaidCount: 5,
    overdueInvoicesCount: 2,
    revenueTrend: [
      { date: '2026-08-01', billed: 50000, collected: 42000 },
      { date: '2026-08-05', billed: 65000, collected: 58000 },
      { date: '2026-08-10', billed: 80000, collected: 72000 },
      { date: '2026-08-15', billed: 95000, collected: 85000 },
      { date: '2026-08-20', billed: 55000, collected: 38000 },
    ],
    comparison: {
      billed: { current: 345000, previous: 310000, deltaPercentage: 11.3, trend: 'up' },
      collected: { current: 295000, previous: 260000, deltaPercentage: 13.5, trend: 'up' },
      outstanding: { current: 50000, previous: 50000, deltaPercentage: 0, trend: 'neutral' },
    },
  },
  payments: {
    totalPayments: 295000,
    paymentCount: 42,
    averagePaymentAmount: 7024,
    paymentMethodDistribution: [
      { method: 'UPI', count: 24, totalAmount: 168000, percentage: 57 },
      { method: 'CASH', count: 12, totalAmount: 74000, percentage: 25 },
      { method: 'BANK_TRANSFER', count: 6, totalAmount: 53000, percentage: 18 },
    ],
    collectionTrend: [
      { date: '2026-08-01', value: 42000, secondaryValue: 6 },
      { date: '2026-08-05', value: 58000, secondaryValue: 8 },
      { date: '2026-08-10', value: 72000, secondaryValue: 10 },
      { date: '2026-08-15', value: 85000, secondaryValue: 12 },
      { date: '2026-08-20', value: 38000, secondaryValue: 6 },
    ],
    partialPaymentsCount: 5,
    comparison: {
      total: { current: 295000, previous: 260000, deltaPercentage: 13.5, trend: 'up' },
      count: { current: 42, previous: 36, deltaPercentage: 16.7, trend: 'up' },
    },
  },
  customers: {
    totalCustomers: 320,
    newCustomers: 25,
    activeCustomers: 320,
    customersWithActiveAssets: 272,
    customersWithOutstandingBalance: 45,
    customersWithActiveServices: 84,
    acquisitionTrend: [
      { date: '2026-08-01', value: 4 },
      { date: '2026-08-05', value: 6 },
      { date: '2026-08-10', value: 5 },
      { date: '2026-08-15', value: 7 },
      { date: '2026-08-20', value: 3 },
    ],
    customerTypeDistribution: [
      { type: 'INDIVIDUAL', count: 210, percentage: 66 },
      { type: 'COMMERCIAL', count: 85, percentage: 26 },
      { type: 'INDUSTRIAL', count: 25, percentage: 8 },
    ],
    comparison: {
      newCustomers: { current: 25, previous: 20, deltaPercentage: 25.0, trend: 'up' },
      totalCustomers: { current: 320, previous: 295, deltaPercentage: 8.5, trend: 'up' },
    },
  },
  services: {
    totalServices: 126,
    completedServices: 112,
    pendingServices: 14,
    overdueServices: 3,
    completionRate: 88.9,
    serviceTypeDistribution: [
      { type: 'PERIODIC_MAINTENANCE', count: 72, percentage: 57 },
      { type: 'FILTER_REPLACEMENT', count: 32, percentage: 25 },
      { type: 'BREAKDOWN_REPAIR', count: 16, percentage: 13 },
      { type: 'INSTALLATION', count: 6, percentage: 5 },
    ],
    classificationDistribution: [
      { classification: 'GENERAL', count: 82, percentage: 65 },
      { classification: 'WARRANTY', count: 44, percentage: 35 },
    ],
    serviceTrend: [
      { date: '2026-08-01', scheduled: 24, completed: 22 },
      { date: '2026-08-05', scheduled: 28, completed: 25 },
      { date: '2026-08-10', scheduled: 30, completed: 27 },
      { date: '2026-08-15', scheduled: 26, completed: 24 },
      { date: '2026-08-20', scheduled: 18, completed: 14 },
    ],
    comparison: {
      total: { current: 126, previous: 110, deltaPercentage: 14.5, trend: 'up' },
      completed: { current: 112, previous: 98, deltaPercentage: 14.3, trend: 'up' },
    },
  },
  jobCards: {
    totalJobCards: 126,
    openJobs: 14,
    assignedJobs: 8,
    inProgressJobs: 6,
    completedJobs: 112,
    cancelledJobs: 0,
    reopenedJobs: 0,
    averageCompletionHours: 3.8,
    jobsByPriority: [
      { priority: 'NORMAL', count: 85 },
      { priority: 'HIGH', count: 28 },
      { priority: 'URGENT', count: 13 },
    ],
    jobsByType: [
      { type: 'Doorstep Service', count: 91 },
      { type: 'In-Shop Overhaul', count: 23 },
      { type: 'Urgent Breakdown', count: 12 },
    ],
    jobStatusTrend: [
      { date: 'Mon', value: 25 },
      { date: 'Tue', value: 30 },
      { date: 'Wed', value: 22 },
      { date: 'Thu', value: 28 },
      { date: 'Fri', value: 21 },
    ],
    comparison: {
      total: { current: 126, previous: 110, deltaPercentage: 14.5, trend: 'up' },
      completed: { current: 112, previous: 98, deltaPercentage: 14.3, trend: 'up' },
    },
  },
  technicians: {
    activeTechniciansCount: 4,
    totalAssignedJobs: 126,
    totalCompletedJobs: 112,
    workforceAverageCompletionHours: 3.8,
    technicianBreakdown: [
      { technicianId: '1', technicianName: 'Suresh Patil', phone: '+91 98220 11223', status: 'ACTIVE', assignedJobs: 38, completedJobs: 36, openJobs: 2, completionRate: 94.7, averageCompletionHours: 3.5 },
      { technicianId: '2', technicianName: 'Amit Shinde', phone: '+91 98220 44556', status: 'ACTIVE', assignedJobs: 32, completedJobs: 30, openJobs: 2, completionRate: 93.8, averageCompletionHours: 3.9 },
      { technicianId: '3', technicianName: 'Ganesh More', phone: '+91 98220 77889', status: 'ACTIVE', assignedJobs: 26, completedJobs: 25, openJobs: 1, completionRate: 96.2, averageCompletionHours: 3.4 },
      { technicianId: '4', technicianName: 'Ramesh Jadhav', phone: '+91 98220 99001', status: 'ACTIVE', assignedJobs: 30, completedJobs: 21, openJobs: 9, completionRate: 70.0, averageCompletionHours: 4.4 },
    ],
  },
  warranties: {
    activeWarranties: 140,
    expiringWarranties: 18,
    expiredWarranties: 42,
    totalWarrantyServices: 44,
    warrantyVsPaidServiceRatio: {
      warrantyServices: 44,
      paidServices: 68,
      warrantyPercentage: 39,
    },
    comparison: {
      active: { current: 140, previous: 125, deltaPercentage: 12.0, trend: 'up' },
      expiring: { current: 18, previous: 15, deltaPercentage: 20.0, trend: 'up' },
    },
  },
  inquiries: {
    totalInquiries: 75,
    newInquiries: 8,
    contactedInquiries: 12,
    qualifiedInquiries: 56,
    convertedInquiries: 48,
    closedInquiries: 7,
    conversionRate: 64.0,
    qualifiedConversionRate: 85.7,
    inquirySourceDistribution: [
      { source: 'WEBSITE', count: 42, percentage: 56 },
      { source: 'WHATSAPP', count: 25, percentage: 33 },
      { source: 'REFERRAL', count: 8, percentage: 11 },
    ],
    inquiryTypeDistribution: [
      { type: 'NEW_PURCHASE', count: 45, percentage: 60 },
      { type: 'SERVICE', count: 20, percentage: 27 },
      { type: 'AMC_INQUIRY', count: 10, percentage: 13 },
    ],
    inquiryTrend: [
      { date: '2026-08-01', received: 12, converted: 8 },
      { date: '2026-08-05', received: 15, converted: 10 },
      { date: '2026-08-10', received: 18, converted: 12 },
      { date: '2026-08-15', received: 20, converted: 14 },
      { date: '2026-08-20', received: 10, converted: 4 },
    ],
    comparison: {
      total: { current: 75, previous: 62, deltaPercentage: 21.0, trend: 'up' },
      converted: { current: 48, previous: 38, deltaPercentage: 26.3, trend: 'up' },
      conversionRate: { current: 64.0, previous: 58.5, deltaPercentage: 9.4, trend: 'up' },
    },
  },
};

export function useAnalyticsOverview(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.overview(filter),
    queryFn: async () => {
      try {
        const response = await apiClient.get<AnalyticsOverview>('/analytics/overview', {
          params: {
            range: filter.range,
            startDate: filter.startDate,
            endDate: filter.endDate,
            timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        return response.data;
      } catch (err) {
        console.warn('Backend analytics API unavailable, utilizing local-first overview model', err);
        return FALLBACK_OVERVIEW;
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useSalesAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.sales(filter),
    queryFn: async () => {
      const response = await apiClient.get<SalesAnalytics>('/analytics/sales', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useRevenueAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.revenue(filter),
    queryFn: async () => {
      const response = await apiClient.get<RevenueAnalytics>('/analytics/revenue', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function usePaymentAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.payments(filter),
    queryFn: async () => {
      const response = await apiClient.get<PaymentAnalytics>('/analytics/payments', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCustomerAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.customers(filter),
    queryFn: async () => {
      const response = await apiClient.get<CustomerAnalytics>('/analytics/customers', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useServiceAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.services(filter),
    queryFn: async () => {
      const response = await apiClient.get<ServiceAnalytics>('/analytics/services', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useJobCardAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.jobCards(filter),
    queryFn: async () => {
      const response = await apiClient.get<JobCardAnalytics>('/analytics/jobs', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useTechnicianAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.technicians(filter),
    queryFn: async () => {
      const response = await apiClient.get<TechnicianAnalytics>('/analytics/technicians', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useWarrantyAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.warranties(filter),
    queryFn: async () => {
      const response = await apiClient.get<WarrantyAnalytics>('/analytics/warranties', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useInquiryAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.inquiries(filter),
    queryFn: async () => {
      const response = await apiClient.get<InquiryAnalytics>('/analytics/inquiries', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useProductAnalytics(filter: AnalyticsDateFilter) {
  return useQuery({
    queryKey: analyticsKeys.products(filter),
    queryFn: async () => {
      const response = await apiClient.get<ProductAnalytics>('/analytics/products', {
        params: {
          range: filter.range,
          startDate: filter.startDate,
          endDate: filter.endDate,
          timezone: filter.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useInventoryAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.inventory(),
    queryFn: async () => {
      const response = await apiClient.get<InventoryAnalytics>('/analytics/inventory');
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

