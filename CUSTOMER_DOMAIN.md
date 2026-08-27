# SR ENTERPRISES CRM / SRM
# CUSTOMER DOMAIN MODEL & BACKEND INTEGRATION SPECIFICATION (PHASE 16)

**Domain**: Customer Relationship & Account Management  
**Central Entity**: `Customer` (Primary Root Anchor for Assets, Sales, Invoices, Payments, Warranties, Services, Job Cards, and Activity Events)  
**Database Tables**: `customers`, `customer_addresses`, `customer_assets`, `activities`

---

## 1. CUSTOMER ENTITY SCHEMA MAPPING

| Database Field | API / JSON Field | Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `id` | UUID (PK) | Internal immutable database primary key |
| `customer_code` | `customerCode` | String | Unique human-readable code (e.g. `CUST-000001`) |
| `first_name` | `firstName` | String | Customer's first name |
| `last_name` | `lastName` | String | Customer's last name |
| `full_name` | `fullName` | String | Generated searchable canonical name |
| `company_name` | `companyName` | String? | Business / Commercial entity name |
| `phone` | `phone` | String | Primary phone number (Normalized canonical format) |
| `alternate_phone`| `alternatePhone`| String? | Secondary contact phone number |
| `email` | `email` | String? | Normalized email address |
| `customer_type` | `customerType` | Enum | `RESIDENTIAL`, `COMMERCIAL`, `INDUSTRIAL`, `INSTITUTIONAL` |
| `status` | `status` | Enum | `ACTIVE`, `INACTIVE`, `ARCHIVED` |
| `notes` | `notes` | Text? | Internal administrative notes |
| `created_at` | `createdAt` | Timestamp | Account creation timestamp (UTC) |
| `updated_at` | `updatedAt` | Timestamp | Last record modification timestamp (UTC) |
| `deleted_at` | `deletedAt` | Timestamp? | Soft-deletion archival timestamp |

---

## 2. ADDRESS SUB-SCHEMA (`customer_addresses`)

| Database Field | API Field | Description |
| :--- | :--- | :--- |
| `id` | `id` | Address record UUID |
| `customer_id` | `customerId` | Foreign key referencing `customers.id` |
| `address_line1` | `addressLine1` | Primary street address |
| `address_line2` | `addressLine2` | Apartment, suite, unit, floor |
| `city` | `city` | City / Municipality (e.g. Mumbai, Pune) |
| `state` | `state` | State / Territory (e.g. Maharashtra) |
| `postal_code` | `postalCode` / `pincode` | 6-digit Indian Postal PIN Code |
| `is_primary` | `isPrimary` | Flag marking primary service/billing address |

---

## 3. CUSTOMER API CONTRACT SPECIFICATION

### A. Directory & Operations
- `GET /api/v1/customers`: Server-side pagination, full-text search, status (`ACTIVE`/`INACTIVE`/`ARCHIVED`), customer type filters, and sort ordering.
- `GET /api/v1/customers/check-duplicate`: Real-time phone and email duplicate detection before form submission.
- `POST /api/v1/customers`: Atomic customer creation, human-readable code generation (`CUST-000001`), primary address insertion, and audit trail event.
- `GET /api/v1/customers/:id`: Complete customer profile with address collection.
- `PATCH /api/v1/customers/:id`: Profile updates, address synchronization, and audit logging.
- `POST /api/v1/customers/:id/archive`: Soft-archival with business reason tracking.
- `DELETE /api/v1/customers/:id`: RESTful soft delete / archival endpoint.

### B. Profile Aggregated Relations
- `GET /api/v1/customers/:id/financial-summary`: Total sales, total invoiced, total paid, and outstanding balances calculated authoritatively from backend records.
- `GET /api/v1/customers/:id/assets`: Serialized RO machines, models, installation dates, and active warranty status.
- `GET /api/v1/customers/:id/sales`: Paginated sales transaction history.
- `GET /api/v1/customers/:id/invoices`: Paginated tax invoices and billing receipts.
- `GET /api/v1/customers/:id/payments`: Paginated payment collection ledger.
- `GET /api/v1/customers/:id/services`: Maintenance schedules, technician assignments, and service history.
- `GET /api/v1/customers/:id/warranties`: Machine warranty terms, coverage dates, and claim status.
- `GET /api/v1/customers/:id/job-cards`: Work execution cards and repair tasks.
- `GET /api/v1/customers/:id/activities`: Chronological relationship event stream.
- `POST /api/v1/customers/:id/notes`: Append timestamped administrative notes to customer profile.

---

## 4. DUPLICATE DETECTION & DATA INTEGRITY

1. **Phone Normalization**: Phone numbers are stripped of whitespace and non-digit characters.
2. **Duplicate Checks**: System queries active customer records within 48h and flags existing phone/email matches to prevent duplicate customer records.
3. **Transaction Safety**: All multi-write customer creation flows use `withTransaction` ensuring rollback if address or sequence allocation fails.
4. **Soft Delete Preservation**: Customers with existing financial, asset, or service records are never hard-deleted; status transitions to `ARCHIVED` preserving historical integrity.
