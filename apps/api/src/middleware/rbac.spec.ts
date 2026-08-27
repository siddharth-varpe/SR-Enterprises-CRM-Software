import { describe, it, expect } from 'vitest';
import { requirePermission, requireRole } from './rbac';

describe('Phase 2 — RBAC & Permission Authorization Middleware', () => {
  it('should allow Super Admin access to all permission-guarded routes automatically', async () => {
    let denied = false;
    let statusCode = 200;

    const mockRequest: any = {
      user: {
        sessionId: 'sess-1',
        userId: 'super-admin-id',
        username: 'superadmin',
        displayName: 'Super Admin',
        role: 'Super Admin',
      },
    };

    const mockReply: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          send: () => {
            denied = true;
          },
        };
      },
    };

    const guard = requirePermission('settings.manage', 'invoices.cancel', 'users.manage');
    await guard(mockRequest, mockReply);

    expect(denied).toBe(false);
    expect(statusCode).toBe(200);
  });

  it('should reject unauthorized role using requireRole guard', async () => {
    let denied = false;
    let responsePayload: any = null;

    const mockRequest: any = {
      user: {
        sessionId: 'sess-2',
        userId: 'tech-id',
        username: 'tech1',
        displayName: 'Technician 1',
        role: 'Technician',
      },
    };

    const mockReply: any = {
      status: (code: number) => {
        expect(code).toBe(403);
        return {
          send: (payload: any) => {
            denied = true;
            responsePayload = payload;
          },
        };
      },
    };

    const guard = requireRole('Super Admin', 'Admin');
    await guard(mockRequest, mockReply);

    expect(denied).toBe(true);
    expect(responsePayload.success).toBe(false);
    expect(responsePayload.error.code).toBe('FORBIDDEN');
  });
});
