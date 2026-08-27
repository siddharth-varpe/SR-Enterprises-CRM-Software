import type { FastifyPluginAsync } from 'fastify';
import { inventoryService } from './inventory.service';
import { InventoryAdjustmentSchema, InventoryQueryFilterSchema } from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/inventory
   * List catalog stock levels across all products
   */
  fastify.get('/', { preHandler: [requirePermission('products.view')] }, async (request, reply) => {
    const query = InventoryQueryFilterSchema.parse(request.query);
    const result = await inventoryService.getStockLevels(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/inventory/:productId
   * Get authoritative stock balance for a single product
   */
  fastify.get('/:productId', { preHandler: [requirePermission('products.view')] }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const balance = await inventoryService.getStockBalance(productId);
    return reply.send({
      success: true,
      data: balance,
    });
  });

  /**
   * POST /api/v1/inventory/adjustments
   * Record controlled inventory adjustment with reason & audit trail
   */
  fastify.post('/adjustments', { preHandler: [requirePermission('products.update')] }, async (request, reply) => {
    const body = InventoryAdjustmentSchema.parse(request.body);
    const actorId = request.user?.userId;
    const actorName = request.user?.displayName;

    const transaction = await inventoryService.adjustStock(body, actorId, actorName);
    return reply.status(201).send({
      success: true,
      data: transaction,
      message: 'Inventory adjustment recorded successfully',
    });
  });

  /**
   * GET /api/v1/inventory/transactions
   * Query immutable inventory audit transactions
   */
  fastify.get('/transactions', { preHandler: [requirePermission('products.view')] }, async (request, reply) => {
    const query = InventoryQueryFilterSchema.parse(request.query);
    const result = await inventoryService.getTransactions(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });
};
