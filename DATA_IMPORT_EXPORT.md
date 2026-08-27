# SRM Data Movement: Import & Export Architecture

## 1. Overview

The Data Movement layer for the SR Enterprises CRM/SRM system provides enterprise-grade, secure, validated data import and export capabilities across core operational domains. It is specifically designed to operate reliably in local desktop environments with zero external dependencies.

---

## 2. Core Import Lifecycle

To protect operational data and financial ledgers, **uploaded data is never directly inserted into the database**. Every import traverses a 10-step validation and transactional pipeline:

```
[UPLOAD (CSV/JSON)]
        │
        ▼
[1. File Security Validation]  --> (Size limit <= 10MB, safe filename, MIME validation)
        │
        ▼
[2. Format Parsing]            --> (Handles escaped quotes, multi-line cells, comma separation)
        │
        ▼
[3. Schema & Type Validation]  --> (Zod schema, required field checks, format regexes)
        │
        ▼
[4. Data Normalization]        --> (Phone numbers, uppercase SKUs, trimmed names, safe currency)
        │
        ▼
[5. Duplicate Detection]       --> (Intra-file duplicate check & database duplicate check)
        │
        ▼
[6. Referential Integrity]     --> (Resolves Customers, Products, Assets; missing ref check)
        │
        ▼
[7. Preview Report]            --> (Returns valid/invalid counts, error rows. ZERO DB MUTATION)
        │
        ▼
[8. Explicit Confirmation]     --> (User reviews preview, selects duplicate policy)
        │
        ▼
[9. Transactional Commit]      --> (ACID database transaction, rollbacks on catastrophic error)
        │
        ▼
[10. Audit Trail & Result]     --> (Immutable audit record created with actor and counts)
```

---

## 3. Supported Entities & Importers

| Entity | Importer | Required Identifiers | Key Validation & Resolution | Duplicate Handling |
|---|---|---|---|---|
| **Customers** | `CustomerImporter` | `fullName`, `phone` | Phone normalized to 10 digits; email format checked | `CREATE` (error), `SKIP`, `UPDATE` |
| **Products** | `ProductImporter` | `sku`, `name`, `unitPrice` | SKU uppercase; non-negative price; tax rate | `CREATE` (error), `SKIP`, `UPDATE` |
| **Assets** | `AssetImporter` | `serialNumber`, `customerPhone`, `productSku` | Resolves Customer and Product in DB | `CREATE` (error), `SKIP`, `UPDATE` |
| **Inventory** | `InventoryImporter` | `productSku`, `quantity` | Resolves Product; creates immutable ledger transaction (`OPENING_BALANCE` / `ADJUSTMENT`) | `CREATE` (error), `SKIP`, `UPDATE` |
| **Warranties** | `WarrantyImporter` | `assetSerial`, `startDate`, `endDate` | Resolves Asset & Customer; validates `startDate <= endDate` | `CREATE` (error), `SKIP`, `UPDATE` |

---

## 4. Export Engine & Security Isolation

### A. Formula Injection Protection (CSV / DDE Injection)
Spreadsheet applications (Excel, LibreOffice, Google Sheets) can execute formulas when opening untrusted CSV files if a field begins with `=`, `+`, `-`, `@`, `\t`, or `\r`.
The SRM export engine applies `sanitizeCsvCell()` across all cell values:
- Any cell value beginning with a formula trigger is prefixed with a single quote (`'`) to force spreadsheets to treat it as inert plain text.
- Double quotes within text are safely escaped (`""`).

### B. RBAC & Financial Isolation
- **Financial Scope**: Exports of `sales`, `invoices`, and `payments` require elevated roles (`Super Admin`, `Admin`, `Staff` with financial permissions). Field technicians and unauthorized users are blocked with HTTP 403 Forbidden.
- **Organization Isolation**: Exports are strictly scoped to the authenticated tenant.

---

## 5. API Endpoints

### Import Endpoints
- `POST /api/v1/data-movement/import/preview`: Generates validation preview, duplicate report, and error breakdown.
- `POST /api/v1/data-movement/import/execute`: Executes confirmed transactional import with selected policy (`CREATE`, `SKIP`, `UPDATE`).
- `GET /api/v1/data-movement/import/template/:type`: Downloads official standard CSV import template.

### Export Endpoints
- `GET /api/v1/data-movement/export/:entity?format=csv&limit=50000`: Streams/downloads sanitized CSV or JSON dataset.
