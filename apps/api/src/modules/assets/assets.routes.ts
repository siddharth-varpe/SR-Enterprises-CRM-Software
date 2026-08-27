import type { FastifyPluginAsync } from 'fastify';
import { assetsService } from './assets.service';
import { AssetQueryFilterSchema, CreateAssetSchema, UpdateAssetSchema } from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const assetsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/assets
   * List paginated customer-registered assets
   */
  fastify.get('/', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const query = AssetQueryFilterSchema.parse(request.query);
    const result = await assetsService.getAssets(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/assets/:id
   * Get single asset with warranties and service history
   */
  fastify.get('/:id', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = await assetsService.getAssetById(id);
    return reply.send({
      success: true,
      data: asset,
    });
  });

  /**
   * POST /api/v1/assets
   * Create new customer asset record
   */
  fastify.post('/', { preHandler: [requirePermission('assets.create')] }, async (request, reply) => {
    const body = CreateAssetSchema.parse(request.body);
    const created = await assetsService.createAsset(body);
    return reply.status(201).send({
      success: true,
      data: created,
    });
  });

  /**
   * PATCH /api/v1/assets/:id
   * Update asset status, location, notes
   */
  fastify.patch('/:id', { preHandler: [requirePermission('assets.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateAssetSchema.parse(request.body);
    const updated = await assetsService.updateAsset(id, body);
    return reply.send({
      success: true,
      data: updated,
    });
  });

  /**
   * DELETE /api/v1/assets/:id
   * Soft-archive an asset (set status to DECOMMISSIONED)
   */
  fastify.delete('/:id', { preHandler: [requirePermission('assets.archive')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const archived = await assetsService.archiveAsset(id);
    return reply.send({
      success: true,
      data: archived,
      message: 'Asset decommissioned and archived successfully',
    });
  });

  /**
   * POST /api/v1/assets/:id/archive
   * Soft-archive an asset alias
   */
  fastify.post('/:id/archive', { preHandler: [requirePermission('assets.archive')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const archived = await assetsService.archiveAsset(id);
    return reply.send({
      success: true,
      data: archived,
      message: 'Asset decommissioned and archived successfully',
    });
  });

  /**
   * GET /api/v1/assets/:id/warranty
   * Get active warranty detail for an asset
   */
  fastify.get('/:id/warranty', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const warranty = await assetsService.getAssetWarranty(id);
    return reply.send({
      success: true,
      data: warranty,
    });
  });

  /**
   * GET /api/v1/assets/:id/service-history
   * Get complete historical services and job cards for an asset
   */
  fastify.get('/:id/service-history', { preHandler: [requirePermission('assets.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = await assetsService.getAssetServiceHistory(id);
    return reply.send({
      success: true,
      data: history,
    });
  });
};
