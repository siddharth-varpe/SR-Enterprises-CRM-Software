import type { FastifyPluginAsync } from 'fastify';
import { serviceBillingService } from './service-billing.service';
import { GenerateServiceInvoiceSchema } from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';
import { z } from 'zod';

const JobCardIdParamSchema = z.object({
  jobCardId: z.string().uuid('Invalid Job Card ID'),
});

export const serviceBillingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/service-billing/job-card/:jobCardId
   * Preview billable components and warranty coverage for a Job Card
   */
  fastify.get(
    '/job-card/:jobCardId',
    { preHandler: [requirePermission('invoices.view')] },
    async (request, reply) => {
      const { jobCardId } = JobCardIdParamSchema.parse(request.params);
      const summary = await serviceBillingService.getBillingSummary(jobCardId);
      return reply.send({
        success: true,
        data: summary,
      });
    }
  );

  /**
   * POST /api/v1/service-billing/generate
   * Generate authoritative service invoice with atomic inventory deduction
   */
  fastify.post(
    '/generate',
    { preHandler: [requirePermission('invoices.create')] },
    async (request, reply) => {
      const body = GenerateServiceInvoiceSchema.parse(request.body);
      const user = (request as any).user;
      const actorId = user?.id;
      const actorName = user?.fullName || user?.email || 'Staff';

      const result = await serviceBillingService.generateServiceInvoice(body, actorId, actorName);
      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Service Invoice generated successfully',
      });
    }
  );
};
