import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { HTTP_STATUS } from '@crm/shared';
import { WorkflowEngine } from './engine/workflow-engine';
import { WorkflowScheduler } from './engine/workflow-scheduler';
import { StateMachine, type StateEntity } from './engine/state-machine';
import { db } from '../../database/client';
import {
  workflowExecutions,
  workflowActionExecutions,
  outboxEvents,
} from '../../database/schema/index';
import { desc, eq } from 'drizzle-orm';
import type { CreateWorkflowRequest, UpdateWorkflowRequest } from '@crm/types';

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/workflows
   * List all configured workflow definitions
   */
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('workflows.view')] },
    async (request, reply) => {
      const list = await WorkflowEngine.listWorkflows();
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: list,
        total: list.length,
      });
    }
  );

  /**
   * POST /api/v1/workflows
   * Create a new workflow definition
   */
  fastify.post<{ Body: CreateWorkflowRequest }>(
    '/',
    { preHandler: [authenticate, requirePermission('workflows.manage')] },
    async (request, reply) => {
      const body = request.body;

      if (!body?.name || !body?.eventType || !body?.actions) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name, eventType, and actions are required.' },
        });
      }

      const created = await WorkflowEngine.createWorkflow(body);
      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        message: 'Workflow created successfully.',
        data: created,
      });
    }
  );

  /**
   * GET /api/v1/workflows/executions
   * Query recent workflow execution history and observability metrics
   */
  fastify.get(
    '/executions',
    { preHandler: [authenticate, requirePermission('workflows.view')] },
    async (request, reply) => {
      try {
        const rows = await db
          .select()
          .from(workflowExecutions)
          .orderBy(desc(workflowExecutions.startedAt))
          .limit(50);

        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: rows,
          total: rows.length,
        });
      } catch {
        return reply.status(HTTP_STATUS.OK).send({
          success: true,
          data: [],
          total: 0,
        });
      }
    }
  );

  /**
   * POST /api/v1/workflows/outbox/process
   * Trigger on-demand outbox processing
   */
  fastify.post(
    '/outbox/process',
    { preHandler: [authenticate, requirePermission('workflows.manage')] },
    async (request, reply) => {
      const result = await WorkflowEngine.processOutbox(25);
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: 'Outbox events processed.',
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/workflows/scheduler/run
   * Trigger on-demand execution of all scheduled automation rules
   */
  fastify.post(
    '/scheduler/run',
    { preHandler: [authenticate, requirePermission('workflows.manage')] },
    async (request, reply) => {
      const result = await WorkflowScheduler.runAllScheduledAutomations();
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        message: 'Scheduled automations executed successfully.',
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/workflows/state-machine/validate
   * Check if a state transition is legal
   */
  fastify.post<{
    Body: { entity: StateEntity; fromState: string; toState: string };
  }>(
    '/state-machine/validate',
    { preHandler: [authenticate, requirePermission('workflows.view')] },
    async (request, reply) => {
      const { entity, fromState, toState } = request.body || {};

      if (!entity || !fromState || !toState) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'entity, fromState, and toState are required.' },
        });
      }

      const isValid = StateMachine.canTransition(entity, fromState, toState);
      const allowedNextStates = StateMachine.getAllowedNextStates(entity, fromState);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: {
          entity,
          fromState,
          toState,
          valid: isValid,
          allowedNextStates,
        },
      });
    }
  );
};
