import type { FastifyPluginAsync } from 'fastify';
import { inquiriesService } from './inquiries.service';
import {
  InquiryQueryFilterSchema,
  CreateInquirySchema,
  UpdateInquirySchema,
  AssignInquirySchema,
  UpdateInquiryStatusSchema,
  InquiryFollowUpSchema,
  ConvertInquirySchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const inquiriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/inquiries/kpis
   */
  fastify.get('/kpis', { preHandler: [requirePermission('inquiries.view')] }, async (_request, reply) => {
    const kpis = await inquiriesService.getKPIs();
    return reply.send({
      success: true,
      data: kpis,
    });
  });

  /**
   * GET /api/v1/inquiries
   */
  fastify.get('/', { preHandler: [requirePermission('inquiries.view')] }, async (request, reply) => {
    const query = InquiryQueryFilterSchema.parse(request.query);
    const result = await inquiriesService.getInquiries(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/inquiries/:id
   */
  fastify.get('/:id', { preHandler: [requirePermission('inquiries.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const inquiry = await inquiriesService.getInquiryById(id);
    return reply.send({
      success: true,
      data: inquiry,
    });
  });

  /**
   * POST /api/v1/inquiries (Manual Creation by CRM Staff)
   */
  fastify.post('/', { preHandler: [requirePermission('inquiries.create')] }, async (request, reply) => {
    const body = CreateInquirySchema.parse(request.body);
    const user = (request as any).user;
    const inquiry = await inquiriesService.createInquiry(body, user?.id);
    return reply.status(201).send({
      success: true,
      data: inquiry,
      message: 'Inquiry created successfully',
    });
  });

  /**
   * PATCH /api/v1/inquiries/:id
   */
  fastify.patch('/:id', { preHandler: [requirePermission('inquiries.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateInquirySchema.parse(request.body);
    const user = (request as any).user;
    const updated = await inquiriesService.updateInquiry(id, body, user?.id);
    return reply.send({
      success: true,
      data: updated,
      message: 'Inquiry updated successfully',
    });
  });

  /**
   * POST /api/v1/inquiries/:id/assign
   */
  fastify.post('/:id/assign', { preHandler: [requirePermission('inquiries.assign')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = AssignInquirySchema.parse(request.body);
    const user = (request as any).user;
    const updated = await inquiriesService.assignInquiry(id, body, user?.id);
    return reply.send({
      success: true,
      data: updated,
      message: 'Inquiry assigned successfully',
    });
  });

  /**
   * POST /api/v1/inquiries/:id/status
   */
  fastify.post('/:id/status', { preHandler: [requirePermission('inquiries.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateInquiryStatusSchema.parse(request.body);
    const user = (request as any).user;
    const updated = await inquiriesService.updateStatus(id, body, user?.id);
    return reply.send({
      success: true,
      data: updated,
      message: `Inquiry status updated to ${body.status}`,
    });
  });

  /**
   * POST /api/v1/inquiries/:id/follow-up
   */
  fastify.post('/:id/follow-up', { preHandler: [requirePermission('inquiries.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = InquiryFollowUpSchema.parse(request.body);
    const user = (request as any).user;
    const updated = await inquiriesService.addFollowUp(id, body, user?.id);
    return reply.send({
      success: true,
      data: updated,
      message: 'Follow-up note added',
    });
  });

  /**
   * POST /api/v1/inquiries/:id/convert
   */
  fastify.post('/:id/convert', { preHandler: [requirePermission('inquiries.convert')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ConvertInquirySchema.parse(request.body || {});
    const user = (request as any).user;
    const result = await inquiriesService.convertToCustomer(id, body, user?.id);
    return reply.send({
      success: true,
      data: result,
      message: result.isExistingCustomerLinked
        ? 'Inquiry linked to existing customer account'
        : 'Inquiry converted to new customer account',
    });
  });

  /**
   * POST /api/v1/inquiries/:id/close
   */
  fastify.post('/:id/close', { preHandler: [requirePermission('inquiries.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { notes } = (request.body as any) || {};
    const user = (request as any).user;
    const result = await inquiriesService.closeInquiry(id, notes, user?.id);
    return reply.send({
      success: true,
      data: result,
      message: 'Inquiry closed',
    });
  });

  /**
   * POST /api/v1/inquiries/:id/spam
   */
  fastify.post('/:id/spam', { preHandler: [requirePermission('inquiries.update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { notes } = (request.body as any) || {};
    const user = (request as any).user;
    const result = await inquiriesService.markSpam(id, notes, user?.id);
    return reply.send({
      success: true,
      data: result,
      message: 'Inquiry marked as spam',
    });
  });
};
