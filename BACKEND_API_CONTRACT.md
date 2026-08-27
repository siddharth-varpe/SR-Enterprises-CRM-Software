# SR ENTERPRISES CRM / SRM
# BACKEND API CONTRACT & PROTOCOL SPECIFICATION (PHASE 14)

---

## 1. BASE URL & VERSIONING

- **Base URL**: `http://127.0.0.1:4000`
- **API Version 1 Root**: `/api/v1`
- **Correlation Header**: `x-request-id` (UUIDv4 echoed on every response)

---

## 2. UNIFIED RESPONSE SCHEMAS

### A. Success Response Contract
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message"
}
```

### B. Error Response Contract
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Sanitized, user-facing error description.",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "details": [
      {
        "field": "phone",
        "message": "Invalid phone number format"
      }
    ]
  }
}
```

---

## 3. CORE INFRASTRUCTURE ENDPOINTS

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Process Liveness probe (`{"status":"ok"}`) |
| `GET` | `/ready` | None | Readiness probe for DB & Redis connectivity |
| `GET` | `/api/v1/system/ping` | None | E2E API connectivity verification (`{"pong":true}`) |
| `GET` | `/api/v1/public/captcha` | None | Single-use visual CAPTCHA challenge |
| `POST` | `/api/v1/public/inquiries` | None | Public website lead capture with honeypot & CAPTCHA |
| `POST` | `/api/v1/auth/login` | None | Authenticate credentials & issue HttpOnly session cookie |
| `GET` | `/api/v1/auth/me` | Session | Retrieve current authenticated user profile & permissions |
| `POST` | `/api/v1/auth/logout` | Session | Invalidate active session server-side |

---

## 4. HTTP STATUS CODE CONVENTIONS

- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Schema validation failure or invalid payload structure.
- `401 Unauthorized`: Unauthenticated request or expired session.
- `403 Forbidden`: Authenticated user lacks required permission or role.
- `404 Not Found`: Requested resource does not exist.
- `409 Conflict`: Duplicate unique key or business constraint violation.
- `429 Too Many Requests`: Rate limit threshold exceeded.
- `500 Internal Server Error`: Sanitized unexpected server error (logged internally).
- `503 Service Unavailable`: Dependent service (DB/Redis) unreachable.

---

## 5. CUSTOMER MANAGEMENT ENDPOINTS (PHASE 16)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/customers` | `customers.view` | Paginated customer directory with search & filters |
| `GET` | `/api/v1/customers/check-duplicate` | `customers.view` | Duplicate detection check for phone / email |
| `POST` | `/api/v1/customers` | `customers.create` | Create customer with auto-generated customer code |
| `GET` | `/api/v1/customers/:id` | `customers.view` | Get single customer profile and addresses |
| `PATCH` | `/api/v1/customers/:id` | `customers.update` | Update customer details & address synchronization |
| `POST` | `/api/v1/customers/:id/archive` | `customers.archive` | Soft-archive customer account with reason |
| `DELETE` | `/api/v1/customers/:id` | `customers.delete` | RESTful soft delete customer account |
| `GET` | `/api/v1/customers/:id/financial-summary` | `invoices.view` | Authoritative customer financial balance summary |
| `GET` | `/api/v1/customers/:id/assets` | `customers.view` | Customer owned RO machines and serial numbers |
| `GET` | `/api/v1/customers/:id/sales` | `sales.view` | Paginated sales transactions history |
| `GET` | `/api/v1/customers/:id/invoices` | `invoices.view` | Paginated tax invoices and billing receipts |
| `GET` | `/api/v1/customers/:id/payments` | `payments.view` | Paginated payment ledger collections |
| `GET` | `/api/v1/customers/:id/services` | `services.view` | Customer service maintenance schedules |
| `GET` | `/api/v1/customers/:id/warranties` | `warranties.view` | Machine warranties and coverage details |
| `GET` | `/api/v1/customers/:id/job-cards` | `services.view` | Work order job cards and repair tasks |
| `GET` | `/api/v1/customers/:id/activities` | `customers.view` | Paginated relationship activity event timeline |
| `POST` | `/api/v1/customers/:id/notes` | `customers.update` | Append administrative note to customer profile |

---

## 6. PRODUCT & CATALOG MANAGEMENT ENDPOINTS (PHASE 17)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | `products.view` | Search, filter, and paginate catalog items |
| `GET` | `/api/v1/products/:id` | `products.view` | Retrieve single product details |
| `POST` | `/api/v1/products` | `products.create` | Add new product to catalog with unique SKU validation |
| `PATCH` | `/api/v1/products/:id` | `products.update` | Update product details, prices, or warranty terms |
| `DELETE` | `/api/v1/products/:id` | `products.archive` | Soft-archive product (preserves historical relations) |
| `POST` | `/api/v1/products/:id/archive` | `products.archive` | Soft-archive product alias |

---

## 7. INVENTORY & STOCK LEDGER ENDPOINTS (PHASE 17)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory` | `products.view` | Paginated stock levels across catalog |
| `GET` | `/api/v1/inventory/:productId` | `products.view` | Single product authoritative stock balance |
| `POST` | `/api/v1/inventory/adjustments` | `products.update` | Controlled stock adjustment with reason & audit trail |
| `GET` | `/api/v1/inventory/transactions` | `products.view` | Query immutable stock transaction ledger |

---

## 8. CUSTOMER ASSET & SERIALIZED MACHINE ENDPOINTS (PHASE 17)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assets` | `assets.view` | Directory search and filters across all customer assets |
| `GET` | `/api/v1/assets/:id` | `assets.view` | Single asset with product, warranties, and service history |
| `POST` | `/api/v1/assets` | `assets.create` | Register new customer asset with unique serial check |
| `POST` | `/api/v1/customers/:id/assets` | `assets.create` | Register asset directly linked under customer profile |
| `PATCH` | `/api/v1/assets/:id` | `assets.update` | Update asset custom name, status, location, notes |
| `DELETE` | `/api/v1/assets/:id` | `assets.archive` | Decommission / soft-archive customer asset |
| `POST` | `/api/v1/assets/:id/archive` | `assets.archive` | Decommission / soft-archive customer asset alias |

---

## 9. SALES & SALE ITEMS ENDPOINTS (PHASE 18)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sales` | `sales.view` | Paginated sales orders with customer and status search |
| `GET` | `/api/v1/sales/:id` | `sales.view` | Single sale with line item snapshots, linked invoice, and customer assets |
| `POST` | `/api/v1/sales` | `sales.create` | Create new DRAFT or COMPLETED sale with authoritative pricing |
| `PATCH` | `/api/v1/sales/:id` | `sales.update` | Update draft sale lines, discounts, or notes |
| `POST` | `/api/v1/sales/:id/confirm` | `sales.confirm` | Confirm sale: deducts stock, generates invoice, activates warranty & asset |
| `POST` | `/api/v1/sales/:id/cancel` | `sales.cancel` | Cancel sale: reverses inventory stock movement and cancels linked invoice |
| `POST` | `/api/v1/sales/:id/invoice` | `invoices.create` | Generate authoritative invoice from sale with duplicate prevention |
| `GET` | `/api/v1/customers/:id/sales` | `sales.view` | List historical sales associated with a specific customer |

---

## 10. INVOICES & TAX DOCUMENTS ENDPOINTS (PHASE 19)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/invoices` | `invoices.view` | Paginated invoice directory with search, status filter, date range, and payment balances |
| `GET` | `/api/v1/invoices/:id` | `invoices.view` | Single invoice detail with line snapshots, customer data, addresses, and payment logs |
| `POST` | `/api/v1/invoices` | `invoices.create` | Create direct invoice (DRAFT or ISSUED) with authoritative line calculations |
| `PATCH` | `/api/v1/invoices/:id` | `invoices.update` | Update draft invoice only (notes, terms, due date) |
| `POST` | `/api/v1/invoices/:id/finalize` | `invoices.update` | Finalize draft invoice (DRAFT $\rightarrow$ ISSUED) and lock financial snapshots |
| `POST` | `/api/v1/invoices/:id/cancel` | `invoices.cancel` | Cancel issued invoice preserving financial history and audit trail |
| `GET` | `/api/v1/invoices/:id/payments` | `invoices.view` | List all payments recorded for an invoice |
| `GET` | `/api/v1/invoices/:id/balance` | `invoices.view` | Authoritative balance breakdown for an invoice |
| `GET` | `/api/v1/customers/:id/invoices` | `invoices.view` | List historical invoices associated with a specific customer |

---

## 11. PAYMENTS & RECEIVABLES ENDPOINTS (PHASE 20)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/payments/kpis` | `payments.view` | Global financial KPIs (Total Collected, Today's Collection, Receivables, Overdue count) |
| `GET` | `/api/v1/payments` | `payments.view` | Paginated payments with search, method, customer, invoice, and date filters |
| `GET` | `/api/v1/payments/:id` | `payments.view` | Single payment detail with invoice, customer, and collector metadata |
| `POST` | `/api/v1/payments` | `payments.create` | Record new customer payment with concurrency locking and overpayment rejection |
| `POST` | `/api/v1/payments/:id/cancel` | `payments.create` | Cancel payment and recalculate invoice balance atomically |
| `POST` | `/api/v1/payments/:id/reverse` | `payments.create` | Reverse payment (alias for cancel) |
| `POST` | `/api/v1/payments/:id/refund` | `payments.create` | Record payment refund |
| `GET` | `/api/v1/payments/invoice/:invoiceId` | `payments.view` | List payments for a specific invoice |
| `GET` | `/api/v1/payments/invoice/:invoiceId/balance` | `payments.view` | Authoritative invoice balance and receivables breakdown |
| `GET` | `/api/v1/payments/customer/:customerId/summary` | `payments.view` | Authoritative customer financial summary (Billed, Paid, Outstanding, Overdue) |
| `GET` | `/api/v1/payments/customer/:customerId` | `payments.view` | Paginated payments for a specific customer |
| `GET` | `/api/v1/customers/:id/payments` | `customers.view` | Customer payment history |

---

## 12. WARRANTIES, SERVICES & JOB CARDS ENDPOINTS (PHASE 21)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/warranties` | `assets.view` | Paginated list of warranties with multi-criteria filters |
| `GET` | `/api/v1/warranties/kpis` | `assets.view` | Operational warranty KPIs (Active, Expiring Soon, Expired, Void) |
| `GET` | `/api/v1/warranties/expiring` | `assets.view` | Warranties expiring within $N$ days |
| `GET` | `/api/v1/warranties/:id` | `assets.view` | Single warranty detail with full lifecycle audit events |
| `POST` | `/api/v1/warranties` | `assets.update` | Register new warranty with asset ownership check |
| `PATCH` | `/api/v1/warranties/:id` | `assets.update` | Update warranty status, extension, or terms |
| `POST` | `/api/v1/warranties/:id/cancel` | `assets.update` | Void/Cancel warranty with required audit reason |
| `GET` | `/api/v1/services` | `services.view` | Paginated service requests |
| `GET` | `/api/v1/services/kpis` | `services.view` | Service operational metrics and completion counts |
| `GET` | `/api/v1/services/heatmap` | `services.view` | GitHub-style activity grid aggregation by date |
| `GET` | `/api/v1/services/upcoming` | `services.view` | Upcoming service visits |
| `GET` | `/api/v1/services/overdue` | `services.view` | Overdue incomplete service requests |
| `GET` | `/api/v1/services/technicians` | `services.view` | Active technicians dropdown list |
| `GET` | `/api/v1/services/:id` | `services.view` | Single service request with joined job card |
| `POST` | `/api/v1/services` | `services.create` | Schedule service & auto-generate linked Job Card |
| `PATCH` | `/api/v1/services/:id` | `services.update` | Update service schedule or assign technician |
| `POST` | `/api/v1/services/:id/cancel` | `services.update` | Cancel service request with reason |
| `POST` | `/api/v1/services/:id/complete` | `services.complete` | Complete service & finalize job card |
| `GET` | `/api/v1/job-cards` | `services.view` | Paginated job cards |
| `GET` | `/api/v1/job-cards/kpis` | `services.view` | Job card workflow status counts |
| `GET` | `/api/v1/job-cards/:id` | `services.view` | Single job card detail |
| `POST` | `/api/v1/job-cards/:id/assign` | `services.update` | Assign technician to job card |
| `POST` | `/api/v1/job-cards/:id/start` | `services.update` | Mark job started (`IN_PROGRESS`, set `startedAt`) |
| `POST` | `/api/v1/job-cards/:id/complete` | `services.complete` | Finalize job card with TDS, parts, and charges |
| `GET` | `/api/v1/assets/:id/warranty` | `assets.view` | Get active warranty for an asset |
| `GET` | `/api/v1/assets/:id/service-history`| `assets.view` | Get all past services & job cards on an asset |
| `GET` | `/api/v1/customers/:id/services` | `customers.view` | Get all services for a customer |
| `GET` | `/api/v1/customers/:id/warranties`| `customers.view` | Get all warranties for a customer |
| `GET` | `/api/v1/customers/:id/job-cards` | `customers.view` | Get all job cards for a customer |

---

## 13. SERVICE BILLING & INVOICING ENDPOINTS (PHASE 22)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/service-billing/job-card/:jobCardId` | `invoices.view` | Preview billable charges, parts, and warranty eligibility |
| `POST` | `/api/v1/service-billing/generate` | `invoices.create` | Generate authoritative service invoice with atomic inventory stock deduction |
| `GET` | `/api/v1/job-cards/:id/charges` | `services.view` | Get billable preview for a specific Job Card |
| `POST` | `/api/v1/job-cards/:id/invoice` | `invoices.create` | Direct endpoint to generate invoice from completed Job Card |
| `GET` | `/api/v1/job-cards/:id/invoice` | `services.view` | Retrieve linked invoice for a Job Card |

---

## 14. NOTIFICATIONS & AUTOMATED FOLLOW-UP ENDPOINTS (PHASE 23)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Authenticated | Paginated notifications list with filters (unread, severity, type, entity) |
| `GET` | `/api/v1/notifications/unread-count` | Authenticated | Total unread, critical, and warning notification counts |
| `PATCH` / `POST` | `/api/v1/notifications/:id/read` | Authenticated | Mark individual notification as read |
| `POST` | `/api/v1/notifications/read-all` | Authenticated | Bulk mark all notifications as read |
| `GET` | `/api/v1/notifications/preferences` | Authenticated | Get current user's notification preferences |
| `PATCH` | `/api/v1/notifications/preferences` | Authenticated | Update user's notification preference flags |
| `GET` | `/api/v1/reminders` | `tasks.view` | Paginated follow-up reminders list |
| `GET` | `/api/v1/reminders/kpis` | `tasks.view` | Reminder KPI counts (Pending, Due Today, Overdue, Completed) |
| `GET` | `/api/v1/reminders/:id` | `tasks.view` | Get single reminder details |
| `POST` | `/api/v1/reminders` | `tasks.manage` | Create new follow-up reminder |
| `PATCH` | `/api/v1/reminders/:id` | `tasks.manage` | Update reminder date, priority, or notes |
| `POST` | `/api/v1/reminders/:id/complete` | `tasks.manage` | Mark reminder as completed |
| `POST` | `/api/v1/reminders/:id/cancel` | `tasks.manage` | Cancel reminder |
| `POST` | `/api/v1/reminders/process-rules` | `tasks.manage` | Trigger on-demand automated follow-up engine scan (Warranties & Overdue Invoices) |

---

## 15. GLOBAL SEARCH & DATA DISCOVERY (PHASE 25)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/search` | Authenticated (Domain RBAC Scoped) | Global multi-domain search across Customers, Assets, Products, Invoices, Payments, Services, Job Cards, Warranties, Technicians, and Inquiries |
| `GET` | `/api/v1/search/suggest` | Authenticated (Domain RBAC Scoped) | Fast autocomplete suggestions for global search and Command Palette |

---

## 16. DATA IMPORT, EXPORT, BACKUP & RESTORE (PHASE 26)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/data-movement/import/preview` | Authenticated | Validate dataset and generate error/duplicate preview (Zero DB mutation) |
| `POST` | `/api/v1/data-movement/import/execute` | `data.import.<type>` | Execute confirmed transactional import with duplicate policy (`CREATE`, `SKIP`, `UPDATE`) |
| `GET` | `/api/v1/data-movement/import/template/:type` | Authenticated | Download official CSV template for import type |
| `GET` | `/api/v1/data-movement/export/:entity` | `data.export.<entity>` | Export sanitized CSV/JSON dataset with formula injection protection |
| `POST` | `/api/v1/data-movement/backup` | `system.backup` | Generate integrity-verified system database snapshot |
| `GET` | `/api/v1/data-movement/backups` | `system.backup` | List all local backups with file size and checksums |
| `GET` | `/api/v1/data-movement/backups/:id/verify` | `system.backup` | Verify SHA-256 integrity of local backup snapshot |
| `POST` | `/api/v1/data-movement/restore` | `system.restore` | High-risk system restore with automatic pre-restore safety backup |

---

## 17. SYSTEM ADMINISTRATION & BUSINESS CONFIGURATION (PHASE 27)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/settings/public` | Public (No Auth) | Public company branding, currency symbol, date format, and tax rate metadata |
| `GET` | `/api/v1/settings/health` | `settings.view` | Configuration schema health check and category validation |
| `GET` | `/api/v1/settings` | `settings.view` | Retrieve all 13 system and business configuration categories |
| `GET` | `/api/v1/settings/:category` | `settings.view` | Retrieve single category configuration with version metadata |
| `PATCH` | `/api/v1/settings/:category` | `settings.manage` or `settings.<cat>.manage` | Update category settings with optimistic concurrency locking and audit trail |
| `POST` | `/api/v1/settings/:category/reset` | `settings.manage` | Reset category to system defaults (requires `confirmation: 'RESET'`) |

---

## 18. ADVANCED WORKFLOW ENGINE & BUSINESS AUTOMATION (PHASE 28)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workflows` | `workflows.view` | List all configured workflow automation definitions |
| `POST` | `/api/v1/workflows` | `workflows.manage` | Create a new workflow automation definition with deterministic conditions and actions |
| `GET` | `/api/v1/workflows/executions` | `workflows.view` | Query recent workflow execution history and observability metrics |
| `POST` | `/api/v1/workflows/state-machine/validate` | `workflows.view` | Validate whether an entity state transition is legally permitted |

---

## 19. ADVANCED SEARCH & GLOBAL FILTERING ENGINE (PHASE 30)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/search` | Authenticated (Domain RBAC Scoped) | Global multi-domain search across Customers, Contacts, Assets, Products, Inventory, Sales, Invoices, Payments, Services, Job Cards, Warranties, Technicians, and Inquiries |
| `GET` | `/api/v1/search/suggest` | Authenticated (Domain RBAC Scoped) | Fast autocomplete suggestions for global search and Command Palette |
| `POST` | `/api/v1/search/advanced` | Authenticated (Domain RBAC Scoped) | Structured entity filtering with operator whitelisting (`=`, `!=`, `>`, `<`, `>=`, `<=`, `IN`, `BETWEEN`, `CONTAINS`, `STARTS_WITH`) and deterministic pagination |

---

## 20. DOCUMENT & FILE MANAGEMENT INFRASTRUCTURE (PHASE 31)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/documents/upload` | `documents.upload` | Upload and register document with magic bytes validation, SHA-256 hash, and entity linking |
| `GET` | `/api/v1/documents/:id` | `documents.view` | Retrieve single document metadata |
| `GET` | `/api/v1/documents/:id/download` | `documents.view` | Stream file download with safe `Content-Disposition: attachment` |
| `GET` | `/api/v1/documents/:id/preview` | `documents.view` | Stream inline preview for supported browser formats (PDF, PNG, JPEG, WEBP) |
| `DELETE` | `/api/v1/documents/:id` | `documents.delete` | Soft delete document |
| `POST` | `/api/v1/documents/:id/restore` | `documents.manage` | Restore soft-deleted document |
| `POST` | `/api/v1/documents/attach` | `documents.upload` | Link existing document to an entity |
| `DELETE` | `/api/v1/documents/attachments/:attachmentId` | `documents.delete` | Detach document link from entity without destroying physical file |
| `GET` | `/api/v1/documents/entity/:entityType/:entityId` | `documents.view` | List all documents attached to an entity |
| `GET` | `/api/v1/documents/storage/stats` | `documents.view` | Retrieve storage accounting statistics and category breakdown |
| `POST` | `/api/v1/documents/storage/reconcile` | `documents.manage` | Audit storage and reconcile orphan files and missing storage |

---

## 21. BACKUP, RESTORE & DISASTER RECOVERY ENGINE (PHASE 32)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/backups` | `backups.create` | Create an atomic `.srmbackup` snapshot of Database, Documents, and Configuration |
| `GET` | `/api/v1/backups` | `backups.view` | List all backup snapshots with pagination and type filtering |
| `GET` | `/api/v1/backups/:id/inspect` | `backups.view` | Non-destructive inspection of backup manifest, table counts, and schema compatibility |
| `POST` | `/api/v1/backups/:id/verify` | `backups.view` | Cryptographic SHA-256 integrity verification of backup package and components |
| `POST` | `/api/v1/backups/:id/restore` | `backups.restore` | Execute guarded staged disaster recovery with automatic pre-restore safety snapshot |
| `DELETE` | `/api/v1/backups/:id` | `backups.delete` | Delete backup snapshot (protected snapshots are blocked from deletion) |
| `GET` | `/api/v1/backups/storage/estimate` | `backups.view` | Pre-flight size estimation and disk storage availability check |
| `POST` | `/api/v1/backups/retention/cleanup` | `backups.manage` | Trigger retention rotation to purge old non-protected backups |















