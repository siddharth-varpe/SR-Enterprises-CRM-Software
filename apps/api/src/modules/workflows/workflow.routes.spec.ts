import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { workflowRoutes } from './workflow.routes';
import { HTTP_STATUS } from '@crm/shared';

// Mock auth & rbac middleware
vi.mock('../../middleware/auth', () => ({
  authenticate: vi.fn(async (req, _reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      const err = new Error('Authentication required');
      (err as any).statusCode = 401;
      throw err;
    }
    const role = authHeader.includes('Technician') ? 'Technician' : 'Super Admin';
    req.user = {
      userId: 'usr-admin-1',
      username: 'admin',
      role,
      displayName: 'System Admin',
    };
  }),
}));

vi.mock('../../middleware/rbac', () => ({
  requirePermission: vi.fn((...permissions: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (userRole === 'Technician' && !permissions.includes('technician.access')) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
  requireAnyPermission: vi.fn((...permissions: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (userRole === 'Technician' && !permissions.includes('technician.access')) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
  requireRole: vi.fn((...roles: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
  authorize: vi.fn((allowedPermissions: string[]) => async (req: any, reply: any) => {
    const userRole = req.user?.role;
    if (userRole === 'Technician' && !allowedPermissions.includes('technician.access')) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permission' },
      });
    }
  }),
}));

describe('Workflow Routes Integration (/api/v1/workflows)', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(workflowRoutes, { prefix: '/workflows' });
    await app.ready();
  });

  it('GET /workflows returns list of workflows', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/workflows',
      headers: { authorization: 'Bearer admin-token' },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /workflows creates a new workflow definition', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/workflows',
      headers: { authorization: 'Bearer admin-token' },
      payload: {
        name: 'Auto WhatsApp Notification on Delivery',
        eventType: 'SaleCompleted',
        priority: 15,
        isActive: true,
        conditions: {
          logic: 'AND',
          conditions: [{ field: 'payload.customerPhone', operator: 'exists' }],
        },
        actions: [
          { type: 'SEND_WHATSAPP', params: { templateName: 'delivery_completed' } },
        ],
      },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.CREATED);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Auto WhatsApp Notification on Delivery');
  });

  it('POST /workflows/state-machine/validate validates state transitions', async () => {
    const validRes = await app.inject({
      method: 'POST',
      url: '/workflows/state-machine/validate',
      headers: { authorization: 'Bearer admin-token' },
      payload: {
        entity: 'SALE',
        fromState: 'DRAFT',
        toState: 'COMPLETED',
      },
    });

    expect(validRes.statusCode).toBe(HTTP_STATUS.OK);
    const validBody = JSON.parse(validRes.body);
    expect(validBody.data.valid).toBe(true);

    const invalidRes = await app.inject({
      method: 'POST',
      url: '/workflows/state-machine/validate',
      headers: { authorization: 'Bearer admin-token' },
      payload: {
        entity: 'SALE',
        fromState: 'CANCELLED',
        toState: 'COMPLETED',
      },
    });

    expect(invalidRes.statusCode).toBe(HTTP_STATUS.OK);
    const invalidBody = JSON.parse(invalidRes.body);
    expect(invalidBody.data.valid).toBe(false);
  });

  it('POST /workflows/outbox/process triggers outbox batch execution', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/workflows/outbox/process',
      headers: { authorization: 'Bearer admin-token' },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('processedCount');
  });

  it('POST /workflows/scheduler/run triggers scheduled automation execution', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/workflows/scheduler/run',
      headers: { authorization: 'Bearer admin-token' },
    });

    expect(res.statusCode).toBe(HTTP_STATUS.OK);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('overdueInvoicesProcessed');
  });
});
