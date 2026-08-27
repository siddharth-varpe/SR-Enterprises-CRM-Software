# SR ENTERPRISES CRM / SRM
## PRODUCT DOMAIN ARCHITECTURE & SPECIFICATION

---

### 1. Domain Definition & Philosophy
In SR Enterprises CRM / SRM, a **Product** represents a sellable catalog item or spare part defined by the enterprise (e.g. RO machines, UV purifiers, water softeners, filter cartridges, RO membranes, booster pumps, sediment pre-filters).

A **Product** is **NOT** a physical unit installed in a customer's premises. Physical units installed and registered to customers are modeled separately as **Customer Assets** (`customer_assets`).

```
┌─────────────────────────────────────────────────────────────┐
│                       PRODUCT DOMAIN                        │
│                                                             │
│  ┌────────────────────────┐      ┌────────────────────────┐ │
│  │   RO Machine Models    │      │  Spare Parts Catalog   │ │
│  │ (Aquapure 100 GPD,...) │      │ (Membrane, Pump,...)   │ │
│  └───────────┬────────────┘      └───────────┬────────────┘ │
│              │                               │              │
│              └───────────────┬───────────────┘              │
│                              ▼                              │
│                Authoritative Product Catalog                │
│                 (SKU, Prices, Tax, Warranties)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Inventory Balances               Customer Assets
      (Stock Movements & Ledger)     (Installed Serialized Units)
```

---

### 2. Product Data Model

| Column | Data Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY`, Default `gen_random_uuid()` | Immutable unique identifier |
| `sku` | `text` | `NOT NULL`, `UNIQUE` | Stock Keeping Unit (e.g. `RO-100-GPD`) |
| `name` | `text` | `NOT NULL` | Full commercial product name |
| `product_type` | `enum('RO_MACHINE', 'SPARE_PART')` | `NOT NULL` | Catalog classification |
| `brand` | `text` | `NOT NULL` | Brand name (e.g. Aquapure, Kemflo) |
| `model` | `text` | `NULLABLE` | Model number or specification |
| `description` | `text` | `NULLABLE` | Technical and warranty details |
| `unit_price` | `numeric(12, 2)` | `NOT NULL` | Authoritative base selling price |
| `tax_rate_percent` | `numeric(5, 2)` | `DEFAULT 18.00`, `NOT NULL` | Applicable GST tax percentage |
| `default_warranty_months` | `integer` | `DEFAULT 12`, `NOT NULL` | Default warranty coverage term |
| `default_service_interval_months` | `integer` | `DEFAULT 6`, `NOT NULL` | Maintenance cycle frequency |
| `is_active` | `boolean` | `DEFAULT true`, `NOT NULL` | Product active lifecycle status |
| `created_at` | `timestamptz` | `DEFAULT now()`, `NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()`, `NOT NULL` | Last update timestamp |
| `archived_at` | `timestamptz` | `NULLABLE` | Soft-archival timestamp |

---

### 3. SKU Uniqueness & Pricing Integrity
- **Database-Level Constraint**: `sku` is strictly unique (`products_sku_idx`). Duplicates are rejected with `409 DUPLICATE_SKU`.
- **Monetary Precision**: Prices and tax rates use `numeric(12, 2)` / `numeric(5, 2)` to eliminate floating-point rounding inaccuracies.
- **Historical Price Protection**: Historical sales orders and invoices store immutable unit prices at the time of transaction; changing a product's current catalog price does not alter historical financial records.

---

### 4. Product API Endpoints

| Method | Endpoint | RBAC Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | `products.view` | Search, filter, and paginate catalog items |
| `GET` | `/api/v1/products/:id` | `products.view` | Retrieve single product details |
| `POST` | `/api/v1/products` | `products.create` | Add new product to catalog with unique SKU validation |
| `PATCH` | `/api/v1/products/:id` | `products.update` | Update product details, prices, or warranty terms |
| `DELETE` | `/api/v1/products/:id` | `products.archive` | Soft-archive product (preserves historical relations) |
| `POST` | `/api/v1/products/:id/archive` | `products.archive` | Soft-archive product alias |
