import type { AnalyticsDateRangePreset } from '@crm/types';

export type ReportType =
  | 'overview'
  | 'sales'
  | 'customers'
  | 'services'
  | 'invoices'
  | 'payments'
  | 'products'
  | 'technicians';

export type CompareOption = 'previous_period' | 'previous_month' | 'previous_year' | 'none';

export type ChartTimeframe = '7D' | '30D' | '3M' | '6M' | '1Y';

export interface ReportFilterState {
  datePreset: AnalyticsDateRangePreset | 'yesterday' | 'last_week' | 'this_quarter' | 'custom';
  reportType: ReportType;
  compareWith: CompareOption;
  customStartDate?: string;
  customEndDate?: string;
}

export interface KpiMetric {
  title: string;
  value: string;
  rawValue: number;
  deltaPercentage: number;
  deltaLabel: string;
  trend: 'up' | 'down' | 'neutral';
  colorVariant: 'blue' | 'purple' | 'indigo' | 'emerald' | 'orange';
  sparklineData: number[];
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  sales: number;
  services?: number;
  customers?: number;
}

export interface TopProductItem {
  rank: number;
  name: string;
  category: string;
  unitsSold: number;
  revenue: string;
  rawRevenue: number;
  growth: number;
  sharePercentage: number;
}

export interface TechnicianReportItem {
  id: string;
  name: string;
  phone: string;
  assignedJobs: number;
  completedJobs: number;
  pendingJobs: number;
  completionRate: number;
  averageTurnaroundHours: number;
  revenueGenerated: string;
}

export interface WarrantyAlertItem {
  id: string;
  title: string;
  count: number;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'neutral';
}

export interface BusinessInsightItem {
  id: string;
  title: string;
  message: string;
  metric?: string;
  delta?: string;
  type: 'positive' | 'warning' | 'info';
  category: 'revenue' | 'service' | 'maintenance' | 'collection';
}
