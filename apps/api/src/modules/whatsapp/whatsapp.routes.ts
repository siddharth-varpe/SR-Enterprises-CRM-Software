import type { FastifyPluginAsync } from 'fastify';
import { whatsappService } from './whatsapp.service';
import {
  SendWhatsAppTextMessageSchema,
  SendWhatsAppTemplateMessageSchema,
  UpdateWhatsAppConsentSchema,
  WhatsAppConversationQueryFilterSchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/whatsapp/templates
   * List approved WhatsApp business templates
   */
  fastify.get('/templates', { preHandler: [requirePermission('whatsapp.view')] }, async (_request, reply) => {
    const templates = whatsappService.getApprovedTemplates();
    return reply.send({
      success: true,
      data: templates,
    });
  });

  /**
   * GET /api/v1/whatsapp/conversations
   * List paginated conversations
   */
  fastify.get('/conversations', { preHandler: [requirePermission('whatsapp.view')] }, async (request, reply) => {
    const query = WhatsAppConversationQueryFilterSchema.parse(request.query);
    const result = await whatsappService.listConversations({
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      status: query.status,
    });
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/whatsapp/conversations/:id
   * Get single conversation details
   */
  fastify.get('/conversations/:id', { preHandler: [requirePermission('whatsapp.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await whatsappService.getConversationById(id);
    return reply.send({
      success: true,
      data: conversation,
    });
  });

  /**
   * GET /api/v1/whatsapp/conversations/:id/messages
   * Get paginated messages for a conversation
   */
  fastify.get('/conversations/:id/messages', { preHandler: [requirePermission('whatsapp.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { page, limit } = request.query as { page?: string; limit?: string };
    const result = await whatsappService.listMessages(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * POST /api/v1/whatsapp/conversations/:id/read
   * Mark conversation as read
   */
  fastify.post('/conversations/:id/read', { preHandler: [requirePermission('whatsapp.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await whatsappService.markAsRead(id);
    return reply.send({
      success: true,
      message: 'Conversation marked as read',
    });
  });

  /**
   * POST /api/v1/whatsapp/messages
   * Send outbound text message
   */
  fastify.post('/messages', { preHandler: [requirePermission('whatsapp.send')] }, async (request, reply) => {
    const body = SendWhatsAppTextMessageSchema.parse(request.body);
    const user = (request as any).user;
    const message = await whatsappService.sendTextMessage(
      {
        content: body.content,
        conversationId: body.conversationId || undefined,
        customerId: body.customerId || undefined,
        phone: body.phone || undefined,
      },
      user?.id
    );
    return reply.status(201).send({
      success: true,
      data: message,
      message: message?.status === 'SENT' ? 'Message sent successfully' : 'Message queued for delivery',
    });
  });

  /**
   * POST /api/v1/whatsapp/send-template
   * Send pre-approved template message (e.g. from invoices, reminders, job cards)
   */
  fastify.post('/send-template', { preHandler: [requirePermission('whatsapp.send')] }, async (request, reply) => {
    const body = SendWhatsAppTemplateMessageSchema.parse(request.body);
    const user = (request as any).user;
    const message = await whatsappService.sendTemplateMessage(
      {
        templateName: body.templateName,
        recipientPhone: body.recipientPhone,
        parameters: body.parameters,
        customerId: body.customerId || undefined,
        conversationId: body.conversationId || undefined,
      },
      user?.id
    );
    return reply.status(201).send({
      success: true,
      data: message,
      message: 'WhatsApp template sent successfully',
    });
  });

  /**
   * POST /api/v1/whatsapp/contacts/consent
   * Update opt-in / consent status
   */
  fastify.post('/contacts/consent', { preHandler: [requirePermission('whatsapp.send')] }, async (request, reply) => {
    const body = UpdateWhatsAppConsentSchema.parse(request.body);
    const contact = await whatsappService.updateConsent(body.contactId || '', body.optInStatus);
    return reply.send({
      success: true,
      data: contact,
      message: `Consent updated to ${body.optInStatus}`,
    });
  });
};
