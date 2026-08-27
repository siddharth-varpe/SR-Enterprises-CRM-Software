# SR ENTERPRISES CRM / SRM
# ROLE-BASED ACCESS CONTROL (RBAC) ARCHITECTURE (PHASE 15)

---

## 1. HIERARCHY OF ROLES

1. **Super Admin**: Complete unrestricted operational and administrative access.
2. **Staff / Operations Manager**: Customer management, sales creation, billing, service scheduling, reminders, lead qualification.
3. **Technician**: Work orders, service updates, task status completion, machine inspections.

---

## 2. GRANULAR PERMISSION KEYS MATRIX

| Permission Key | Super Admin | Staff | Technician |
| :--- | :---: | :---: | :---: |
| `customers.view` | ✅ | ✅ | ❌ |
| `customers.create` | ✅ | ✅ | ❌ |
| `customers.edit` | ✅ | ✅ | ❌ |
| `customers.delete` | ✅ | ❌ | ❌ |
| `sales.view` | ✅ | ✅ | ❌ |
| `sales.create` | ✅ | ✅ | ❌ |
| `sales.edit` | ✅ | ✅ | ❌ |
| `sales.cancel` | ✅ | ❌ | ❌ |
| `invoices.view` | ✅ | ✅ | ❌ |
| `invoices.create` | ✅ | ✅ | ❌ |
| `invoices.cancel` | ✅ | ❌ | ❌ |
| `services.view` | ✅ | ✅ | ✅ |
| `services.create` | ✅ | ✅ | ❌ |
| `services.update` | ✅ | ✅ | ✅ |
| `services.complete` | ✅ | ❌ | ✅ |
| `payments.view` | ✅ | ✅ | ❌ |
| `payments.create` | ✅ | ✅ | ❌ |
| `tasks.view` | ✅ | ✅ | ✅ |
| `tasks.update` | ✅ | ❌ | ✅ |
| `inquiries.view` | ✅ | ✅ | ❌ |
| `inquiries.assign` | ✅ | ❌ | ❌ |
| `whatsapp.send` | ✅ | ✅ | ❌ |
| `analytics.view` | ✅ | ❌ | ❌ |
| `reports.view` | ✅ | ✅ | ❌ |
| `settings.manage` | ✅ | ❌ | ❌ |
| `users.manage` | ✅ | ❌ | ❌ |

---

## 3. SERVER-SIDE ENFORCEMENT HOOKS

1. **`requireRole(...allowedRoles: UserRole[])`**:
   - Enforces role gate at route level.
   - Throws `403 FORBIDDEN` (`{"code":"FORBIDDEN","message":"Access denied"}`) if current user role is not permitted.
2. **`requirePermission(...requiredPermissions: PermissionKey[])`**:
   - Enforces specific business permission.
   - Bypassed automatically for `Super Admin`.
   - Throws `403 FORBIDDEN` if permission is missing.
