# ANALYTICS_ENGINE.md
# SR Enterprises CRM / SRM — Business Intelligence & Reporting Architecture

## 1. Executive Summary & Mission
The SRM Analytics Engine is the single authoritative source of truth for business intelligence, operational metrics, revenue calculations, customer growth analytics, and service performance indicators. 

### Core Architectural Principle
**The frontend MUST NOT independently calculate authoritative business metrics.** 
All aggregations, financial summaries, growth deltas, trend series, and status categorizations are calculated server-side using committed database transactions and strictly typed API response contracts.

```
+---------------------+
| PostgreSQL Database |
+----------+----------+
           |
           v
+---------------------+
| Domain Repositories | (Indexed, Parametrized, Timezone-aware Aggregations)
+----------+----------+
           |
           v
+---------------------+
|  Analytics Service  | (Single Source of Truth, Delta Rules, RBAC Validation)
+----------+----------+
           |
           v
+---------------------+
|     Report APIs     | (/api/v1/analytics/*, /api/v1/dashboard/*)
+----------+----------+
           |
           v
+---------------------+
|    Dashboard / UI   | (Strict UI Lock, Presentation & Number Formatting Only)
+---------------------+
```

---

## 2. Core Metric Definitions & Formulas

### 2.1 Revenue & Financial Formulas
- **Authoritative Revenue Definition**:
  Revenue is defined exclusively as finalized, valid invoices.
  $$\text{Gross Billed Revenue} = \sum \text{invoices.total\_amount} \quad \text{where } \text{status} \in (\text{'ISSUED'}, \text{'PAID'}, \text{'PARTIALLY\_PAID'}, \text{'OVERDUE'}) \land \text{cancelled\_at IS NULL}$$
  - **Inclusions**: Finalized commercial machine sales, replacement spare parts billing, labor charges, AMC fees.
  - **Exclusions**: `DRAFT` invoices, `CANCELLED` invoices, zero-charge warranty replacement items (unless billed to an external insurance/warranty provider).
- **Payment Collection vs Revenue**:
  Payments are cash collections settling receivables, NOT additive revenue. Adding payments to invoice totals is strictly prohibited (Anti-Double-Counting Rule).
- **Authoritative Outstanding Balance**:
  $$\text{Outstanding Balance} = \sum (\text{invoice.total\_amount} - \text{invoice.paid\_amount}) \quad \text{where status} \in (\text{'ISSUED'}, \text{'PARTIALLY\_PAID'}, \text{'OVERDUE'})$$
- **Overdue Invoices**:
  An invoice is classified as Overdue if and only if:
  $$\text{outstanding} > 0 \land \text{due\_date} < \text{CURRENT\_DATE} \land \text{status} \ne \text{'CANCELLED'}$$
  Fully settled invoices (`outstanding = 0`) are never marked overdue.
- **Collection Efficiency / Collection Rate**:
  $$\text{Collection Rate} = \begin{cases} \left(\frac{\text{Collected Revenue}}{\text{Gross Billed Revenue}}\right) \times 100 & \text{if } \text{Gross Billed} > 0 \\ 0\% & \text{if } \text{Gross Billed} = 0 \end{cases}$$

### 2.2 Sales Metrics
- **Total Sales Amount**: Sum of `sales.total_amount` for completed sales orders.
- **Average Order Value (AOV)**: $\frac{\text{Total Sales Amount}}{\text{Completed Sales Count}}$ (with zero-division guard).
- **Product Sales vs Service Revenue**:
  - `Product Sales`: Invoices/sales originating from product catalog orders.
  - `Service Revenue`: Invoices originating from service tickets (`parts_charge` + `labor_charge` + `service_fee`).

### 2.3 Product & Inventory Metrics
- **Top Performing Products**:
  Ranked by total revenue generated and unit volume. To ensure deterministic pagination and consistent reports across refreshes, secondary sort by `product_name ASC` is strictly enforced.
- **Inventory Stock Valuation**:
  $$\text{Total Stock Value} = \sum (\text{products.current\_stock} \times \text{products.unit\_cost})$$
- **Low Stock Threshold**: $\text{current\_stock} \le \text{products.min\_stock} \land \text{current\_stock} > 0$.
- **Out of Stock**: $\text{current\_stock} = 0$.

### 2.4 Service & Job Card Operations
- **Service Completion Rate**:
  $$\text{Completion Rate} = \left(\frac{\text{Completed Services}}{\text{Total Services}}\right) \times 100$$
- **Job Card State Machine Flow**:
  $$\text{SCHEDULED} \rightarrow \text{ASSIGNED} \rightarrow \text{DIAGNOSIS} \rightarrow \text{IN\_PROGRESS} \rightarrow \text{PENDING\_PARTS} \rightarrow \text{COMPLETED} \rightarrow \text{CLOSED}$$
- **Average Resolution SLA Time**:
  Calculated as arithmetic mean of elapsed duration: $(\text{job\_cards.completed\_at} - \text{job\_cards.created\_at})$ in hours.

### 2.5 Technician Analytics
- **Assigned vs Completed**: Per-technician workload and throughput.
- **Access Control**: Technician metrics containing financial compensation or organization-wide revenue are restricted to `Super Admin`, `Admin`, and `Staff` roles. Technicians only receive operational metrics for their own assigned tickets.

### 2.6 Warranty Lifecycle
- **Active Warranties**: `warranties.status = 'ACTIVE' AND end_date >= CURRENT_DATE`.
- **Expiring Tiers**:
  - `7 Days`: `end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 days`
  - `15 Days`: `end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 15 days`
  - `30 Days`: `end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 days`
- **Warranty-Covered Service Value**: Tracked for operational cost accounting, but excluded from customer cash collections.

---

## 3. Date Range Engine & Timezone Strategy

### 3.1 Date Boundary Rules
For any selected business date range $[D_{\text{start}}, D_{\text{end}}]$, queries must include:
$$\text{timestamp} \ge D_{\text{start}}\text{T00:00:00.000} \land \text{timestamp} \le D_{\text{end}}\text{T23:59:59.999}$$
This prevents midnight timestamp boundary truncation.

### 3.2 Timezone Normalization
- The canonical business timezone is configured to `Asia/Kolkata` (IST, UTC+05:30).
- Time-series aggregations (`DATE_TRUNC('day', ...)`) are evaluated in the configured business timezone to guarantee identical metrics across disparate client locales.

### 3.3 Continuous Timeline Filling
For time-series charts (e.g. daily sales, revenue trajectory), queries or service aggregation layers fill missing dates with `0` values. This ensures area/line charts render smooth, continuous timelines without skips or collapsed points.

### 3.4 Zero-Denominator Safeguard
All period-over-period percentage delta calculations ($\Delta\%$) apply zero-safe rules:
- $\text{previous} = 0 \land \text{current} > 0 \implies \Delta\% = \text{null}$ (displayed as `New` / `+100%`, trend `up`).
- $\text{previous} = 0 \land \text{current} = 0 \implies \Delta\% = 0$, trend `neutral`.
- No `NaN` or `Infinity` is ever returned across any API contract.

---

## 4. Security, Authorization & Tenancy

### 4.1 RBAC Enforcement
| Route | Minimum Permission | Role Restrictions |
| :--- | :--- | :--- |
| `GET /api/v1/analytics/overview` | `analytics.view` | Open to all staff with analytics view |
| `GET /api/v1/analytics/sales` | `sales.view` | Sales & management roles |
| `GET /api/v1/analytics/revenue` | `invoices.view` | Restricted to `Super Admin`, `Admin`, `Staff` |
| `GET /api/v1/analytics/payments` | `payments.view` | Restricted to `Super Admin`, `Admin`, `Staff` |
| `GET /api/v1/analytics/customers` | `customers.view` | Customer service & sales |
| `GET /api/v1/analytics/products` | `products.view` | Inventory & sales staff |
| `GET /api/v1/analytics/inventory` | `inventory.view` | Warehouse & management staff |
| `GET /api/v1/analytics/services` | `services.view` | Service managers & technicians |
| `GET /api/v1/analytics/jobs` | `services.view` | Service operations |
| `GET /api/v1/analytics/technicians` | `technicians.view` | Restricted management view |
| `GET /api/v1/analytics/warranties` | `warranties.view` | Warranty & customer support |
| `GET /api/v1/analytics/inquiries` | `inquiries.view` | Lead management & sales |
| `GET /api/v1/analytics/export` | `reports.export` | Audited CSV export generation |

### 4.2 SQL Injection & Parameter Validation
- All date filters, ranges, categories, and query parameters are validated using strict Zod schemas (`analyticsDateFilterSchema`, `analyticsExportQuerySchema`).
- Dynamic user input strings are never concatenated directly into SQL clauses; Drizzle ORM parameterized SQL template literals (`sql\`...\``) are used exclusively.
- Sorting fields are whitelisted against safe column identifiers.

---

## 5. Performance Optimization & Query Tuning
1. **Targeted Projections**: Analytics queries explicitly select aggregated scalar expressions (`SUM`, `COUNT`, `AVG`) rather than executing `SELECT *` across large transactional tables.
2. **N+1 Prevention**: Grouped queries and `JOIN` aggregations execute in single database roundtrips.
3. **Database Indexing**:
   - `invoices`: `(created_at, status)`, `(due_date, status)`
   - `payments`: `(created_at, status)`
   - `sales`: `(created_at, status)`
   - `services`: `(created_at, status, priority)`
   - `job_cards`: `(created_at, status, technician_id)`
   - `warranties`: `(end_date, status)`
   - `products`: `(is_active, current_stock, min_stock)`
