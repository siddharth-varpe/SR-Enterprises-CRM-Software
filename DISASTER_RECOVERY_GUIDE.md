# Disaster Recovery & System Restoration Guide
**SR Enterprises CRM / SRM**
*Phase 32 — Backup + Restore + Disaster Recovery Engine*

---

## 1. Disaster Recovery Principles
1. **Safety First**: Restoring a backup destroys the live database state. An automatic safety snapshot (`SAFETY-<timestamp>.srmbackup`) is created before live data is touched.
2. **Schema Compatibility**: Restores from newer schema versions onto older SRM installations are immediately blocked to prevent schema corruption.
3. **Multi-Stage Verification**: Table counts and document presence are verified after restore before the recovery is declared successful.

---

## 2. Step-by-Step Restoration Protocol

### Step 1: Pre-Flight Inspection (Safe & Non-Destructive)
- Run `GET /api/v1/backups/:id/inspect` or `POST /api/v1/backups/:id/verify`.
- Verifies package checksums, manifest integrity, and schema compatibility.

### Step 2: Confirmation & Execution
- Trigger `POST /api/v1/backups/:id/restore` with payload:
  ```json
  {
    "confirmAction": true
  }
  ```

### Step 3: Automated Guarded Recovery
1. The engine locks concurrent backup/restore executions.
2. Creates `SAFETY-<timestamp>.srmbackup`.
3. Truncates all tables in reverse dependency order.
4. Inserts restored records in strict dependency order (`users` $\to$ `roles` $\to$ `customers` $\to$ `invoices` $\to$ ... $\to$ `audit_logs`).
5. Decodes and writes all physical document files to their respective relative storage paths.
6. Evicts RBAC in-memory caches.
7. Logs an audit entry.
