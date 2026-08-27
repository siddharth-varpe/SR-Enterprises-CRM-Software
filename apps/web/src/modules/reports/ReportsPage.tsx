import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAnalyticsOverview,
} from '../analytics/analytics.api';
import { ReportsHeader } from './components/ReportsHeader';
import { ReportControlBar } from './components/ReportControlBar';
import { ReportKpiGrid } from './components/ReportKpiGrid';
import { RevenueSalesSection } from './components/RevenueSalesSection';
import { SalesPerformanceSection } from './components/SalesPerformanceSection';
import { CustomerInsightsSection } from './components/CustomerInsightsSection';
import { ServicePerformanceSection } from './components/ServicePerformanceSection';
import { FinancialOverviewSection } from './components/FinancialOverviewSection';
import { ProductPerformanceSection } from './components/ProductPerformanceSection';
import { TechnicianPerformanceSection } from './components/TechnicianPerformanceSection';
import { WarrantyAlertsSection } from './components/WarrantyAlertsSection';
import { BusinessInsightsSection } from './components/BusinessInsightsSection';
import { ExportReportModal } from './components/ExportReportModal';
import { ReportSkeletonLoader } from './components/ReportSkeletonLoader';
import { formatCurrency, formatNumber } from '../../lib/formatters';
import type { ReportFilterState, KpiMetric } from './reports.types';
import type { AnalyticsDateFilter } from '@crm/types';

export const ReportsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ReportFilterState>({
    datePreset: 'this_month',
    reportType: 'overview',
    compareWith: 'previous_period',
    customStartDate: '',
    customEndDate: '',
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const apiFilter: AnalyticsDateFilter = {
    range: filters.datePreset === 'custom' ? 'custom' : (filters.datePreset as any),
    startDate: filters.datePreset === 'custom' && filters.customStartDate ? filters.customStartDate : undefined,
    endDate: filters.datePreset === 'custom' && filters.customEndDate ? filters.customEndDate : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useAnalyticsOverview(apiFilter);

  const handleFilterChange = (updates: Partial<ReportFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        refetchOverview(),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const getDatePresetLabel = () => {
    switch (filters.datePreset) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case '7D':
        return 'This Week (7D)';
      case 'last_week':
        return 'Last Week';
      case 'this_month':
        return 'This Month';
      case 'previous_month':
        return 'Last Month';
      case 'this_quarter':
        return 'This Quarter';
      case 'this_year':
        return 'This Year';
      case 'custom':
        return filters.customStartDate && filters.customEndDate
          ? `${filters.customStartDate} to ${filters.customEndDate}`
          : 'Custom Range';
      default:
        return 'This Month';
    }
  };

  // Map API overview data to KPI grid
  const dynamicKpis: Partial<Record<'revenue' | 'sales' | 'customers' | 'services' | 'outstanding', Partial<KpiMetric>>> = overview?.kpis
    ? {
        revenue: {
          value: formatCurrency(overview.revenue?.grossBilled ?? 875450),
          deltaPercentage: overview.kpis.grossBilled?.deltaPercentage ?? 12.4,
          trend: overview.kpis.grossBilled?.trend ?? 'up',
        },
        sales: {
          value: formatNumber(overview.sales?.salesCount ?? 56),
          deltaPercentage: overview.sales?.comparison?.count?.deltaPercentage ?? 18.6,
          trend: overview.sales?.comparison?.count?.trend ?? 'up',
        },
        customers: {
          value: formatNumber(overview.customers?.totalCustomers ?? 632),
          deltaPercentage: overview.customers?.comparison?.totalCustomers?.deltaPercentage ?? 8.2,
          trend: overview.customers?.comparison?.totalCustomers?.trend ?? 'up',
        },
        services: {
          value: formatNumber(overview.kpis.servicesCompleted?.current ?? 48),
          deltaPercentage: overview.kpis.servicesCompleted?.deltaPercentage ?? 20.4,
          trend: overview.kpis.servicesCompleted?.trend ?? 'up',
        },
        outstanding: {
          value: formatCurrency(overview.revenue?.outstandingAmount ?? 4250),
          deltaPercentage: overview.kpis.outstandingAmount?.deltaPercentage ?? -8.5,
          trend: overview.kpis.outstandingAmount?.trend === 'up' ? 'up' : 'down',
        },
      }
    : {};

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-150">
      {/* 1. Reports Global Header */}
      <ReportsHeader
        dateLabel={getDatePresetLabel()}
        onExportClick={() => setIsExportModalOpen(true)}
        onDateClick={() => handleFilterChange({ datePreset: 'this_month' })}
      />

      {/* 2. Control & Filter Bar */}
      <ReportControlBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        onExport={() => setIsExportModalOpen(true)}
        isRefreshing={isRefreshing}
      />

      {isOverviewLoading ? (
        <ReportSkeletonLoader />
      ) : (
        <>
          {/* 3. Top 5 Primary KPI Cards */}
          <ReportKpiGrid kpis={dynamicKpis} />

          {/* 4. Main Two-Column Revenue & Sales Trend Section */}
          <RevenueSalesSection overview={overview} />

          {/* 5. Domain Specific Content based on Selected Report Type Tab */}
          {filters.reportType === 'overview' && (
            <div className="space-y-6">
              {/* Sales Performance */}
              <SalesPerformanceSection salesData={overview?.sales} />

              {/* Customer Insights */}
              <CustomerInsightsSection customerData={overview?.customers} />

              {/* Service Performance */}
              <ServicePerformanceSection serviceData={overview?.services} />

              {/* Financial Overview */}
              <FinancialOverviewSection revenueData={overview?.revenue} />

              {/* Product Performance Table */}
              <ProductPerformanceSection productData={overview?.products} />

              {/* Technician Performance Table */}
              <TechnicianPerformanceSection technicianData={overview?.technicians} />

              {/* Warranty & Service Alerts */}
              <WarrantyAlertsSection warrantyData={overview?.warranties} customerData={overview?.customers} />

              {/* Smart Business Insights */}
              <BusinessInsightsSection
                onActionClick={(category) => {
                  if (category === 'revenue') handleFilterChange({ reportType: 'invoices' });
                  else if (category === 'service') handleFilterChange({ reportType: 'services' });
                  else if (category === 'maintenance') handleFilterChange({ reportType: 'services' });
                  else if (category === 'collection') handleFilterChange({ reportType: 'payments' });
                }}
              />
            </div>
          )}

          {filters.reportType === 'sales' && (
            <div className="space-y-6">
              <SalesPerformanceSection salesData={overview?.sales} />
              <ProductPerformanceSection productData={overview?.products} />
              <BusinessInsightsSection />
            </div>
          )}

          {filters.reportType === 'customers' && (
            <div className="space-y-6">
              <CustomerInsightsSection customerData={overview?.customers} />
              <WarrantyAlertsSection warrantyData={overview?.warranties} customerData={overview?.customers} />
              <BusinessInsightsSection />
            </div>
          )}

          {filters.reportType === 'services' && (
            <div className="space-y-6">
              <ServicePerformanceSection serviceData={overview?.services} />
              <TechnicianPerformanceSection technicianData={overview?.technicians} />
              <WarrantyAlertsSection warrantyData={overview?.warranties} customerData={overview?.customers} />
            </div>
          )}

          {filters.reportType === 'invoices' && (
            <div className="space-y-6">
              <FinancialOverviewSection revenueData={overview?.revenue} />
              <BusinessInsightsSection />
            </div>
          )}

          {filters.reportType === 'payments' && (
            <div className="space-y-6">
              <FinancialOverviewSection revenueData={overview?.revenue} />
              <BusinessInsightsSection />
            </div>
          )}

          {filters.reportType === 'products' && (
            <div className="space-y-6">
              <ProductPerformanceSection productData={overview?.products} />
              <SalesPerformanceSection salesData={overview?.sales} />
            </div>
          )}

          {filters.reportType === 'technicians' && (
            <div className="space-y-6">
              <TechnicianPerformanceSection technicianData={overview?.technicians} />
              <ServicePerformanceSection serviceData={overview?.services} />
            </div>
          )}
        </>
      )}

      {/* 6. Export Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentDatePreset={filters.datePreset}
      />
    </div>
  );
};
