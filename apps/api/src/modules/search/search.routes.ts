import type { FastifyPluginAsync } from 'fastify';
import { globalSearchService } from './search.service';
import { authenticate } from '../../middleware/auth';
import { HTTP_STATUS } from '@crm/shared';
import type { GlobalSearchQuery, AdvancedSearchRequest } from '@crm/types';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  /**
   * GET /api/v1/search
   * Global multi-domain search across Customers, Assets, Products, Invoices, Payments, Services, Job Cards, Warranties, Technicians, Inquiries, Sales, Inventory
   */
  fastify.get<{ Querystring: GlobalSearchQuery }>(
    '/',
    async (request, reply) => {
      const user = (request as any).user;
      const q = request.query.q || '';
      const types = request.query.types;
      const limit = request.query.limit ? Number(request.query.limit) : 8;
      const offset = request.query.offset ? Number(request.query.offset) : 0;

      const results = await globalSearchService.search(
        q,
        { types, limit, offset },
        {
          userId: user?.userId || user?.id,
          userRole: user?.role,
          permissions: user?.permissions,
        }
      );

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: results,
      });
    }
  );

  /**
   * GET /api/v1/search/suggest
   * Rapid autocomplete suggestions for command palette & quick search
   */
  fastify.get<{ Querystring: { q?: string; limit?: number } }>(
    '/suggest',
    async (request, reply) => {
      const user = (request as any).user;
      const q = request.query.q || '';
      const limit = request.query.limit ? Number(request.query.limit) : 6;

      const suggestions = await globalSearchService.suggest(
        q,
        limit,
        {
          userId: user?.userId || user?.id,
          userRole: user?.role,
          permissions: user?.permissions,
        }
      );

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: suggestions,
      });
    }
  );

  /**
   * POST /api/v1/search/advanced
   * Structured entity filtering and advanced search
   */
  fastify.post<{ Body: AdvancedSearchRequest }>(
    '/advanced',
    async (request, reply) => {
      const user = (request as any).user;
      const body = request.body;

      if (!body?.entityType) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'entityType is required.' },
        });
      }

      try {
        const results = await globalSearchService.advancedSearch(body, {
          userId: user?.userId || user?.id,
          userRole: user?.role,
          permissions: user?.permissions,
        });

        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: results,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'SEARCH_FILTER_ERROR', message: err.message },
        });
      }
    }
  );
};
