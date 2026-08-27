# Document Retention & Storage Accounting Policy
**SR Enterprises CRM / SRM**
*Phase 31 — Document + File Management Infrastructure*

---

## 1. Storage Accounting & Quota
- Storage metrics endpoint: `GET /api/v1/documents/storage/stats`
- Calculates:
  - `totalDocuments`: Active count
  - `totalSizeBytes`: Exact byte size
  - `totalSizeBytesFormatted`: Formatted human-readable string (MB / GB)
  - `categoryBreakdown`: File count and storage bytes aggregated by category.
  - `statusBreakdown`: File count by status (`ACTIVE`, `DELETED`, `STORAGE_MISSING`).

---

## 2. Retention Strategy
- Soft-deleted documents retain on disk during a configurable grace period before hard cleanup.
- Soft-deleted documents are restorable via `POST /api/v1/documents/:id/restore`.
