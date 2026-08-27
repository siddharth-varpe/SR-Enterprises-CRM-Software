# Backup Retention, Rotation & Scheduling Policy
**SR Enterprises CRM / SRM**
*Phase 32 — Backup + Restore + Disaster Recovery Engine*

---

## 1. Automated Scheduling
- **`BackupScheduler`**:
  - Runs in background on configurable interval (default: 1440 minutes / 24 hours).
  - Skips run gracefully if a manual backup or restore is currently in progress.
  - Automatically triggers retention rotation upon completing scheduled backup.

---

## 2. Retention & Rotation Rules
1. **Window Preservation**: Retains the last `N` (default: 10) valid backups.
2. **Protected Snapshots**: Backups with `isProtected: true` or safety backups created during restore are never purged by automated rotation.
3. **Manual Purge**: Administrators can trigger retention rotation via `POST /api/v1/backups/retention/cleanup`.
