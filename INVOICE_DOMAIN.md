# SR ENTERPRISES CRM / SRM
## INVOICE DOMAIN ARCHITECTURE & FINANCIAL SPECIFICATION

---

### 1. Domain Overview & Separation of Concerns
In SR Enterprises CRM / SRM, financial management separates commercial orders (`SALE`), financial billing documents (`INVOICE`), and actual fund receipts (`PAYMENT`):

```
┌───────────────────────────────────────────────────────────────┐
│                        INVOICE DOMAIN                         │
│                                                               │
│          Customer                                Sale         │
│     (Entity / Account)                  (Commercial Order)    │
│              │                                    │           │
│              └────────────────┬───────────────────┘           │
│                               ▼                               │
│                            Invoice                            │
│                   (INV-2026-XXXX Sequence)                    │
│                               │                               │
│              ┌────────────────┼────────────────┐              │
│              ▼                ▼                ▼              │
│         InvoiceItem      InvoiceItem      InvoiceItem         │
│       (Item Snapshot)  (Item Snapshot)  (Item Snapshot)       │
│                               │                               │
│              ┌────────────────┴────────────────┐              │
│              ▼                                 ▼              │
│        Authoritative                     Historical           │
│         Calculation                      Immutability         │
│     (Subtotal/Tax/Total)             (Snapshots Frozen)       │
└───────────────────────────────────────────────────────────────┘
```

- **SALE**: Commercial agreement specifying products, quantities, and agreed pricing.
- **INVOICE**: Formal financial document issued to the customer establishing legal receivables.
- **PAYMENT**: Physical or digital funds received (Cash, UPI, Card, Bank Transfer) reconciling outstanding balances (implemented in Phase 20).

---

### 2. Invoice Lifecycle & Immutability Rules

| Status | Editability | Next Allowed States | Description |
| :--- | :--- | :--- | :--- |
| `DRAFT` | **Editable** (notes, terms, lines) | `ISSUED`, `CANCELLED` | Preliminary invoice prior to official issue. |
| `ISSUED` | **Immutable** (protected from PATCH) | `CANCELLED` | Official financial document with locked historical snapshots. |
| `CANCELLED`| **Terminal** (strictly immutable) | None | Preserved historical record; original invoice number and values cannot be deleted or re-issued. |

---

### 3. Authoritative Tax & Financial Formulas
Financial calculation uses deterministic 2-decimal precision banker's rounding:
- $\text{Line Subtotal} = \text{Quantity} \times \text{Unit Price Snapshot}$
- $\text{Line Taxable} = \max(0, \text{Line Subtotal} - \text{Line Discount})$
- $\text{Line Tax} = \text{Round2}(\text{Line Taxable} \times (\text{Tax Rate} / 100))$
- $\text{Line Total} = \text{Round2}(\text{Line Taxable} + \text{Line Tax})$
- $\text{Invoice Subtotal} = \sum \text{Line Subtotals}$
- $\text{Invoice Total Discount} = \text{Round2}(\sum \text{Line Discounts} + \text{Document Extra Discount})$
- $\text{Invoice Taxable} = \max(0, \text{Invoice Subtotal} - \text{Invoice Total Discount})$
- $\text{Invoice Total Tax} = \sum \text{Line Taxes}$
- $\text{Invoice Grand Total} = \max(0, \text{Round2}(\text{Invoice Taxable} + \text{Invoice Total Tax}))$

---

### 4. Database Schema Structure

#### `invoices` Table
- `id`: UUID PRIMARY KEY
- `invoice_number`: Text UNIQUE (`INV-2026-XXXX`)
- `customer_id`: UUID FOREIGN KEY $\rightarrow$ `customers.id`
- `sale_id`: UUID NULLABLE FOREIGN KEY $\rightarrow$ `sales.id`
- `invoice_date`: Timestamp with timezone
- `due_date`: Timestamp with timezone
- `subtotal`: `numeric(12, 2)`
- `discount_amount`: `numeric(12, 2)`
- `tax_amount`: `numeric(12, 2)`
- `total_amount`: `numeric(12, 2)`
- `status`: Enum (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`)
- `notes`: Text
- `terms_and_conditions`: Text
- `created_by`: UUID $\rightarrow$ `users.id`
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone
- `cancelled_at`: Timestamp with timezone
- `cancel_reason`: Text

#### `invoice_items` Table
- `id`: UUID PRIMARY KEY
- `invoice_id`: UUID FOREIGN KEY $\rightarrow$ `invoices.id` (ON DELETE CASCADE)
- `product_id`: UUID NULLABLE FOREIGN KEY $\rightarrow$ `products.id`
- `item_type`: Enum (`PRODUCT`, `SERVICE`, `SPARE_PART`, `CUSTOM`)
- `name_snapshot`: Text
- `description_snapshot`: Text
- `quantity`: Integer ($\ge 1$)
- `unit_price_snapshot`: `numeric(12, 2)`
- `discount_amount`: `numeric(12, 2)`
- `tax_rate_percent`: `numeric(5, 2)`
- `tax_amount`: `numeric(12, 2)`
- `line_total`: `numeric(12, 2)`
- `created_at`: Timestamp with timezone

---

### 5. API Endpoints Matrix

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/invoices` | `invoices.view` | Paginated invoice directory with search, status filters, date range, and payment balances |
| `GET` | `/api/v1/invoices/:id` | `invoices.view` | Single invoice detail with line item snapshots, customer data, addresses, and payment logs |
| `POST` | `/api/v1/invoices` | `invoices.create` | Create direct invoice (DRAFT or ISSUED) with authoritative line calculations |
| `PATCH` | `/api/v1/invoices/:id` | `invoices.update` | Update draft invoice only (notes, terms, due date) |
| `POST` | `/api/v1/invoices/:id/finalize` | `invoices.update` | Finalize draft invoice (DRAFT $\rightarrow$ ISSUED) and freeze snapshots |
| `POST` | `/api/v1/invoices/:id/cancel` | `invoices.cancel` | Cancel issued invoice preserving financial history and reason |
| `POST` | `/api/v1/sales/:id/invoice` | `invoices.create` | Generate authoritative invoice from sale with duplicate prevention |
| `GET` | `/api/v1/customers/:id/invoices` | `invoices.view` | Customer-specific invoice history |
