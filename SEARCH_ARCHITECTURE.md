# Search Architecture Specification
**SR Enterprises CRM / SRM**
*Phase 30 — Advanced Search + Global Search + Filtering Engine (Hardened Industrial-Grade)*

---

## 1. Overview
The Search Engine provides a centralized, secure, permission-aware, and high-performance search and retrieval layer for SR Enterprises CRM/SRM. It operates 100% locally and offline without external search cluster dependencies (e.g. Elasticsearch, OpenSearch, Algolia).

```
[USER QUERY / ADVANCED FILTER REQUEST]
        │
        ├── 1. Query Normalization (Trimming, whitespace collapsing, phone normalization, wildcard escaping)
        ├── 2. Authentication & Permission Verification (Pre-search RBAC evaluation)
        ├── 3. Intent Search Router (Detects pattern: INV-, CUST-, SN-, RO-, JC-, Phone, Email)
        │
        ▼
[FILTER ENGINE & ENTITY SEARCH PROVIDERS]
        ├── Parameterized Whitelist Filters (=, !=, >, <, IN, BETWEEN, CONTAINS, STARTS_WITH)
        ├── Soft-delete & Archive exclusion
        ├── 12 Entity Providers:
        │     Customers, Contacts, Assets, Products, Inventory, Sales,
        │     Invoices, Payments, Warranties, Services, Job Cards, Technicians
        │
        ▼
[DETERMINISTIC RANKING ENGINE]
        ├── Tier 1: Exact Identifier Match (Score 1000)
        ├── Tier 2: Exact Name / Phone Match (Score 900)
        ├── Tier 3: Prefix Match (Score 750)
        ├── Tier 4: Token / Word-boundary Match (Score 600)
        ├── Tier 5: Substring / Partial Match (Score 400)
        └── Tier 6: Controlled Fuzzy / Levenshtein Match (Score 250)
        │
        ▼
[RESULT SANITIZER & SECURITY RECHECK]
        ├── Field-level redaction for unauthorized financial metadata
        └── Standardized SearchItemResult / GlobalSearchResponse DTO
```

---

## 2. Searchable Entities
1. **Customer**: Full Name, Customer ID (`CUST-`), Phone, Email, Company Name.
2. **Contact**: Alternate Customer Contacts, Phone, Designation.
3. **Asset**: Serial Number (`SN-`), Asset ID, Model, Customer Name.
4. **Product**: Product Name, SKU (`RO-`, `SR-`), Model, Brand.
5. **Inventory**: SKU, Product Name, Current Stock, Minimum Alert Stock.
6. **Sale**: Sale Number (`SALE-`), Customer Name, Sale Date, Total Amount.
7. **Invoice**: Invoice Number (`INV-`), Customer Name, Due Date, Total Amount.
8. **Payment**: Payment Reference (`PAY-`), Customer Name, Payment Method, Amount.
9. **Warranty**: Warranty Number (`WAR-`), Serial Number, Expiry Date.
10. **Service**: Service Number (`SRV-`), Technician Name, Scheduled Date, Priority.
11. **Job Card**: Job Card Number (`JC-`), Technician Name, Status.
12. **Technician**: Name, Employee ID, Phone, Specialization.
13. **Inquiry**: Inquiry ID (`INQ-`), Source, Priority, Customer Name.

---

## 3. Search Intent Router
The `SearchRouter` inspects queries prior to database execution to determine likely entity domains:
- `INV-\d+` $\to$ Targeted `invoice`, `sale`, `payment` search.
- `CUST-\d+` $\to$ Targeted `customer` search.
- `SALE-\d+` $\to$ Targeted `sale`, `invoice` search.
- `JC-\d+` $\to$ Targeted `job_card`, `service` search.
- `SRV-\d+` $\to$ Targeted `service`, `job_card` search.
- `WAR-\d+` $\to$ Targeted `warranty`, `asset` search.
- `(ASSET-|SN-|SER-)` $\to$ Targeted `asset`, `product`, `warranty` search.
- `PAY-\d+` $\to$ Targeted `payment`, `invoice` search.
- `\d{10}` (10-digit phone) $\to$ Targeted `customer`, `technician` search.
- `.+@.+\..+` (Email) $\to$ Targeted `customer`, `technician` search.
- Generic queries $\to$ Parallel multi-domain federated search.
