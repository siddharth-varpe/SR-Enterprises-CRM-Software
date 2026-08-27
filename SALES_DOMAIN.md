# SR ENTERPRISES CRM / SRM
## SALES DOMAIN ARCHITECTURE & TRANSACTION SPECIFICATION

---

### 1. Domain Principles & Relationships
In SR Enterprises CRM / SRM, a **Sale** represents a commercial sales order linking customers, catalog products, authoritative calculations, inventory stock movement, and customer assets:

```
┌─────────────────────────────────────────────────────────────┐
│                        SALES DOMAIN                         │
│                                                             │
│         Customer                     Product                │
│    (Account / Entity)          (Catalog / Pricing)          │
│              │                               │              │
│              └───────────────┬───────────────┘              │
│                              ▼                              │
│                            Sale                             │
│                  (SALE-2026-XXXX Sequence)                  │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│          SaleItem       SaleItem        SaleItem            │
│       (Item Snapshot)(Item Snapshot) (Item Snapshot)        │
│              │               │               │              │
│              └───────────────┼───────────────┘              │
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              ▼                               ▼              │
│     inventory_balances              customer_assets         │
│   (- Quantity on Confirm)     (Registered Machine Unit)     │
│   (+ Quantity on Cancel)      (Unique Serial / Warranty)    │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Lifecycle States & Rules

| State | Inventory Impact | Editability | Next Allowed States |
| :--- | :--- | :--- | :--- |
| `DRAFT` | **No stock reduction** | Fully editable | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | **Deducts stock atomically** | Protected / Immutable | `CANCELLED` (triggers stock reversal) |
| `CANCELLED` | **Reverses stock (+ quantity)** | Immutable archive | None (terminal state) |

---

### 3. Financial Calculation & Rounding Rules
- **Line Subtotal**: $\text{Quantity} \times \text{Unit Price Snapshot}$
- **Line Taxable**: $\max(0, \text{Line Subtotal} - \text{Line Discount})$
- **Line Tax**: $\text{Round2}(\text{Line Taxable} \times (\text{Tax Rate} / 100))$
- **Line Total**: $\text{Round2}(\text{Line Taxable} + \text{Line Tax})$
- **Document Total**: $\max(0, \text{Round2}(\sum \text{Line Subtotals} - \sum \text{Discounts} + \sum \text{Taxes}))$

---

### 4. Sales Database Schema

#### `sales`
- `id`: UUID PRIMARY KEY
- `sale_number`: Text UNIQUE (`SALE-2026-XXXX`)
- `customer_id`: UUID FOREIGN KEY $\rightarrow$ `customers.id`
- `sale_date`: Timestamp with timezone
- `status`: Enum (`DRAFT`, `COMPLETED`, `CANCELLED`)
- `subtotal`: `numeric(12, 2)`
- `discount_amount`: `numeric(12, 2)`
- `tax_amount`: `numeric(12, 2)`
- `total_amount`: `numeric(12, 2)`
- `notes`: Text
- `created_by`: UUID $\rightarrow$ `users.id`
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone
- `cancelled_at`: Timestamp with timezone
- `cancel_reason`: Text

#### `sale_items`
- `id`: UUID PRIMARY KEY
- `sale_id`: UUID FOREIGN KEY $\rightarrow$ `sales.id`
- `product_id`: UUID FOREIGN KEY $\rightarrow$ `products.id`
- `product_name_snapshot`: Text
- `sku_snapshot`: Text
- `quantity`: Integer ($\ge 1$)
- `unit_price_snapshot`: `numeric(12, 2)`
- `discount_amount`: `numeric(12, 2)`
- `tax_rate_percent`: `numeric(5, 2)`
- `tax_amount`: `numeric(12, 2)`
- `line_total`: `numeric(12, 2)`
- `warranty_months`: Integer
- `service_interval_months`: Integer
- `serial_number`: Text (nullable for non-serialized components)

---

### 5. Sales API Endpoints

| Method | Endpoint | RBAC Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sales` | `sales.view` | Paginated sales list with status & customer search |
| `GET` | `/api/v1/sales/:id` | `sales.view` | Single sale with line items, customer, and assets |
| `POST` | `/api/v1/sales` | `sales.create` | Create new DRAFT or COMPLETED sale |
| `PATCH` | `/api/v1/sales/:id` | `sales.update` | Update draft sale lines or notes |
| `POST` | `/api/v1/sales/:id/confirm` | `sales.confirm` | Confirm sale, deduct stock, register asset & invoice |
| `POST` | `/api/v1/sales/:id/cancel` | `sales.cancel` | Cancel sale and reverse inventory stock |
| `GET` | `/api/v1/customers/:id/sales` | `sales.view` | Customer sales transaction history |
