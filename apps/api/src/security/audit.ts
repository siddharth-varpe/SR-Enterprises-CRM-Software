import { db } from '../database/client';
import { auditLogs } from '../database/schema/index';
import type { AuditAction } from '@crm/types';

export interface SecurityAuditParams {
  actorId?: string | null;
  actorUsername?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  changeReason?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
}

/**
 * Record an immutable security event into the audit_logs table
 */
export async function logSecurityAudit(
  params: SecurityAuditParams,
  database = db
): Promise<void> {
  try {
    // Strictly sanitize and redact sensitive fields from audit states if present
    const sanitizeState = (state: Record<string, unknown> | null | undefined) => {
      if (!state) return null;
      const copy = { ...state };
      const redactKeys = ['password', 'passwordHash', 'captchaAnswer', 'token', 'sessionToken', 'secret'];
      for (const k of redactKeys) {
        if (k in copy) {
          copy[k] = '[REDACTED]';
        }
      }
      return copy;
    };

    await database.insert(auditLogs).values({
      actorId: params.actorId ?? null,
      actorUsername: params.actorUsername ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: sanitizeState(params.beforeState),
      afterState: sanitizeState(params.afterState),
      changeReason: params.changeReason ?? null,
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (error) {
    // Security audit logging failure must be reported to stderr but not crash request
    console.error('[Security Audit] Failed to record security log:', error);
  }
}
