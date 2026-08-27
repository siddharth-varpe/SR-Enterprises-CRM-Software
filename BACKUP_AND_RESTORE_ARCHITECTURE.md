# Backup, Restore & Disaster Recovery Architecture Specification
**SR Enterprises CRM / SRM**
*Phase 32 — Backup + Restore + Disaster Recovery Engine (Industrial-Grade Local Desktop)*

---

## 1. Executive Summary
SRM is a local desktop application with zero dependency on cloud services (no AWS S3, GCS, or remote APIs). Phase 32 provides a production-grade, atomic, and cryptographically verified Backup, Restore, and Disaster Recovery infrastructure that guarantees recoverable CRM state across all domain tables, attachments, and configurations.

```
[BACKUP ENGINE]
        │
        ├── 1. Pre-flight Check (Disk Space, Memory, Execution Mutex Lock)
        ├── 2. Database Snapshot (All 25+ Tables in Dependency Order)
        ├── 3. Document Files Capture (Physical files from storage/documents)
        ├── 4. System Settings & Configuration Snapshot
        ├── 5. Manifest & Checksum Generation (SHA-256 for Database, Docs, Container)
        │
        ▼
[ATOMIC PACKAGING]
        ├── Write to Temporary File: srm_<backupId>_<timestamp>.srmbackup.tmp
        ├── Cryptographic Integrity Validation
        └── Atomic Rename: srm_<backupId>_<timestamp>.srmbackup
        │
        ▼
[STAGED DISASTER RECOVERY & RESTORE]
        ├── 1. Inspect Backup (Manifest & Schema Version Compatibility)
        ├── 2. Require Explicit Admin Confirmation (confirmAction: true)
        ├── 3. Create Automatic Pre-Restore Safety Snapshot (SAFETY-<timestamp>.srmbackup)
        ├── 4. Transactional Database Truncate & Dependency-Ordered Insert
        ├── 5. Physical Document Restoration to disk
        ├── 6. Post-Restore Verification (Table Count Matching & RBAC Eviction)
        └── 7. Automatic Rollback on Any Stage Failure
```

---

## 2. Package Format & Structure (`.srmbackup`)
Every backup package is an encapsulated, versioned archive container:
- **`manifest`**: Metadata including `backupId`, `createdAt`, `srmVersion`, `databaseSchemaVersion`, `backupFormatVersion` (`"1.0.0"`), `tableCounts`, `documentCount`, `documentStorageSizeBytes`, `databaseSizeBytes`, `totalPackageSizeBytes`, `checksumSha256`, and `componentChecksums`.
- **`databaseJson`**: Complete record snapshot of all 33 database tables.
- **`documentsJson`**: Base64 encoded payload of physical documents with original MIME types and relative storage paths (`YYYY/MM/<uuid>.<ext>`).

---

## 3. Atomic File Transitions & Crash Safety
- Incomplete or interrupted backups are written with a `.tmp` extension (`srm_backup.tmp`).
- Only after full verification of the in-memory hash against the written data is the file atomically renamed to `.srmbackup`.
- Partially written or corrupted files never appear in `listBackups()` as valid recovery points.
