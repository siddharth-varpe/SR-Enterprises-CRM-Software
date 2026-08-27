# SR ENTERPRISES CRM / SRM
## INVENTORY DOMAIN ARCHITECTURE & AUDIT SPECIFICATION

---

### 1. Domain Principles & Separation
Inventory management in SR Enterprises CRM / SRM is built around transactional stock integrity and double-entry style ledger accountability:

1. **Product is NOT Inventory**: A product defines the item model and pricing; inventory defines physical units in stock.
2. **Authoritative Stock Source**: Current stock balances (`inventory_balances`) are authoritative and computed via database updates.
3. **Immutable Audit Ledger**: Every quantity change generates an immutable record in `inventory_transactions` capturing previous stock, resulting stock, direction/type, reason, and actor ID.
4. **Negative Stock Prevention**: Stock deductions that exceed available balance are rejected with `400 INSUFFICIENT_STOCK`.

```
┌─────────────────────────────────────────────────────────────┐
│                      INVENTORY DOMAIN                       │
│                                                             │
│  ┌────────────────────────┐      ┌────────────────────────┐ │
│  │   Purchase Inward      │      │   Sales Orders Outward │ │
│  │ (PURCHASE / RETURN)    │      │ (SALE / ADJUSTMENT_OUT)│ │
│  └───────────┬────────────┘      └───────────┬────────────┘ │
│              │                               │              │
│              └───────────────┬───────────────┘              │
│                              ▼                              │
│                 Atomic Stock Calculation                    │
│               [Check Stock -> Deduct/Add]                   │
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              ▼                               ▼              │
│     inventory_balances              inventory_transactions  │
│    (Current Quantity, Alerts)      (Immutable Audit Ledger) │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Inventory Transaction Types

| Transaction Type | Direction | Business Trigger |
| :--- | :--- | :--- |
| `PURCHASE` | `+ INWARD` | Goods received from manufacturer or distributor |
| `SALE` | `- OUTWARD` | Units sold to customer via sales order execution |
| `RETURN` | `+ INWARD` | Units returned by customer or RMA exchange |
| `ADJUSTMENT_IN` | `+ INWARD` | Physical audit count surplus correction |
| `ADJUSTMENT_OUT`| `- OUTWARD`| Physical audit count discrepancy write-off |
| `DAMAGE` | `- OUTWARD` | Damaged / broken items decommissioned from stock |
| `TRANSFER` | `+/- BALANCED` | Internal transfers between locations/vehicles |

---

### 3. Inventory Database Schema

#### `inventory_balances`
- `id`: UUID PRIMARY KEY
- `product_id`: UUID FOREIGN KEY $\rightarrow$ `products.id` (UNIQUE)
- `current_stock`: Integer (Authoritative stock level)
- `minimum_alert_stock`: Integer (Low stock reorder threshold, default 5)
- `updated_at`: Timestamp with timezone

#### `inventory_transactions`
- `id`: UUID PRIMARY KEY
- `product_id`: UUID FOREIGN KEY $\rightarrow$ `products.id`
- `type`: Enum (`PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DAMAGE`, `TRANSFER`)
- `quantity`: Positive integer
- `previous_stock`: Integer
- `resulting_stock`: Integer
- `reason`: Text (Mandatory audit reason)
- `reference_type`: Text (`PURCHASE_ORDER`, `SALE`, `MANUAL`, `AUDIT`)
- `reference_id`: Text (Identifier of triggering document)
- `actor_id`: UUID $\rightarrow$ `users.id`
- `actor_name`: Text
- `created_at`: Timestamp with timezone

---

### 4. Inventory API Endpoints

| Method | Endpoint | RBAC Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory` | `products.view` | Paginated stock levels across catalog |
| `GET` | `/api/v1/inventory/:productId` | `products.view` | Single product authoritative stock balance |
| `POST` | `/api/v1/inventory/adjustments` | `products.update` | Controlled stock adjustment with reason & audit trail |
| `GET` | `/api/v1/inventory/transactions` | `products.view` | Query immutable stock transaction ledger |
