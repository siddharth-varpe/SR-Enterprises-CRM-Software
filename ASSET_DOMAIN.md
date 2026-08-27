# SR ENTERPRISES CRM / SRM
## CUSTOMER ASSET DOMAIN ARCHITECTURE & RELATIONSHIP SPECIFICATION

---

### 1. Domain Definition & Relationship Graph
A **Customer Asset** (`customer_assets`) represents a specific, physical machine (or serialized spare component) deployed and installed at a customer's premises.

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER ASSET DOMAIN                    │
│                                                             │
│         Customer                     Product                │
│    (Account / Business)        (RO Catalog Specification)   │
│              │                               │              │
│              └───────────────┬───────────────┘              │
│                              ▼                              │
│                        Customer Asset                       │
│                   (ASSET-2026-XXXX Sequence)                │
│                 Unique Serial Number / Location             │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│          Warranties       Services       Job Cards          │
│        (Coverage Terms) (Maintenance)  (Field Tickets)      │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Customer Asset Data Model

| Column | Data Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY`, Default `gen_random_uuid()` | Immutable asset UUID |
| `asset_number` | `text` | `NOT NULL`, `UNIQUE` | Business identifier (e.g. `ASSET-2026-0001`) |
| `customer_id` | `uuid` | `NOT NULL`, `REFERENCES customers(id)` | Owning customer account |
| `product_id` | `uuid` | `NOT NULL`, `REFERENCES products(id)` | Underlying catalog model |
| `asset_type` | `enum('RO_MACHINE', 'SPARE_PART')` | `NOT NULL` | Machine or component classification |
| `serial_number` | `text` | `NULLABLE` | Manufacturer / Unit Serial Number (unique per active unit) |
| `custom_name` | `text` | `NULLABLE` | Display name (e.g. "Main Kitchen 100 GPD") |
| `installation_address_id` | `uuid` | `NULLABLE`, `REFERENCES customer_addresses(id)` | Physical installation site address |
| `purchase_date` | `timestamptz` | `NOT NULL` | Date of purchase / deployment |
| `initial_warranty_months` | `integer` | `DEFAULT 12`, `NOT NULL` | Warranty term length in months |
| `service_interval_months` | `integer` | `DEFAULT 6`, `NOT NULL` | Periodic maintenance interval in months |
| `status` | `enum('ACTIVE', 'IN_SERVICE', 'REPLACED', 'DECOMMISSIONED')` | `DEFAULT 'ACTIVE'`, `NOT NULL` | Operational lifecycle status |
| `notes` | `text` | `NULLABLE` | Administrative installation remarks |
| `created_at` | `timestamptz` | `DEFAULT now()`, `NOT NULL` | Record creation timestamp |
| `updated_at` | `timestamptz` | `DEFAULT now()`, `NOT NULL` | Last update timestamp |

---

### 3. Serial Number Uniqueness & Lifecycle Rules
- **Active Asset Serial Uniqueness**: Active physical equipment cannot share a serial number. Attempting to register an active asset with an existing serial number is rejected with `409 DUPLICATE_SERIAL_NUMBER`.
- **Soft Decommission**: When an asset is retired or replaced, its status transitions to `DECOMMISSIONED` rather than being hard deleted, preserving warranty claims, service logs, and historical job cards.

---

### 4. Asset API Endpoints

| Method | Endpoint | RBAC Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assets` | `assets.view` | Directory search and filters across all customer assets |
| `GET` | `/api/v1/assets/:id` | `assets.view` | Single asset with product, warranties, and service history |
| `POST` | `/api/v1/assets` | `assets.create` | Register new customer asset with unique serial check |
| `POST` | `/api/v1/customers/:id/assets` | `assets.create` | Register asset directly linked under customer profile |
| `PATCH` | `/api/v1/assets/:id` | `assets.update` | Update asset custom name, status, location, notes |
| `DELETE` | `/api/v1/assets/:id` | `assets.archive` | Decommission / soft-archive customer asset |
| `POST` | `/api/v1/assets/:id/archive` | `assets.archive` | Decommission / soft-archive customer asset alias |
