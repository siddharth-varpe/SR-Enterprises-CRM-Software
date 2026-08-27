import type { FastifyPluginAsync } from 'fastify';
import { productRepository } from './product.repository';
import {
  ProductQueryFilterSchema,
  CreateProductSchema,
  UpdateProductSchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const productRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/products
   * List catalog items with search and type filters
   */
  fastify.get('/', { preHandler: [requirePermission('products.view')] }, async (request, reply) => {
    const query = ProductQueryFilterSchema.parse(request.query);
    const result = await productRepository.findPaginated(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/products/:id
   * Get single product details
   */
  fastify.get('/:id', { preHandler: [requirePermission('products.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await productRepository.findById(id);
    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }
    return reply.send({
      success: true,
      data: product,
    });
  });

  /**
   * POST /api/v1/products
   * Create new product in catalog with unique SKU validation
   */
  fastify.post('/', { preHandler: [requirePermission('products.create')] }, async (request, reply) => {
    const body = CreateProductSchema.parse(request.body);

    const existingSku = await productRepository.findBySku(body.sku);
    if (existingSku) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'DUPLICATE_SKU',
          message: `A product with SKU "${body.sku}" already exists in the catalog.`,
        },
      });
    }

    const created = await productRepository.create(body);
    return reply.status(201).send({
      success: true,
      data: created,
    });
  });

  /**
   * PATCH /api/v1/products/:id
   * Update catalog product
   */
  fastify.patch('/:id', { preHandler: [requirePermission('products.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateProductSchema.parse(request.body);

    if (body.sku) {
      const existingSku = await productRepository.findBySku(body.sku);
      if (existingSku && existingSku.id !== id) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'DUPLICATE_SKU',
            message: `A product with SKU "${body.sku}" already exists in the catalog.`,
          },
        });
      }
    }

    const updated = await productRepository.update(id, body);
    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }
    return reply.send({
      success: true,
      data: updated,
    });
  });

  /**
   * DELETE /api/v1/products/:id
   * Soft-archive catalog product (preserves historical relations)
   */
  fastify.delete('/:id', { preHandler: [requirePermission('products.archive')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const archived = await productRepository.archive(id);
    if (!archived) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }
    return reply.send({
      success: true,
      data: archived,
      message: 'Product archived successfully',
    });
  });

  /**
   * POST /api/v1/products/:id/archive
   * Soft-archive catalog product alias
   */
  fastify.post('/:id/archive', { preHandler: [requirePermission('products.archive')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const archived = await productRepository.archive(id);
    if (!archived) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }
    return reply.send({
      success: true,
      data: archived,
      message: 'Product archived successfully',
    });
  });
};
