# ANALYTICS_DATA_MAP.md
# SR Enterprises CRM — Authoritative Business Intelligence Data Mapping

This document maps every UI metric in the Dashboard, Reports, and Analytics modules to its authoritative backend database schema source, table, column, filter, and aggregation path.

---

## 1. Executive Dashboard (`/dashboard`)

| Metric Name / UI Element | Visual Location | Authoritative DB Source | Query / Aggregation Logic | Inclusions / Exclusions |
| :--- | :--- | :--- | :--- | :--- |
| **Services Due Today** | Operational Card 1 | `services` | `COUNT(id) WHERE DATE(scheduled_date) = CURRENT_DATE` | Status: `SCHEDULED`, `ASSIGNED`, `IN_PROGRESS`. Excludes `COMPLETED`, `CANCELLED`. |
| **Urgent Services** | Card 1 Subtext / Badge | `services` | `COUNT(id) WHERE priority IN ('URGENT', 'EMERGENCY') AND status != 'COMPLETED' AND status != 'CANCELLED'` | Active urgent requests requiring immediate triage. |
| **New Inquiries** | Operational Card 2 | `inquiries` | `COUNT(id) WHERE created_at >= CURRENT_DATE AND status = 'NEW'` | Inquiries received in the current business day. |
| **Unread Inquiries** | Card 2 Subtext / Badge | `inquiries` | `COUNT(id) WHERE is_read = false AND status != 'CLOSED'` | Unread customer contact requests. |
| **Expiring Warranties** | Operational Card 3 | `warranties` | `COUNT(id) WHERE (status = 'EXPIRING_SOON' OR (end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'))` | Status `ACTIVE` or `EXPIRING_SOON`. Excludes `EXPIRED`, `VOIDED`. |
| **Payments Due** | Operational Card 4 | `invoices` | `COUNT(id) WHERE status IN ('ISSUED', 'PARTIALLY_PAID') AND cancelled_at IS NULL` | Authoritative finalized invoices awaiting settlement. |
| **Payments Overdue** | Card 4 Subtext / Badge | `invoices` | `COUNT(id) WHERE (status = 'OVERDUE' OR (status IN ('ISSUED', 'PARTIALLY_PAID') AND due_date < CURRENT_DATE)) AND cancelled_at IS NULL` | Invoices past contractual payment terms. Fully paid invoices excluded. |
| **Technicians On Duty** | Operational Card 5 | `technicians` | `COUNT(id) WHERE status = 'ACTIVE'` | Currently active service personnel. |
| **Technicians Available** | Card 5 Subtext / Badge | `technicians` + `job_cards` | `COUNT(DISTINCT t.id) WHERE t.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM job_cards jc WHERE jc.technician_id = t.id AND jc.status = 'IN_PROGRESS')` | Active technicians without concurrent in-progress dispatches. |
| **7-Day History Sparklines** | Card Bottom Curves | Respective tables | Daily group counts for last 7 consecutive business dates (`DATE_TRUNC('day', created_at)`). | Zero-filled for dates with 0 activity to preserve continuous sparkline visualization. |
| **Today's Schedule** | Left Column Card | `job_cards` + `services` + `customers` | `SELECT jc.*, s.service_type, s.service_classification, c.display_name FROM job_cards jc JOIN services s ON jc.service_id = s.id JOIN customers c ON s.customer_id = c.id WHERE DATE(jc.scheduled_date) = CURRENT_DATE ORDER BY jc.scheduled_date ASC LIMIT 10` | Real scheduled dispatches for today. |
| **Payment Reminders** | Right Column Card | `invoices` + `customers` | `SELECT inv.*, c.display_name, c.id AS customer_id FROM invoices inv JOIN customers c ON inv.customer_id = c.id WHERE inv.status IN ('OVERDUE', 'ISSUED', 'PARTIALLY_PAID') AND inv.cancelled_at IS NULL ORDER BY inv.due_date ASC LIMIT 5` | Outstanding invoices prioritized by overdue status and nearest due date. |
| **Unread Notifications** | Header Badge | `notifications` | `COUNT(id) WHERE is_read = false` | Real unread alerts for the authenticated user session. |

---

## 2. Reports & Analytics Core Metrics (`/reports` & `/analytics`)

### A. Financial & Revenue Intelligence
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Gross Billed Revenue** | `invoices` | `COALESCE(SUM(total_amount), 0)` | `status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE') AND cancelled_at IS NULL AND created_at BETWEEN :start AND :end`. Excludes `DRAFT` and `CANCELLED`. |
| **Collected Revenue** | `payments` | `COALESCE(SUM(amount), 0)` | `status = 'COMPLETED' AND created_at BETWEEN :start AND :end`. Excludes `FAILED`, `REFUNDED`, `CANCELLED`. |
| **Outstanding Receivables** | `invoices` | `COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)` | `status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE') AND cancelled_at IS NULL`. Calculated as invoice total minus completed payments. |
| **Overdue Receivables** | `invoices` | `COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)` | `(status = 'OVERDUE' OR (status IN ('ISSUED', 'PARTIALLY_PAID') AND due_date < CURRENT_DATE)) AND cancelled_at IS NULL`. |
| **Collection Rate (%)** | `invoices` + `payments` | `(Collected Revenue / Gross Billed Revenue) * 100` | If `Gross Billed == 0`, returns `0%` (safe delta rule). |
| **Service Revenue Breakdown** | `invoice_items` + `invoices` | `SUM(line_total) GROUP BY item_type` | `item_type IN ('PART', 'LABOUR', 'FEE', 'AMC')`. Separates parts vs labour vs service fees. Zero-charge warranty items excluded from customer billing totals. |

### B. Sales & Commercial Intelligence
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Total Sales Volume** | `sales` | `COALESCE(SUM(total_amount), 0)` | `status = 'COMPLETED' AND created_at BETWEEN :start AND :end`. Excludes `CANCELLED`, `DRAFT`. |
| **Sales Unit Count** | `sales` | `COUNT(id)` | `status = 'COMPLETED' AND created_at BETWEEN :start AND :end`. |
| **Average Order Value (AOV)** | `sales` | `Total Sales Volume / Sales Unit Count` | Returns `0` if `Sales Unit Count == 0`. |
| **Product Performance Ranking** | `sale_items` + `sales` | `SUM(quantity) AS units_sold, SUM(line_total) AS revenue GROUP BY product_name_snapshot` | Deterministic sort: `ORDER BY SUM(line_total) DESC, product_name_snapshot ASC`. |
| **Customer Type Sales** | `sales` + `customers` | `SUM(sales.total_amount) GROUP BY customers.customer_type` | Groups by `INDIVIDUAL`, `COMMERCIAL`, `INDUSTRIAL`. |

### C. Product & Inventory Intelligence
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Total Stock Units** | `products` | `COALESCE(SUM(current_stock), 0)` | `is_active = true`. |
| **Low Stock SKU Count** | `products` | `COUNT(id) WHERE current_stock <= min_stock AND current_stock > 0` | Threshold based on per-product `min_stock`. |
| **Out of Stock SKU Count** | `products` | `COUNT(id) WHERE current_stock = 0` | Zero remaining inventory. |
| **Total Inventory Asset Value**| `products` | `COALESCE(SUM(current_stock * unit_cost), 0)` | Real asset valuation based on landed unit cost. |
| **Stock Movement Velocity** | `inventory_transactions` | `SUM(quantity) GROUP BY transaction_type, product_id` | Authoritative stock audit ledger tracking `PURCHASE`, `SALE`, `SERVICE_USAGE`, `ADJUSTMENT`. |

### D. Service & Job Card Operations
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Total Service Requests** | `services` | `COUNT(id)` | Created in selected date range. |
| **Completed Services** | `services` | `COUNT(id) WHERE status = 'COMPLETED'` | Completed in date range. |
| **Service Completion Rate** | `services` | `(Completed Services / Total Services) * 100` | Safe zero division handling. |
| **Job Cards Lifecycle** | `job_cards` | `COUNT(id) GROUP BY status` | State machine: `SCHEDULED`, `ASSIGNED`, `DIAGNOSIS`, `IN_PROGRESS`, `PENDING_PARTS`, `COMPLETED`, `CLOSED`, `CANCELLED`. |
| **Average SLA Completion Time**| `job_cards` | `AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)` | Non-null `completed_at` records. |
| **Warranty vs Paid Ratio** | `services` | `COUNT(id) GROUP BY service_classification` | `service_classification IN ('GENERAL', 'WARRANTY')`. |

### E. Technician Performance
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Assigned Jobs** | `job_cards` | `COUNT(id) WHERE technician_id = :techId` | In selected date range. |
| **Completed Jobs** | `job_cards` | `COUNT(id) WHERE technician_id = :techId AND status IN ('COMPLETED', 'CLOSED')` | In selected date range. |
| **Technician Completion Rate** | `job_cards` | `(Completed Jobs / Assigned Jobs) * 100` | Returns `100%` if `Assigned Jobs == 0`. |
| **Open Backlog** | `job_cards` | `COUNT(id) WHERE technician_id = :techId AND status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')` | Active pending assignments. |

### F. Warranties & Lifecycle Alerts
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Active Warranties** | `warranties` | `COUNT(id) WHERE status = 'ACTIVE' AND end_date >= CURRENT_DATE` | Valid active protection policies. |
| **Expiring in 7 Days** | `warranties` | `COUNT(id) WHERE status IN ('ACTIVE', 'EXPIRING_SOON') AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'` | High-priority renewal alerts. |
| **Expiring in 15 Days** | `warranties` | `COUNT(id) WHERE status IN ('ACTIVE', 'EXPIRING_SOON') AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days'` | Medium-priority renewal alerts. |
| **Expiring in 30 Days** | `warranties` | `COUNT(id) WHERE status IN ('ACTIVE', 'EXPIRING_SOON') AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'` | 30-day renewal pipeline. |
| **Expired Warranties** | `warranties` | `COUNT(id) WHERE status = 'EXPIRED' OR end_date < CURRENT_DATE` | Unrenewed expired assets. |

### G. Customer Growth & Acquisition
| Metric Name | Authoritative DB Source | Calculation Formula | Filters & Rules |
| :--- | :--- | :--- | :--- |
| **Total Customer Base** | `customers` | `COUNT(id) WHERE status = 'ACTIVE'` | Excludes `ARCHIVED`, `SUSPENDED`. |
| **New Customer Adds** | `customers` | `COUNT(id) WHERE created_at BETWEEN :start AND :end` | In selected date range. |
| **Active Accounts** | `customers` + `services` + `sales` | `COUNT(DISTINCT c.id) WHERE EXISTS (SELECT 1 FROM sales s WHERE s.customer_id = c.id AND s.created_at >= CURRENT_DATE - INTERVAL '180 days') OR EXISTS (SELECT 1 FROM services s WHERE s.customer_id = c.id AND s.created_at >= CURRENT_DATE - INTERVAL '180 days')` | Customers with commercial transactions or service tickets in last 6 months. |
| **Customer Type Distribution**| `customers` | `COUNT(id) GROUP BY customer_type` | `INDIVIDUAL`, `COMMERCIAL`, `INDUSTRIAL`. |

---

## 3. Date Boundary & Comparison Definitions
- **Date Boundaries**:
  - `startDate`: `YYYY-MM-DD 00:00:00.000` (Local Business Timezone)
  - `endDate`: `YYYY-MM-DD 23:59:59.999` (Local Business Timezone)
- **Comparison Periods**:
  - `today` vs `yesterday`
  - `this_month` (1st to current date) vs `previous_month` (1st to equivalent previous month date)
  - `last_7_days` (T-7 to T) vs preceding 7 days (T-14 to T-7)
  - `custom` (duration $D = \text{end} - \text{start}$) vs $(\text{start} - D)$ to $\text{start}$
- **Percentage Change**:
  $$\Delta\% = \begin{cases} \text{null (rendered as 'New')} & \text{if } \text{previous} = 0 \text{ and } \text{current} > 0 \\ 0 & \text{if } \text{previous} = 0 \text{ and } \text{current} = 0 \\ \frac{\text{current} - \text{previous}}{\text{previous}} \times 100 & \text{if } \text{previous} > 0 \end{cases}$$
