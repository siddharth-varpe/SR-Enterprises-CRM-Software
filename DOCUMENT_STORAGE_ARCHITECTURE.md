# Document Storage Architecture Specification
**SR Enterprises CRM / SRM**
*Phase 31 — Document + File Management Infrastructure (Industrial-Grade Local Desktop)*

---

## 1. Overview
The Document and File Management Subsystem provides a persistent, secure, permission-aware, and local file storage foundation for SRM. It functions 100% offline without external cloud storage dependencies (e.g. S3, GCS, Azure Blob, Cloudinary).

```
[UPLOAD / ATTACHMENT REQUEST]
        │
        ├── 1. Authentication & Permission Verification (documents.upload / entity view)
        ├── 2. Path Traversal & Filename Sanitization (Strip ../, null bytes, dangerous chars)
        ├── 3. File Allowlist & Size Bounds (Max 15MB; PDF, JPG, PNG, WEBP, DOCX, XLSX, CSV, TXT)
        ├── 4. Magic Bytes Inspection (%PDF-, \xFF\xD8\xFF, \x89PNG, RIFF, PK\x03\x04)
        │
        ▼
[LOCAL PERSISTENT STORAGE ENGINE]
        ├── SHA-256 Cryptographic Hash & Deduplication
        ├── Atomic Write to Opaque Storage Key (storage/documents/YYYY/MM/<uuid>.<ext>)
        │
        ▼
[METADATA & ATTACHMENT LEDGER]
        ├── documents table (Record metadata, checksum, size, category, soft-delete)
        └── document_attachments table (Entity links: CUSTOMER, ASSET, INVOICE, SALE, etc.)
        │
        ▼
[LIFECYCLE & RETRIEVAL]
        ├── Streamed Download & Inline Preview (Safe Content-Disposition & Content-Type)
        ├── Detach vs Soft-Delete Separation
        └── Storage Reconciliation (Orphan file detection & missing storage audit)
```

---

## 2. Directory Layout & Portability
Documents are stored within the configurable persistent application data area:
- Root: `DOCUMENT_STORAGE_PATH` (defaults to `storage/documents/` relative to runtime workspace).
- Subdirectory Structure: `storage/documents/<YYYY>/<MM>/<UUID>.<ext>`
- The original filename is preserved in database metadata for display and download naming, but never used directly on disk.

---

## 3. Supported Entity Attachments
1. **CUSTOMER**: ID proofs, address proofs, signed contracts, KYC.
2. **ASSET**: Serial barcode photos, machine installation photos, unboxing photos.
3. **SALE**: Sales orders, purchase orders, quotes.
4. **INVOICE**: Final generated invoice PDFs, tax documentation.
5. **PAYMENT**: Bank receipts, UPI screenshots, cheque images.
6. **WARRANTY**: Warranty cards, extended warranty certificates.
7. **SERVICE**: Diagnostic photos, replacement checklists.
8. **JOB_CARD**: Before-service photos, during-service photos, customer sign-off sheets.
9. **PRODUCT**: Product manuals, specification sheets.
10. **TECHNICIAN**: Certifications, ID documents.
11. **INQUIRY**: Inbound customer RFP documents or inquiry attachments.
