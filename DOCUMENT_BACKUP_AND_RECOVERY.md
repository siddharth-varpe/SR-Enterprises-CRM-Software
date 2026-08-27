# Document Backup, Restore & Disaster Recovery Guide
**SR Enterprises CRM / SRM**
*Phase 31 — Document + File Management Infrastructure*

---

## 1. Storage & Database Consistency
Phase 31 storage layout is architected specifically to support Phase 32's Backup & Disaster Recovery engine:
- Relative storage keys (`storagePath: YYYY/MM/<uuid>.<ext>`) make physical directories completely portable across operating systems and storage mount paths.
- Each document record contains a cryptographic `checksumSha256` for instant verification upon restore.

---

## 2. Storage Reconciliation & Audit
- Endpoint: `POST /api/v1/documents/storage/reconcile`
- Detects `missingPhysicalFiles` and flags corresponding database records with `STORAGE_MISSING`.
- Detects `orphanPhysicalFiles` (untracked files on disk without a corresponding database entry) for administrative review.
