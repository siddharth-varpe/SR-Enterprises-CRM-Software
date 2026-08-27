# SRM Configuration Security & Access Control

## 1. Overview

Business configuration dictates critical operational rules such as tax rates, customer numbering, and security lockout limits. SRM enforces strict authentication, RBAC authorization, secret isolation, and change auditing.

---

## 2. RBAC Permissions Matrix

| Permission Key | Description | Roles with Access |
|---|---|---|
| `settings.view` | Read-only access to view business configuration and health | Super Admin, Admin, Staff |
| `settings.manage` | Full administrative control across all settings categories | Super Admin, Admin |
| `settings.business.manage` | Update business name, address, GSTIN, and contact profile | Super Admin, Admin |
| `settings.tax.manage` | Update financial tax rates and HSN/SAC codes | Super Admin, Admin |
| `settings.invoice.manage` | Update invoice prefix, payment terms, and default notes | Super Admin, Admin |
| `settings.payment.manage` | Update payment methods and auto-receipt settings | Super Admin, Admin |
| `settings.service.manage` | Update service durations, SLAs, and priority settings | Super Admin, Admin |
| `settings.warranty.manage` | Update default warranty coverage months and reminder triggers | Super Admin, Admin |
| `settings.inventory.manage`| Update low stock thresholds and negative stock policies | Super Admin, Admin |
| `settings.notification.manage`| Update alert channels and reminder day offsets | Super Admin, Admin |
| `settings.numbering.manage`| Update document prefixes, padding, and sequence reset rules | Super Admin, Admin |
| `settings.security.manage` | Update password minimum length, lockout rules, and session TTL | Super Admin, Admin |

---

## 3. Secret Isolation Guarantee

Technical infrastructure secrets are **strictly decoupled** from business configuration:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `APP_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`

These values are never stored in the `app_settings` database table and are never returned by any `/api/v1/settings/*` endpoint.

---

## 4. Concurrency Protection & Audit Trails

### Optimistic Locking
Every update accepts an optional `expectedVersion` parameter. If two administrators concurrently edit the same category, the second request fails with HTTP 409 Conflict rather than silently overwriting changes.

### Audit Logging
Every update or reset operation writes an entry to `audit_logs`:
- `actorId` / `actorUsername`: Authenticated administrator
- `action`: `UPDATE`
- `entityType`: `SETTINGS`
- `entityId`: Category name (e.g. `TAX`, `INVOICE`)
- `beforeState`: Previous configuration snapshot
- `afterState`: Updated configuration snapshot
- `timestamp`: UTC timestamp
