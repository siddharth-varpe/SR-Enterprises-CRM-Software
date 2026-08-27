# SRM Local Desktop Backup & Disaster Recovery Specification

## 1. Overview

Because SR Enterprises CRM/SRM operates as a local desktop business application, the disaster recovery architecture is built to run reliably on the local machine without relying on external cloud services.

---

## 2. Backup Architecture

### A. Snapshot Structure
Every backup is written to a dedicated, configurable directory (`./backups` or `BACKUP_STORAGE_DIR`) and contains:
1. **Primary Snapshot File (`.srm.json`)**:
   - Complete JSON dump of all 24 schema tables (Users, Customers, Products, Inventory, Sales, Invoices, Payments, Assets, Services, Job Cards, Warranties, etc.).
   - Table record counts and schema version.
2. **Companion Metadata File (`.srm.json.meta.json`)**:
   - Backup ID, timestamp, file size, table counts, and SHA-256 integrity checksum.

### B. Backup Integrity Verification
Upon generation, the engine computes a SHA-256 cryptographic hash of the entire snapshot. When inspecting or restoring a backup, the file is re-hashed and compared against `checksumSha256` to detect any disk corruption or file tampering.

### C. Retention Policy
- Keeps the last 10 backups by default.
- Pre-restore safety snapshots are retained with high priority.
- Oldest backups beyond the retention limit are cleaned up automatically.

---

## 3. High-Risk Disaster Recovery Restoration

Restoring a database snapshot is a destructive, high-risk operation. The engine enforces the following mandatory safeguards:

```
[RESTORE REQUEST]
       │
       ▼
[1. RBAC Permission Check]           --> (Requires 'system.restore', Super Admin / Admin only)
       │
       ▼
[2. Explicit Confirmation Phrase]    --> (Must match exact string 'RESTORE SRM DATA')
       │
       ▼
[3. Checksum Integrity Check]        --> (Validates SHA-256 hash of target backup)
       │
       ▼
[4. PRE-RESTORE SAFETY BACKUP]       --> (AUTOMATICALLY creates snapshot of CURRENT database)
       │
       ▼
[5. Transactional Restore]           --> (Truncates and re-inserts tables in foreign key order)
       │
       ▼
[6. Invalidate Cache & Sessions]     --> (Clears RBAC permission cache and active states)
       │
       ▼
[7. Post-Restore Verification]       --> (Verifies DB connection, row counts, and health)
       │
       ▼
[8. Audit Logging]                   --> (Records restore event with safety backup ID)
```

---

## 4. API Endpoints

- `POST /api/v1/data-movement/backup`: Generates manual system backup snapshot.
- `GET /api/v1/data-movement/backups`: Lists all local backups with size and checksums.
- `GET /api/v1/data-movement/backups/:id/verify`: Validates SHA-256 integrity of a backup.
- `POST /api/v1/data-movement/restore`: Restores from target backup with confirmation phrase.
