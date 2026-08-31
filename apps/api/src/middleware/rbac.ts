import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole, PermissionKey } from '@crm/types';
import { HTTP_STATUS } from '@crm/shared';
import { db } from '../database/client';
import { roles } from '../database/schema/index';
import { eq } from 'drizzle-orm';
import { authenticate } from './auth';

// In-memory permission cache for fast authorization lookups (TTL 5 minutes)
const permissionCache = new Map<string, { keys: Set<string>; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  'Super Admin': [
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'sales.view', 'sales.create', 'sales.edit', 'sales.confirm', 'sales.cancel',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.cancel',
    'rentals.view', 'rentals.create', 'rentals.edit', 'rentals.delete',
    'assets.view', 'assets.create', 'assets.update',
    'products.view', 'products.create', 'products.update',
    'services.view', 'services.create', 'services.update', 'services.complete',
    'payments.view', 'payments.create', 'payments.refund',
    'tasks.view', 'tasks.create', 'tasks.update',
    'inquiries.view', 'inquiries.create', 'inquiries.edit', 'inquiries.assign',
    'whatsapp.view', 'whatsapp.send', 'whatsapp.manage',
    'analytics.view', 'reports.view',
    'settings.view', 'settings.manage',
    'settings.business.manage', 'settings.tax.manage', 'settings.invoice.manage', 'settings.payment.manage',
    'settings.service.manage', 'settings.warranty.manage', 'settings.inventory.manage', 'settings.notification.manage',
    'settings.numbering.manage', 'settings.security.manage',
    'users.manage',
    'data.import.customers', 'data.import.products', 'data.import.assets', 'data.import.inventory', 'data.import.warranties',
    'data.export.customers', 'data.export.products', 'data.export.inventory', 'data.export.sales', 'data.export.invoices', 'data.export.payments', 'data.export.services', 'data.export.warranties', 'data.export.job_cards', 'data.export.all',
    'system.backup', 'system.restore',
    'workflows.view', 'workflows.manage',
    'documents.view', 'documents.upload', 'documents.delete', 'documents.manage',
    'backups.view', 'backups.create', 'backups.restore', 'backups.delete', 'backups.manage'
  ],
  'Admin': [
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'sales.view', 'sales.create', 'sales.edit', 'sales.confirm', 'sales.cancel',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.cancel',
    'rentals.view', 'rentals.create', 'rentals.edit', 'rentals.delete',
    'assets.view', 'assets.create', 'assets.update',
    'products.view', 'products.create', 'products.update',
    'services.view', 'services.create', 'services.update', 'services.complete',
    'payments.view', 'payments.create', 'payments.refund',
    'tasks.view', 'tasks.create', 'tasks.update',
    'inquiries.view', 'inquiries.create', 'inquiries.edit', 'inquiries.assign',
    'whatsapp.view', 'whatsapp.send', 'whatsapp.manage',
    'analytics.view', 'reports.view',
    'settings.view', 'settings.manage',
    'settings.business.manage', 'settings.tax.manage', 'settings.invoice.manage', 'settings.payment.manage',
    'settings.service.manage', 'settings.warranty.manage', 'settings.inventory.manage', 'settings.notification.manage',
    'settings.numbering.manage', 'settings.security.manage',
    'users.manage',
    'data.import.customers', 'data.import.products', 'data.import.assets', 'data.import.inventory', 'data.import.warranties',
    'data.export.customers', 'data.export.products', 'data.export.inventory', 'data.export.sales', 'data.export.invoices', 'data.export.payments', 'data.export.services', 'data.export.warranties', 'data.export.job_cards', 'data.export.all',
    'system.backup', 'system.restore',
    'workflows.view', 'workflows.manage',
    'documents.view', 'documents.upload', 'documents.delete', 'documents.manage',
    'backups.view', 'backups.create', 'backups.restore', 'backups.delete', 'backups.manage'
  ],
  'Staff': [
    'customers.view', 'customers.create', 'customers.edit',
    'sales.view', 'sales.create', 'sales.edit',
    'invoices.view', 'invoices.create',
    'rentals.view', 'rentals.create', 'rentals.edit',
    'assets.view', 'assets.create',
    'products.view',
    'services.view', 'services.create', 'services.update',
    'payments.view', 'payments.create',
    'tasks.view', 'tasks.create', 'tasks.update',
    'inquiries.view', 'inquiries.create', 'inquiries.edit',
    'whatsapp.view', 'whatsapp.send',
    'analytics.view', 'reports.view',
    'settings.view',
    'workflows.view',
    'documents.view', 'documents.upload', 'documents.delete',
    'data.export.customers', 'data.export.products', 'data.export.inventory', 'data.export.sales', 'data.export.services'
  ],
  'Technician': [
    'services.view', 'services.update', 'services.complete',
    'assets.view',
    'tasks.view', 'tasks.update',
    'documents.view', 'documents.upload'
  ]
};

/**
 * Retrieve the active set of permission keys for a given role
 */
export async function getRolePermissionKeys(roleName: UserRole): Promise<Set<string>> {
  const now = Date.now();
  const cached = permissionCache.get(roleName);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.keys;
  }

  // Query role permissions from database
  try {
    const roleRecord = await db.query.roles.findFirst({
      where: eq(roles.name, roleName),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });

    const keys = new Set<string>();
    if (roleRecord?.rolePermissions) {
      for (const rp of roleRecord.rolePermissions) {
        if (rp.permission?.key) {
          keys.add(rp.permission.key);
        }
      }
    }

    if (keys.size === 0 && DEFAULT_PERMISSIONS_BY_ROLE[roleName]) {
      for (const p of DEFAULT_PERMISSIONS_BY_ROLE[roleName]) {
        keys.add(p);
      }
    }

    permissionCache.set(roleName, { keys, cachedAt: now });
    return keys;
  } catch (error) {
    const fallbackKeys = new Set<string>(DEFAULT_PERMISSIONS_BY_ROLE[roleName] || []);
    permissionCache.set(roleName, { keys: fallbackKeys, cachedAt: now });
    return fallbackKeys;
  }
}

/**
 * Clear the RBAC permission cache
 */
export function invalidateRolePermissionCache(roleName?: UserRole): void {
  if (roleName) {
    permissionCache.delete(roleName);
  } else {
    permissionCache.clear();
  }
}

/**
 * Middleware Guard: Requires user to have a specific role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Ensure authentication ran first
    if (!request.user) {
      await authenticate(request, reply);
      if (!request.user) return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        },
      });
    }
  };
}

/**
 * Middleware Guard: Requires user to have all specified permissions
 */
export function requirePermission(...requiredPermissions: (PermissionKey | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Ensure authentication ran first
    if (!request.user) {
      await authenticate(request, reply);
      if (!request.user) return;
    }

    // Super Admin has unrestricted access to all permissions
    if (request.user.role === 'Super Admin') {
      return;
    }

    const rolePermissionsSet = await getRolePermissionKeys(request.user.role);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((perm) => rolePermissionsSet.has(perm));

    if (!hasAllPermissions) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have sufficient permissions to perform this action',
        },
      });
    }
  };
}

/**
 * Middleware Guard: Requires user to have at least one of the specified permissions
 */
export function requireAnyPermission(...requiredPermissions: (PermissionKey | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Ensure authentication ran first
    if (!request.user) {
      await authenticate(request, reply);
      if (!request.user) return;
    }

    // Super Admin has unrestricted access to all permissions
    if (request.user.role === 'Super Admin') {
      return;
    }

    const rolePermissionsSet = await getRolePermissionKeys(request.user.role);

    // Check if user has any of the required permissions
    const hasAnyPermission = requiredPermissions.some((perm) => rolePermissionsSet.has(perm));

    if (!hasAnyPermission) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have sufficient permissions to perform this action',
        },
      });
    }
  };
}

/**
 * Authorize alias for compatibility
 */
export function authorize(allowedPermissions: (PermissionKey | string)[]) {
  return requireAnyPermission(...allowedPermissions);
}

