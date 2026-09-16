import type { FastifyPluginAsync } from 'fastify';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventoryItemQueryFilterSchema,
  CreateInventoryPurchaseSchema,
  UpdateInventoryPurchaseSchema,
  InventoryPurchaseQueryFilterSchema,
  CreateInventorySaleSchema,
  UpdateInventorySaleSchema,
  InventorySaleQueryFilterSchema,
  InventoryAnalyticsFilterSchema,
  InventoryProfitLedgerFilterSchema,
} from '@crm/validation';
import { inventoryManagementService } from './inventory-management.service';
import { authenticate } from '../../middleware/auth';
import { HTTP_STATUS } from '@crm/shared';

export const inventoryManagementRoutes: FastifyPluginAsync = async (fastify) => {
  // All inventory management endpoints require authenticated session
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/inventory-management/items
   * Query inventory items (spare parts, accessories) with stock status and filters
   */
  fastify.get('/items', async (request, reply) => {
    const query = InventoryItemQueryFilterSchema.parse(request.query);
    const result = await inventoryManagementService.getItems(query);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/inventory-management/items/:id
   * Get single inventory item with its stock history
   */
  fastify.get('/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await inventoryManagementService.getItemById(id);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: item,
    });
  });

  /**
   * POST /api/v1/inventory-management/items
   * Create new inventory item
   */
  fastify.post('/items', async (request, reply) => {
    try {
      const body = CreateInventoryItemSchema.parse(request.body);
      const item = await inventoryManagementService.createItem(body);
      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: item,
        message: 'Inventory item created successfully',
      });
    } catch (err: any) {
      console.error('*** INVENTORY CREATE ITEM ERROR ***', err);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err?.message,
          stack: err?.stack,
        },
      });
    }
  });

  /**
   * PUT /api/v1/inventory-management/items/:id
   * Update existing inventory item
   */
  fastify.put('/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateInventoryItemSchema.parse(request.body);
    const item = await inventoryManagementService.updateItem(id, body);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: item,
      message: 'Inventory item updated successfully',
    });
  });

  /**
   * DELETE /api/v1/inventory-management/items/:id
   * Safely delete inventory item if not referenced by protected historical records
   */
  fastify.delete('/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const deletedItem = await inventoryManagementService.deleteItem(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: deletedItem,
        message: 'Inventory item deleted successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('already used in existing inventory')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'CANNOT_DELETE_REFERENCED_ITEM',
            message: err.message,
          },
        });
      }
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/inventory-management/purchases
   * Query inward stock purchase history
   */
  fastify.get('/purchases', async (request, reply) => {
    const query = InventoryPurchaseQueryFilterSchema.parse(request.query);
    const result = await inventoryManagementService.getPurchases(query);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/inventory-management/purchases/:id
   * Get single purchase details
   */
  fastify.get('/purchases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const purchase = await inventoryManagementService.getPurchaseById(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: purchase,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * POST /api/v1/inventory-management/purchases
   * Record a new inward purchase (increments stock)
   */
  fastify.post('/purchases', async (request, reply) => {
    const body = CreateInventoryPurchaseSchema.parse(request.body);
    const purchase = await inventoryManagementService.createPurchase(body);
    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: purchase,
      message: 'Purchase recorded successfully and stock updated',
    });
  });

  /**
   * PUT /api/v1/inventory-management/purchases/:id
   * Edit purchase record and recalculate stock + batch totals
   */
  fastify.put('/purchases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = UpdateInventoryPurchaseSchema.parse(request.body);
      const purchase = await inventoryManagementService.updatePurchase(id, body);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: purchase,
        message: 'Purchase record updated and stock recalculated successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Cannot reduce purchase quantity')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'CANNOT_REDUCE_PURCHASE_QUANTITY',
            message: err.message,
          },
        });
      }
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * DELETE /api/v1/inventory-management/purchases/:id
   * Delete purchase record and deduct stock from inventory item
   */
  fastify.delete('/purchases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await inventoryManagementService.deletePurchase(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
        message: 'Purchase record deleted and stock recalculated successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Cannot delete purchase')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'CANNOT_DELETE_PURCHASE',
            message: err.message,
          },
        });
      }
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/inventory-management/sales
   * Query outward sales history
   */
  fastify.get('/sales', async (request, reply) => {
    const query = InventorySaleQueryFilterSchema.parse(request.query);
    const result = await inventoryManagementService.getSales(query);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/inventory-management/sales/:id
   * Get single sale details
   */
  fastify.get('/sales/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const sale = await inventoryManagementService.getSaleById(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: sale,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * POST /api/v1/inventory-management/sales
   * Record a new sale with FIFO cost allocation, stock decrement, and profit calculation
   */
  fastify.post('/sales', async (request, reply) => {
    const body = CreateInventorySaleSchema.parse(request.body);
    try {
      const sale = await inventoryManagementService.createSale(body);
      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: sale,
        message: 'Sale recorded successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient stock')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * PUT /api/v1/inventory-management/sales/:id
   * Edit sale record and recalculate stock, revenue, cost, and profit
   */
  fastify.put('/sales/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = UpdateInventorySaleSchema.parse(request.body);
      const sale = await inventoryManagementService.updateSale(id, body);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: sale,
        message: 'Sale record updated and profit recalculated successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient stock')) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: err.message,
          },
        });
      }
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * DELETE /api/v1/inventory-management/sales/:id
   * Delete sale record and restore stock to inventory item
   */
  fastify.delete('/sales/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await inventoryManagementService.deleteSale(id);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: result,
        message: 'Sale record deleted and stock restored successfully',
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: err.message,
          },
        });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/inventory-management/analytics
   * Comprehensive KPI metrics, trend charts, and rankings
   */
  fastify.get('/analytics', async (request, reply) => {
    const filter = InventoryAnalyticsFilterSchema.parse(request.query);
    const analytics = await inventoryManagementService.getAnalytics(filter);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: analytics,
    });
  });

  /**
   * GET /api/v1/inventory-management/profit-ledger
   * Transaction-level profit breakdown table
   */
  fastify.get('/profit-ledger', async (request, reply) => {
    const filter = InventoryProfitLedgerFilterSchema.parse(request.query);
    const ledger = await inventoryManagementService.getProfitLedger(filter);
    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: ledger.data,
      pagination: ledger.pagination,
    });
  });
};
