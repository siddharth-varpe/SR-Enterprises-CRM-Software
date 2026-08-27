# SRM System Administration & Business Configuration Specification

## 1. Overview

Phase 27 establishes the centralized, strongly typed, auditable configuration system for SR Enterprises CRM/SRM. It allows authorized administrators to manage company branding, tax rates, invoice parameters, numbering formats, warranties, service SLAs, inventory rules, notifications, and security policies without touching source code.

---

## 2. Configuration Hierarchy & Principles

```
[System Defaults (Immutable Fallback)]
                 ↓
[Database AppSettings (PostgreSQL JSONB)]
                 ↓
[In-Memory Cached Configuration (5-min TTL)]
                 ↓
[Domain Services (Invoices, Sales, Warranties, Numbering, Services)]
```

### Core Rules:
1. **Zero Historical Mutation**: Modifying settings (e.g. changing default tax rate from 18% to 20%, or warranty duration from 12 to 24 months) only applies to future transactions. All past invoices, sales, and warranties retain their immutable historical snapshot values.
2. **Optimistic Concurrency Protection**: Every category update passes `expectedVersion`. Conflicting parallel administrator edits return HTTP 409 Conflict.
3. **Audit Trail**: Every category change or reset writes an immutable audit record to `audit_logs` capturing `beforeState`, `afterState`, and the administrator ID.
4. **Secret Isolation**: Technical runtime variables (`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`) are strictly managed via environment variables and never returned in configuration endpoints.

---

## 3. Configuration Categories & System Defaults

| Category | Description | Key Fields & Defaults | Valid Range / Constraints |
|---|---|---|---|
| **`SYSTEM`** | Core system localization | `appName: 'SR Enterprises CRM / SRM'`, `timezone: 'Asia/Kolkata'`, `currency: 'INR'`, `currencySymbol: '₹'`, `dateFormat: 'DD/MM/YYYY'`, `defaultPageSize: 25` | Valid IANA timezone, non-empty currency |
| **`BUSINESS`** | Company profile & legal identity | `businessName: 'SR Enterprises'`, `city: 'Pune'`, `phone: '9876543210'`, `email: 'support@srenterprises.com'`, `gstin: '27AAAAA0000A1Z5'`, `panNumber: 'AAAAA0000A'` | 10-digit phone, valid email, 15-char GSTIN, 6-digit PIN |
| **`TAX`** | Financial tax rates | `taxEnabled: true`, `defaultTaxRatePercent: 18.00`, `taxInclusivePricing: false`, `defaultHsnSac: '84212190'` | Rate: 0.00% to 100.00% |
| **`INVOICE`** | Invoicing rules & templates | `prefix: 'INV'`, `startingNumber: 1`, `paymentTermsDays: 30`, `showTaxBreakdown: true`, `showGst: true`, `defaultNotes: '...'` | Prefix: Uppercase alphanumeric, Terms: 0-365 days |
| **`PAYMENT`** | Payment & receipt terms | `defaultPaymentMethod: 'UPI'`, `defaultDuePeriodDays: 30`, `allowPartialPayments: true`, `autoGenerateReceipts: true` | Valid `PaymentMethod` enum |
| **`SALES`** | Sales flow automations | `defaultSalesStatus: 'COMPLETED'`, `autoGenerateInvoiceOnSale: true`, `autoCreateAssetOnSale: true`, `autoCreateWarrantyOnSale: true` | Booleans |
| **`SERVICE`** | Service maintenance & SLA | `defaultServiceDurationMinutes: 60`, `defaultServicePriority: 'MEDIUM'`, `slaHours: 24`, `autoCreateJobCardOnService: true` | Duration: 15-1440 min, SLA: 1-720 hours |
| **`JOB_CARD`** | Field work orders | `prefix: 'JC'`, `defaultPriority: 'NORMAL'`, `requireCustomerSignature: false`, `requireOtpVerification: false` | Prefix: Uppercase alphanumeric |
| **`WARRANTY`** | Machine warranty parameters | `defaultWarrantyMonths: 12`, `defaultServiceIntervalMonths: 6`, `expiryNotificationThresholdDays: 30`, `allowAmcUpgrade: true` | Warranty: 0-120 months, Interval: 1-36 months |
| **`INVENTORY`** | Stock & warehouse management | `lowStockThreshold: 5`, `allowNegativeStock: false`, `valuationMethod: 'FIFO'`, `skuPrefix: 'SR'` | Threshold: 0-10000 |
| **`NOTIFICATION`**| Alert & reminder intervals | `warrantyExpiryReminderDays: [30, 15, 7]`, `invoiceDueReminderDays: [7, 3, 1]`, `inAppEnabled: true`, `whatsappEnabled: true` | Days: 1-365 |
| **`NUMBERING`** | Business document prefixes | `customerPrefix: 'CUST'`, `invoicePrefix: 'INV'`, `salePrefix: 'SALE'`, `servicePrefix: 'SRV'`, `padding: 4`, `yearReset: true` | Padding: 2-10, Uppercase prefixes |
| **`SECURITY`** | Access & authentication policy | `sessionTimeoutMinutes: 1440`, `maxLoginAttempts: 5`, `lockoutDurationMinutes: 15`, `passwordMinLength: 8` | Min password length: 8-128 |

---

## 4. API Endpoints

- `GET /api/v1/settings/public`: Public metadata (appName, currency, logo, branding, tax rate) - Unauthenticated.
- `GET /api/v1/settings/health`: Configuration health and schema validity report (`settings.view`).
- `GET /api/v1/settings`: Retrieve all categories (`settings.view`).
- `GET /api/v1/settings/:category`: Retrieve single category with version metadata (`settings.view`).
- `PATCH /api/v1/settings/:category`: Update category with optimistic locking (`settings.manage` or domain-specific permission).
- `POST /api/v1/settings/:category/reset`: Reset category to system defaults (requires `confirmation: 'RESET'`).
