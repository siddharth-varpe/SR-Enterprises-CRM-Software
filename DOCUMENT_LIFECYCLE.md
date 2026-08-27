# Document Lifecycle & Entity Attachment Model
**SR Enterprises CRM / SRM**
*Phase 31 — Document + File Management Infrastructure*

---

## 1. Lifecycle States
1. **ACTIVE**: Standard operational document available for querying, preview, and download.
2. **DELETED**: Soft-deleted document (`deletedAt IS NOT NULL`). Excluded from standard views but recoverable via `/api/v1/documents/:id/restore`.
3. **STORAGE_MISSING**: Document record exists in database, but physical file on disk was removed or corrupted.
4. **QUARANTINED**: Document flagged during security inspection.
5. **CORRUPTED**: File exists but cryptographic SHA-256 hash does not match recorded checksum.

---

## 2. Detach vs Delete Model
- **DETACH (`DELETE /api/v1/documents/attachments/:attachmentId`)**: Removes the relationship between an entity and the document without destroying the document record or physical file on disk.
- **DELETE (`DELETE /api/v1/documents/:id`)**: Soft-deletes the master document and cascades inactive state to all entity associations.
