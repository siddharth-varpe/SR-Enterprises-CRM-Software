import type { FastifyPluginAsync } from 'fastify';
import { notificationsService } from './notifications.service';
import {
  notificationQueryFilterSchema,
  updateNotificationPreferencesSchema,
} from '@crm/validation';
import { authenticate } from '../../middleware/auth';

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/notifications
   */
  fastify.get('/', async (request, reply) => {
    const user = (request as any).user;
    const filter = notificationQueryFilterSchema.parse(request.query);
    const result = await notificationsService.listNotifications(
      user.id,
      user.role,
      filter as any
    );
    return reply.status(200).send({ success: true, ...result });
  });

  /**
   * GET /api/v1/notifications/unread-count
   */
  fastify.get('/unread-count', async (request, reply) => {
    const user = (request as any).user;
    const data = await notificationsService.getUnreadCount(user.id, user.role);
    return reply.status(200).send({ success: true, data });
  });

  /**
   * PATCH /api/v1/notifications/:id/read & POST /api/v1/notifications/:id/read
   */
  const markReadHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const updated = await notificationsService.markAsRead(id, user.id, user.role);

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found or access denied.' },
      });
    }

    return reply.status(200).send({ success: true, data: updated });
  };

  fastify.patch('/:id/read', markReadHandler);
  fastify.post('/:id/read', markReadHandler);

  /**
   * POST /api/v1/notifications/read-all
   */
  fastify.post('/read-all', async (request, reply) => {
    const user = (request as any).user;
    const count = await notificationsService.markAllAsRead(user.id, user.role);
    return reply.status(200).send({ success: true, data: { markedCount: count } });
  });

  /**
   * GET /api/v1/notifications/preferences
   */
  fastify.get('/preferences', async (request, reply) => {
    const user = (request as any).user;
    const data = await notificationsService.getPreferences(user.id);
    return reply.status(200).send({ success: true, data });
  });

  /**
   * PATCH /api/v1/notifications/preferences
   */
  fastify.patch('/preferences', async (request, reply) => {
    const user = (request as any).user;
    const body = updateNotificationPreferencesSchema.parse(request.body);
    const data = await notificationsService.updatePreferences(user.id, body);
    return reply.status(200).send({ success: true, data });
  });

  /**
   * POST /api/v1/notifications/email/test - Admin SMTP test email
   */
  fastify.post('/email/test', async (request, reply) => {
    const user = (request as any).user;
    const body = (request.body || {}) as { targetEmail?: string };
    const targetEmail = body.targetEmail || user?.email;

    if (!targetEmail || !targetEmail.includes('@')) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Valid target email address is required.' },
      });
    }

    const { emailService } = await import('./email.service');
    const result = await emailService.sendAdminTestEmail(targetEmail);
    return reply.status(result.success ? 200 : 500).send(result);
  });

  /**
   * GET /api/v1/notifications/email/history - Transactional email audit log
   */
  fastify.get('/email/history', async (request, reply) => {
    const query = (request.query || {}) as { page?: string; limit?: string; status?: string; search?: string };
    const { emailService } = await import('./email.service');
    const result = await emailService.listEmailHistory({
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      status: query.status,
      search: query.search,
    });
    return reply.status(200).send({ success: true, ...result });
  });

  /**
   * POST /api/v1/notifications/email/cron - Trigger scheduled due reminder scans
   */
  fastify.post('/email/cron', async (_request, reply) => {
    const { emailScheduler } = await import('./email-scheduler');
    const result = await emailScheduler.runScheduledTasks();
    return reply.status(200).send({ success: true, data: result });
  });
};

