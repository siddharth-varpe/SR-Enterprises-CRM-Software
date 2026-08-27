import type { FastifyPluginAsync } from 'fastify';
import { remindersService } from './reminders.service';
import {
  ReminderQueryFilterSchema,
  CreateReminderSchema,
  UpdateReminderSchema,
  CompleteReminderSchema,
} from '@crm/validation';
import { requirePermission } from '../../middleware/rbac';
import { authenticate } from '../../middleware/auth';

export const remindersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/reminders/kpis
   * Reminder counts (Pending, Due Today, Overdue, Completed)
   */
  fastify.get('/kpis', { preHandler: [requirePermission('tasks.view')] }, async (_request, reply) => {
    const kpis = await remindersService.getKPIs();
    return reply.send({
      success: true,
      data: kpis,
    });
  });

  /**
   * GET /api/v1/reminders
   * List paginated reminders with filters
   */
  fastify.get('/', { preHandler: [requirePermission('tasks.view')] }, async (request, reply) => {
    const query = ReminderQueryFilterSchema.parse(request.query);
    const result = await remindersService.getReminders(query);
    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/v1/reminders/:id
   * Get single reminder
   */
  fastify.get('/:id', { preHandler: [requirePermission('tasks.view')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reminder = await remindersService.getReminderById(id);
    return reply.send({
      success: true,
      data: reminder,
    });
  });

  /**
   * POST /api/v1/reminders
   * Create a new reminder
   */
  fastify.post('/', { preHandler: [requirePermission('tasks.manage')] }, async (request, reply) => {
    const body = CreateReminderSchema.parse(request.body);
    const user = (request as any).user;
    const result = await remindersService.createReminder(body, user?.id);
    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Reminder created successfully',
    });
  });

  /**
   * PATCH /api/v1/reminders/:id
   * Update reminder date/time/priority/notes
   */
  fastify.patch('/:id', { preHandler: [requirePermission('tasks.manage')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateReminderSchema.parse(request.body);
    const user = (request as any).user;
    const updated = await remindersService.updateReminder(id, body, user?.id);
    return reply.send({
      success: true,
      data: updated,
      message: 'Reminder updated successfully',
    });
  });

  /**
   * POST /api/v1/reminders/:id/complete
   * Mark reminder as completed
   */
  fastify.post('/:id/complete', { preHandler: [requirePermission('tasks.manage')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CompleteReminderSchema.parse(request.body || {});
    const user = (request as any).user;
    const result = await remindersService.completeReminder(id, body, user?.id);
    return reply.send({
      success: true,
      data: result,
      message: 'Reminder marked as completed',
    });
  });

  /**
   * POST /api/v1/reminders/:id/cancel
   * Cancel reminder
   */
  fastify.post('/:id/cancel', { preHandler: [requirePermission('tasks.manage')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const result = await remindersService.cancelReminder(id, user?.id);
    return reply.send({
      success: true,
      data: result,
      message: 'Reminder cancelled',
    });
  });

  /**
   * POST /api/v1/reminders/process-rules
   * Trigger on-demand automated follow-up engine scan (Warranties, Invoices, Service Due)
   */
  fastify.post('/process-rules', { preHandler: [requirePermission('tasks.manage')] }, async (_request, reply) => {
    const { automatedFollowUpService } = await import('./automated-followup.service');
    const result = await automatedFollowUpService.processAllAutomatedFollowUps();
    return reply.send({
      success: true,
      data: result,
      message: 'Automated follow-up rules processed successfully',
    });
  });
};
