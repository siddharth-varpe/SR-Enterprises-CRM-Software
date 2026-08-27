import { pgTable, uuid, text, boolean, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { userRoleEnum, userStatusEnum } from './enums';

/**
 * Roles Table
 */
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: boolean('is_system').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

/**
 * Permissions Table
 */
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  module: text('module').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

/**
 * Role Permissions Junction Table
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ]
);

/**
 * Users Table
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    email: text('email'),
    role: userRoleEnum('role').default('Staff').notNull(),
    status: userStatusEnum('status').default('ACTIVE').notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('users_username_idx').on(table.username),
    index('users_status_idx').on(table.status),
    index('users_role_idx').on(table.role),
  ]
);
