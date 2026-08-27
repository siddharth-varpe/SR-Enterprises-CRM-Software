# SR Enterprises CRM — Service Billing, Parts, Labour & Service Invoicing Domain

## 1. Domain Architecture & Principles

The **Service Billing Domain** connects completed field operations directly to the central financial ledger without duplicating any accounting or inventory tables.

```mermaid
graph TD
    JobCard[Completed Job Card] -->|evaluates| ServiceBillingEngine[Service Billing Engine]
    ServiceBillingEngine -->|inspects| WarrantyCoverage[Warranty Eligibility]
    ServiceBillingEngine -->|prices| PartsLabour[Spare Parts & Labour Charges]
    ServiceBillingEngine -->|consumes| InventoryLedger[Inventory Balance Deduction]
    ServiceBillingEngine -->|generates| ServiceInvoice[Central Invoice (INV-2026-XXXX)]
    ServiceInvoice -->|receives| PaymentEngine[Payment System (PAY-2026-XXXX)]
    PaymentEngine -->|recalculates| CustomerReceivables[Customer Outstanding Balance]
```

---

## 2. Core Principles & Business Logic

### A. First-Class Invoice Integration
- Service invoices are stored in the primary `invoices` table with `jobCardId` and `serviceId` relationships.
- Uses standard sequence numbers (`INV-YYYY-XXXX`).
- Line items are stored in `invoice_items` with controlled `itemType`:
  - `SPARE_PART`: Replaced physical components (e.g. Membranes, Filters, Pumps, SMPS).
  - `SERVICE`: Technician labor, inspection fee, and doorstep service charges.
  - `PRODUCT`: Add-on complete units.
  - `CUSTOM`: Special technical charges or customizations.

### B. Warranty-Covered vs. Billable Logic
- **Under Warranty**: If the asset is covered by an active warranty (`ACTIVE` status and valid date):
  - Covered parts and labor have `unitPrice: 0.00` and `isWarrantyCovered: true`.
  - Customer charge is ₹0.
  - Line items are preserved with descriptions and standard value snapshots for audit tracking.
- **Partially Covered**: Parts not covered under standard terms are billable at catalog unit prices, while labor is ₹0.
- **Out of Warranty**: All parts and labor are fully billable with 18% GST (or product tax rate) and optional discounts.

### C. Atomic Inventory Stock Movement
- When a physical spare part (`productId` present) is consumed on a service invoice:
  - Inventory stock is atomically decremented via `inventoryRepository.recordAdjustment`.
  - An `inventory_transactions` record is logged with:
    - `type: 'SALE'`
    - `quantity: qty`
    - `referenceType: 'JOB_CARD'`
    - `referenceId: jobCard.id`
    - `reason: 'Service Spare Replacement for Job Card JC-YYYY-XXXX'`

### D. Idempotency & Concurrency Protection
- Pessimistic row locking during invoice generation prevents race conditions.
- Attempting to generate a second invoice for an already invoiced Job Card returns `409 Conflict` (`ALREADY_INVOICED`).

### E. Authoritative Money & Price Snapshots
- Immutable line item snapshots: `nameSnapshot`, `unitPriceSnapshot`, `taxRatePercent`, `taxAmount`, and `lineTotal`.
- Catalog price updates never retroactively mutate finalized historical service invoices.
- Accurate decimal calculation prevents floating-point rounding errors.

---

## 3. API Endpoints Reference

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/service-billing/job-card/:jobCardId` | `invoices.view` | Preview billable charges, parts, and warranty eligibility |
| `POST` | `/api/v1/service-billing/generate` | `invoices.create` | Generate authoritative service invoice with atomic stock deduction |
| `GET` | `/api/v1/job-cards/:id/charges` | `services.view` | Get billable preview for a specific Job Card |
| `POST` | `/api/v1/job-cards/:id/invoice` | `invoices.create` | Direct endpoint to generate invoice from completed Job Card |
| `GET` | `/api/v1/job-cards/:id/invoice` | `services.view` | Retrieve linked invoice for a Job Card |
| `POST` | `/api/v1/payments` | `payments.create` | Record payment against service invoice |
| `GET` | `/api/v1/payments/invoice/:id/balance` | `payments.view` | Get authoritative balance breakdown for service invoice |
| `GET` | `/api/v1/payments/customer/:id/summary` | `payments.view` | Customer financial summary including service invoices |
