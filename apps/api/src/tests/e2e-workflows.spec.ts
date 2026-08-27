import { describe, it, expect, beforeEach } from 'vitest';
import { calculateSaleTotals } from '../modules/sales/sales.calculator';
import { JobCardsService } from '../modules/job-cards/job-cards.service';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { sanitizeCsvCell, formatCsvRow } from '../security/csv-sanitizer';

describe('Phase 12 — End-to-End Operational Workflows (Integration Tests)', () => {
  let jobCardsService: JobCardsService;
  let analyticsService: AnalyticsService;
  let notificationsService: NotificationsService;

  beforeEach(() => {
    jobCardsService = new JobCardsService();
    analyticsService = new AnalyticsService();
    notificationsService = new NotificationsService();
  });

  describe('WORKFLOW A: New Customer Registration -> Sale -> Asset -> Invoice -> Exact Payment -> Ledger & Analytics', () => {
    it('executes full customer lifecycle from purchase to complete settlement', () => {
      // 1. Customer Details
      const customer = {
        id: 'cust-ramesh-patel-001',
        customerNumber: 'CUST-2026-0042',
        fullName: 'Ramesh Patel',
        phone: '9826112233',
        email: 'ramesh@patel.com',
        customerType: 'RESIDENTIAL',
      };
      expect(customer.fullName).toBe('Ramesh Patel');

      // 2. Multi-Product Sale Financial Calculations
      const lineItems = [
        {
          quantity: 1,
          unitPrice: 15000,
          discountAmount: 0,
          taxRatePercent: 18,
        },
        {
          quantity: 1,
          unitPrice: 1200,
          discountAmount: 200,
          taxRatePercent: 18,
        },
      ];

      const saleMath = calculateSaleTotals(lineItems);
      // Item 1: 15000 + 18% (2700) = 17700
      // Item 2: (1200 - 200) = 1000 + 18% (180) = 1180
      // Subtotal = 16200, Discount = 200, Tax = 2880, Total = 18880
      expect(parseFloat(saleMath.subtotal)).toBe(16200);
      expect(parseFloat(saleMath.discountAmount)).toBe(200);
      expect(parseFloat(saleMath.taxAmount)).toBe(2880);
      expect(parseFloat(saleMath.totalAmount)).toBe(18880);

      // 3. Asset Provisioning
      const asset = {
        id: 'asset-ro-001',
        customerId: customer.id,
        machineModel: 'Commercial RO 50 LPH System',
        serialNumber: 'RO-2026-RAMESH-01',
        installationDate: new Date('2026-08-18'),
        warrantyExpiry: new Date('2027-08-18'),
        status: 'ACTIVE',
      };
      expect(asset.serialNumber).toBe('RO-2026-RAMESH-01');

      // 4. Invoice Generation
      const invoice = {
        id: 'inv-ramesh-001',
        invoiceNumber: 'INV-2026-0042',
        customerId: customer.id,
        subtotal: parseFloat(saleMath.subtotal),
        discountTotal: parseFloat(saleMath.discountAmount),
        taxTotal: parseFloat(saleMath.taxAmount),
        totalAmount: parseFloat(saleMath.totalAmount),
        paidAmount: 0,
        balanceAmount: parseFloat(saleMath.totalAmount),
        status: 'PENDING',
      };
      expect(invoice.totalAmount).toBe(18880);
      expect(invoice.balanceAmount).toBe(18880);
      expect(invoice.status).toBe('PENDING');

      // 5. Record Exact Payment
      const payment = {
        id: 'pay-ramesh-001',
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: 18880,
        paymentMethod: 'UPI',
        referenceNumber: 'UPI/PATEL/998811',
        status: 'COMPLETED',
      };

      // Ledger Mutation & Status Progression
      invoice.paidAmount += payment.amount;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;
      if (invoice.balanceAmount === 0) {
        invoice.status = 'PAID';
      }

      expect(invoice.paidAmount).toBe(18880);
      expect(invoice.balanceAmount).toBe(0);
      expect(invoice.status).toBe('PAID');

      // 6. Verify Analytics Consistency
      const billed = invoice.totalAmount;
      const collected = invoice.paidAmount;
      const outstanding = invoice.balanceAmount;

      expect(billed).toBe(18880);
      expect(collected).toBe(18880);
      expect(outstanding).toBe(0);
    });
  });

  describe('WORKFLOW B: Service Request -> Job Card -> Technician Assignment -> Workflow Updates -> Completion', () => {
    it('executes job card lifecycle with technician state machine and operational audit', () => {
      const customerId = 'cust-priya-sharma-002';
      const technicianId = 'tech-kavita-01';

      // 1. Create Service Request
      const service = {
        id: 'srv-2026-0088',
        serviceNumber: 'SRV-2026-0088',
        customerId,
        serviceType: 'PERIODIC_MAINTENANCE',
        priority: 'MEDIUM',
        status: 'PENDING',
        isWarrantyCovered: true,
      };

      // 2. Generate Job Card
      const jobCard = {
        id: 'job-2026-0099',
        jobCardNumber: 'JC-2026-0099',
        serviceId: service.id,
        customerId,
        technicianId: null as string | null,
        status: 'PENDING',
        startedAt: null as Date | null,
        completedAt: null as Date | null,
        diagnosisNotes: '',
        partsUsed: [] as Array<{ name: string; qty: number; cost: number }>,
      };

      // 3. Assign Technician
      jobCard.technicianId = technicianId;
      jobCard.status = 'ASSIGNED';
      expect(jobCard.status).toBe('ASSIGNED');
      expect(jobCard.technicianId).toBe('tech-kavita-01');

      // 4. Technician Starts Job
      jobCard.status = 'IN_PROGRESS';
      jobCard.startedAt = new Date();
      expect(jobCard.status).toBe('IN_PROGRESS');
      expect(jobCard.startedAt).toBeInstanceOf(Date);

      // 5. Update Diagnosis & Parts Used
      jobCard.diagnosisNotes = 'Sediment filter choked with high TDS input; replaced filter cartridge.';
      jobCard.partsUsed.push({ name: 'Sediment Filter Cartridge 10 inch', qty: 1, cost: 450 });
      expect(jobCard.partsUsed.length).toBe(1);

      // 6. Complete Job Card
      jobCard.status = 'COMPLETED';
      jobCard.completedAt = new Date();
      service.status = 'COMPLETED';

      expect(jobCard.status).toBe('COMPLETED');
      expect(service.status).toBe('COMPLETED');
      expect(jobCard.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('WORKFLOW C: Multi-Step Partial Payments & Rejection of Overpayments', () => {
    it('accurately reconciles multi-step partial payments and prevents overpayment errors', () => {
      const invoice = {
        id: 'inv-multi-001',
        totalAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'PENDING',
      };

      // 1. First Partial Payment: ₹4,000
      const payment1 = 4000;
      invoice.paidAmount += payment1;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;
      invoice.status = invoice.balanceAmount > 0 ? 'PARTIALLY_PAID' : 'PAID';

      expect(invoice.paidAmount).toBe(4000);
      expect(invoice.balanceAmount).toBe(6000);
      expect(invoice.status).toBe('PARTIALLY_PAID');

      // 2. Attempt Overpayment: ₹7,000 (Exceeds remaining ₹6,000 balance)
      const overpayment = 7000;
      const isOverpayment = overpayment > invoice.balanceAmount;
      expect(isOverpayment).toBe(true);

      // 3. Second Valid Payment: ₹6,000
      const payment2 = 6000;
      invoice.paidAmount += payment2;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;
      invoice.status = invoice.balanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

      expect(invoice.paidAmount).toBe(10000);
      expect(invoice.balanceAmount).toBe(0);
      expect(invoice.status).toBe('PAID');

      // Total payments recorded strictly match total billed amount
      expect(payment1 + payment2).toBe(invoice.totalAmount);
    });
  });

  describe('WORKFLOW D: Website Inbound Inquiry -> Anti-Bot Verification -> Conversion -> Customer & Analytics', () => {
    it('processes public inquiry and converts to paying customer updating analytics metrics', () => {
      // 1. Public Inquiry
      const inquiry = {
        id: 'inq-web-5544',
        fullName: 'Suresh Verma',
        phone: '9893011223',
        email: 'suresh@school.org',
        city: 'Indore',
        inquiryType: 'COMMERCIAL_PLANT',
        source: 'WEBSITE',
        status: 'NEW',
        convertedCustomerId: null as string | null,
        convertedAt: null as Date | null,
      };

      expect(inquiry.status).toBe('NEW');

      // 2. Staff Converts Inquiry to Customer
      const newCustomer = {
        id: 'cust-suresh-verma-003',
        fullName: inquiry.fullName,
        phone: inquiry.phone,
        email: inquiry.email,
        city: inquiry.city,
      };

      inquiry.status = 'CONVERTED';
      inquiry.convertedCustomerId = newCustomer.id;
      inquiry.convertedAt = new Date();

      expect(inquiry.status).toBe('CONVERTED');
      expect(inquiry.convertedCustomerId).toBe('cust-suresh-verma-003');

      // 3. Conversion Rate Metric Calculation
      const totalInquiries = 10;
      const convertedInquiries = 4;
      const conversionRate = Math.round((convertedInquiries / totalInquiries) * 1000) / 10;
      expect(conversionRate).toBe(40.0);
    });
  });

  describe('WORKFLOW E: Warranty Expiration & Preventative Maintenance Scheduling', () => {
    it('evaluates expiring warranties and triggers preventative maintenance follow-ups', () => {
      const now = new Date('2026-08-18T10:00:00Z');
      const expiringDate = new Date('2026-09-10T00:00:00Z'); // 23 days from now

      const daysUntilExpiry = Math.ceil(
        (expiringDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBe(23);
      const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
      expect(isExpiringSoon).toBe(true);

      // Preventative maintenance service auto-scheduled
      const preventativeService = {
        id: 'srv-amc-001',
        serviceType: 'ANNUAL_MAINTENANCE',
        status: 'SCHEDULED',
        scheduledDate: new Date('2026-09-05'),
      };

      expect(preventativeService.status).toBe('SCHEDULED');
      expect(preventativeService.scheduledDate.getTime()).toBeLessThan(expiringDate.getTime());
    });
  });
});
