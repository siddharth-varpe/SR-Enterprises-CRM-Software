# Search Security & Privacy Policy
**SR Enterprises CRM / SRM**
*Phase 30 — Advanced Search + Global Search + Filtering Engine*

---

## 1. Core Security Mandates

### 1.1 Pre-Execution Authorization
Search authorization checks execute *before* database querying:
- `ISearchProvider.isAuthorized(context)` is evaluated prior to executing provider queries.
- Providers for unauthorized domains (e.g. `PaymentSearchProvider` or `InvoiceSearchProvider` for Technicians lacking financial permissions) are skipped entirely.

### 1.2 Field-Level Metadata Redaction
Even when a record is discoverable, sensitive financial attributes are redacted:
- `totalAmount`, `balanceAmount`, `laborCharges`, and `partsCharges` are removed or formatted as `[REDACTED]` for unauthorized roles.

### 1.3 Anti-Abuse & Injection Defenses
- **Wildcard Sanitization**: SQL `%` and `_` characters in user inputs are automatically escaped to prevent table-scan denial of service attacks.
- **Length Bounds**: Queries are capped at 100 characters; whitespace is collapsed.
- **Whitelist Filtering**: Filter fields and sorting keys are checked against strict entity whitelists (`ALLOWED_FILTER_FIELDS`, `ALLOWED_SORT_FIELDS`). Raw SQL clauses are forbidden.
- **Soft-Delete Exclusion**: Archived or deleted records (`archivedAt IS NOT NULL`) are strictly excluded from all public and standard searches.
