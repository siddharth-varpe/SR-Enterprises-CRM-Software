import type { FastifyPluginAsync } from 'fastify';
import { warrantiesService } from './warranties.service';
import {
  WarrantyQueryFilterSchema,
  CreateWarrantySchema,
  UpdateWarrantySchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const warrantiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/warranties/kpis
   * High-level operational KPIs for Warranty overview
   */
  fastify.get('/kpis', { preHandler: [requirePermission('assets.view')] }, async (_request, reply) => {
    const kpis = await warrantiesService.getKPIs();
    return reply.send({
      success: true,
      data: kpis,
    });
  });

  /**
   * GET /api/v1/warranties/expiring
   * Queries warranties expiring in next N days (default 30)
   */
  fastify.get('/expiring', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const { days } = request.query as { days?: string };
    const result = await warrantiesService.getExpiringWarranties(days ? Number(days) : 30);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/warranties
   * List paginated warranties with filters
   */
  fastify.get('/', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const query = WarrantyQueryFilterSchema.parse(request.query);
    const result = await warrantiesService.getWarranties(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/warranties/:id
   * Get single warranty with lifecycle events
   */
  fastify.get('/:id', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const warranty = await warrantiesService.getWarrantyById(id);
    return reply.send({
      success: true,
      data: warranty,
    });
  });

  /**
   * POST /api/v1/warranties
   * Create / Register a new Warranty
   */
  fastify.post('/', { preHandler: [requirePermission('assets.update')] }, async (request, reply) => {
    const body = CreateWarrantySchema.parse(request.body);
    const user = (request as any).user;
    const result = await warrantiesService.createWarranty(body, user?.id);
    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Warranty registered successfully',
    });
  });

  /**
   * PATCH /api/v1/warranties/:id
   * Update warranty status, extension, or terms
   */
  fastify.patch('/:id', { preHandler: [requirePermission('assets.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateWarrantySchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';
    const updated = await warrantiesService.updateWarranty(id, body, actorId, actorName);
    return reply.send({
      success: true,
      data: updated,
      message: 'Warranty updated successfully',
    });
  });

  /**
   * POST /api/v1/warranties/:id/cancel
   * Cancel / Void a warranty with reason
   */
  fastify.post('/:id/cancel', { preHandler: [requirePermission('assets.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body || {}) as { reason?: string };
    const actorId = request.user?.userId;
    const actorName = request.user?.username || 'Staff';
    const cancelled = await warrantiesService.cancelWarranty(id, reason || 'Warranty voided by staff', actorId, actorName);
    return reply.send({
      success: true,
      data: cancelled,
      message: 'Warranty cancelled successfully',
    });
  });
};
