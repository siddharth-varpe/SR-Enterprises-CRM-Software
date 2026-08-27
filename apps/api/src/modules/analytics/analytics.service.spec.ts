import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { analyticsRepository } from './analytics.repository';

// Mock the repository to test service calculations in isolation
vi.mock('./analytics.repository', () => ({
  analyticsRepository: {
    getSalesMetrics: vi.fn(),
    getRevenueMetrics: vi.fn(),
    getPaymentMetrics: vi.fn(),
    getCustomerMetrics: vi.fn(),
    getProductMetrics: vi.fn(),
    getInventoryMetrics: vi.fn(),
    getServiceMetrics: vi.fn(),
    getJobCardMetrics: vi.fn(),
    getTechnicianMetrics: vi.fn(),
    getWarrantyMetrics: vi.fn(),
    getInquiryMetrics: vi.fn(),
  },
}));

describe('AnalyticsService — Unit Tests', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
    vi.clearAllMocks();
  });

  describe('Zero-Denominator & Delta Calculations (Rule 4)', () => {
    it('returns null deltaPercentage and up trend when previous is 0 and current > 0', () => {
      const result = service.calculateDelta(100, 0);
      expect(result.current).toBe(100);
      expect(result.previous).toBe(0);
      expect(result.deltaPercentage).toBeNull();
      expect(result.trend).toBe('up');
    });

    it('returns 0 deltaPercentage and neutral trend when both current and previous are 0', () => {
      const result = service.calculateDelta(0, 0);
      expect(result.current).toBe(0);
      expect(result.previous).toBe(0);
      expect(result.deltaPercentage).toBe(0);
      expect(result.trend).toBe('neutral');
    });

    it('calculates correct positive percentage delta when previous > 0', () => {
      const result = service.calculateDelta(150, 100);
      expect(result.current).toBe(150);
      expect(result.previous).toBe(100);
      expect(result.deltaPercentage).toBe(50);
      expect(result.trend).toBe('up');
    });

    it('calculates correct negative percentage delta when previous > 0', () => {
      const result = service.calculateDelta(80, 100);
      expect(result.current).toBe(80);
      expect(result.previous).toBe(100);
      expect(result.deltaPercentage).toBe(-20);
      expect(result.trend).toBe('down');
    });
  });

  describe('Financial Metric Integrity (Rule 1 & Rule 2)', () => {
    it('accurately distinguishes Gross Billed vs Collected vs Outstanding without double counting', async () => {
      // Mandate Scenario:
      // Invoice issued: ₹10,000
      // Payments received: ₹4,000 + ₹2,000 = ₹6,000
      // Outstanding balance: ₹4,000
      vi.mocked(analyticsRepository.getRevenueMetrics).mockResolvedValueOnce({
        grossBilled: 10000,
        amountCollected: 6000,
        outstandingAmount: 4000,
        overdueAmount: 0,
        collectionRate: 60,
        totalInvoicesIssued: 1,
        paidInvoicesCount: 0,
        partiallyPaidCount: 1,
        overdueInvoicesCount: 0,
        revenueTrend: [
          { date: '2026-08-01', billed: 10000, collected: 6000 },
        ],
      });

      vi.mocked(analyticsRepository.getRevenueMetrics).mockResolvedValueOnce({
        grossBilled: 8000,
        amountCollected: 8000,
        outstandingAmount: 0,
        overdueAmount: 0,
        collectionRate: 100,
        totalInvoicesIssued: 1,
        paidInvoicesCount: 1,
        partiallyPaidCount: 0,
        overdueInvoicesCount: 0,
        revenueTrend: [],
      });

      const revenueAnalytics = await service.getRevenueAnalytics({ range: '30D' });

      // Verify strict financial segregation
      expect(revenueAnalytics.grossBilled).toBe(10000);
      expect(revenueAnalytics.amountCollected).toBe(6000);
      expect(revenueAnalytics.outstandingAmount).toBe(4000);
      expect(revenueAnalytics.collectionRate).toBe(60);

      // Verify comparisons
      expect(revenueAnalytics.comparison.billed.current).toBe(10000);
      expect(revenueAnalytics.comparison.billed.previous).toBe(8000);
      expect(revenueAnalytics.comparison.billed.deltaPercentage).toBe(25);

      expect(revenueAnalytics.comparison.collected.current).toBe(6000);
      expect(revenueAnalytics.comparison.collected.previous).toBe(8000);
      expect(revenueAnalytics.comparison.collected.deltaPercentage).toBe(-25);
    });
  });

  describe('Product & Inventory Analytics', () => {
    it('accurately computes product performance metrics and comparisons', async () => {
      vi.mocked(analyticsRepository.getProductMetrics).mockResolvedValueOnce({
        totalProductsSold: 85,
        totalProductRevenue: 850000,
        topProducts: [
          { productId: 'p-1', productName: 'Kent Grand Plus', unitsSold: 28, revenue: 280000, trendPercentage: 15 },
        ],
        salesByCategory: [
          { category: 'RO Water Purifier', unitsSold: 50, revenue: 500000, sharePercentage: 58.8 },
        ],
      });

      vi.mocked(analyticsRepository.getProductMetrics).mockResolvedValueOnce({
        totalProductsSold: 70,
        totalProductRevenue: 700000,
        topProducts: [],
        salesByCategory: [],
      });

      const result = await service.getProductAnalytics({ range: 'this_month' });
      expect(result.totalProductsSold).toBe(85);
      expect(result.totalProductRevenue).toBe(850000);
      expect(result.topProducts).toHaveLength(1);
      expect(result.comparison.revenue.deltaPercentage).toBe(21.4);
    });

    it('correctly aggregates real inventory stock value and alert items', async () => {
      vi.mocked(analyticsRepository.getInventoryMetrics).mockResolvedValueOnce({
        totalSkuCount: 45,
        totalStockQuantity: 320,
        totalValuation: 1250000,
        lowStockCount: 4,
        outOfStockCount: 1,
        categoryValuation: [{ category: 'RO Systems', quantity: 20, valuation: 400000 }],
        lowStockItems: [
          { productId: 'p-2', productName: 'Sediment Filter', currentStock: 2, minimumAlertStock: 5, status: 'LOW' },
        ],
      });

      const inv = await service.getInventoryAnalytics();
      expect(inv.totalSkuCount).toBe(45);
      expect(inv.totalValuation).toBe(1250000);
      expect(inv.lowStockCount).toBe(4);
      expect(inv.lowStockItems[0].productName).toBe('Sediment Filter');
    });
  });

  describe('Conversion Rate & Inquiry Calculations (Rule 3)', () => {
    it('properly evaluates centralized conversion formula without floating artifacts', async () => {
      vi.mocked(analyticsRepository.getInquiryMetrics).mockResolvedValueOnce({
        totalInquiries: 50,
        newInquiries: 10,
        contactedInquiries: 15,
        qualifiedInquiries: 25,
        convertedInquiries: 15,
        closedInquiries: 10,
        conversionRate: 30.0,
        qualifiedConversionRate: 60.0,
        inquirySourceDistribution: [],
        inquiryTypeDistribution: [],
        inquiryTrend: [],
      });

      vi.mocked(analyticsRepository.getInquiryMetrics).mockResolvedValueOnce({
        totalInquiries: 40,
        newInquiries: 5,
        contactedInquiries: 15,
        qualifiedInquiries: 20,
        convertedInquiries: 10,
        closedInquiries: 10,
        conversionRate: 25.0,
        qualifiedConversionRate: 50.0,
        inquirySourceDistribution: [],
        inquiryTypeDistribution: [],
        inquiryTrend: [],
      });

      const inquiryAnalytics = await service.getInquiryAnalytics({ range: 'this_month' });

      expect(inquiryAnalytics.totalInquiries).toBe(50);
      expect(inquiryAnalytics.convertedInquiries).toBe(15);
      expect(inquiryAnalytics.conversionRate).toBe(30.0);
      expect(inquiryAnalytics.qualifiedConversionRate).toBe(60.0);
      expect(inquiryAnalytics.comparison.conversionRate.current).toBe(30.0);
      expect(inquiryAnalytics.comparison.conversionRate.previous).toBe(25.0);
      expect(inquiryAnalytics.comparison.conversionRate.deltaPercentage).toBe(20);
    });
  });

  describe('Date Bounds Resolution', () => {
    it('correctly resolves 7D range and equivalent previous 7D period', () => {
      const bounds = service.resolveDateBounds({ range: '7D' });
      expect(bounds.current.startDate).toBeInstanceOf(Date);
      expect(bounds.current.endDate).toBeInstanceOf(Date);
      expect(bounds.previous.startDate).toBeInstanceOf(Date);
      expect(bounds.previous.endDate).toBeInstanceOf(Date);

      const currDiffMs = bounds.current.endDate.getTime() - bounds.current.startDate.getTime();
      const prevDiffMs = bounds.previous.endDate.getTime() - bounds.previous.startDate.getTime();
      // Differences must match
      expect(currDiffMs).toBe(prevDiffMs);
    });

    it('correctly resolves custom date boundaries', () => {
      const bounds = service.resolveDateBounds({
        range: 'custom',
        startDate: '2026-06-01',
        endDate: '2026-06-15',
      });

      expect(bounds.startDateStr).toBe('2026-06-01');
      expect(bounds.endDateStr).toBe('2026-06-15');
      expect(bounds.current.startDate.getFullYear()).toBe(2026);
      expect(bounds.current.startDate.getMonth()).toBe(5); // 0-indexed June
      expect(bounds.current.startDate.getDate()).toBe(1);
      expect(bounds.current.endDate.getDate()).toBe(15);
    });
  });

  describe('RBAC & Financial Security Protection', () => {
    it('permits ADMIN and MANAGER to view financial metrics', () => {
      expect(service.checkFinancialPermission('ADMIN')).toBe(true);
      expect(service.checkFinancialPermission('MANAGER')).toBe(true);
    });

    it('denies TECHNICIAN and USER from viewing financial metrics', () => {
      expect(service.checkFinancialPermission('TECHNICIAN')).toBe(false);
      expect(service.checkFinancialPermission('USER')).toBe(false);
      expect(service.checkFinancialPermission(undefined)).toBe(false);
    });
  });
});

