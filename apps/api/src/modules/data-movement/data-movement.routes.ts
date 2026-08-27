/**
 * Data Movement, Import, Export, Backup & Restore Routes
 * Fastify route plugin for /api/v1/data-movement
 */

import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { dataImportService } from './import.service';
import { dataExportService } from './export.service';
import { backupRestoreService } from './backup.service';
import { validateFileSecurity } from './utils/file-validator';
import type {
  ImportEntityType,
  ImportDuplicatePolicy,
  ExportEntityType,
  ExportFormat,
  RestoreRequest,
} from '@crm/types';

export const dataMovementRoutes: FastifyPluginAsync = async (fastify) => {
  // All endpoints require authentication
  fastify.addHook('onRequest', authenticate);

  /**
   * POST /api/v1/data-movement/import/preview
   * Generates validation preview, duplicate report, and reference checks.
   * ABSOLUTELY ZERO DATABASE MUTATIONS OCCUR.
   */
  fastify.post('/import/preview', async (request, reply) => {
    const body = request.body as {
      type: ImportEntityType;
      data: string | Array<Record<string, any>>;
      filename?: string;
    };

    if (!body || !body.type || !body.data) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: "Request body must contain 'type' and 'data' payload.",
        },
      });
    }

    if (body.filename) {
      const fileSec = validateFileSecurity(body.filename, typeof body.data === 'string' ? Buffer.byteLength(body.data) : 100);
      if (!fileSec.valid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: fileSec.error,
          },
        });
      }
    }

    try {
      const preview = await dataImportService.preview(body.type, body.data, {
        userId: (request as any).user?.id,
        userRole: (request as any).user?.role,
        ipAddress: request.ip,
      });

      return reply.status(200).send({
        success: true,
        data: preview,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'IMPORT_PREVIEW_ERROR',
          message: err.message,
        },
      });
    }
  });

  /**
   * POST /api/v1/data-movement/import/execute
   * Executes validated transactional import
   */
  fastify.post('/import/execute', async (request, reply) => {
    const body = request.body as {
      type: ImportEntityType;
      records: Array<Record<string, any>>;
      duplicatePolicy?: ImportDuplicatePolicy;
    };

    if (!body || !body.type || !Array.isArray(body.records)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: "Request body must contain 'type' and 'records' array.",
        },
      });
    }

    // Role verification
    const userRole = (request as any).user?.role;
    if (['invoices', 'payments'].includes(body.type)) {
      if (!dataExportService.checkFinancialPermission(userRole)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions for financial data import.',
          },
        });
      }
    }

    try {
      const result = await dataImportService.execute(
        body.type,
        body.records,
        body.duplicatePolicy || 'CREATE',
        {
          userId: (request as any).user?.id,
          userRole,
          ipAddress: request.ip,
        }
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'IMPORT_EXECUTION_ERROR',
          message: err.message,
        },
      });
    }
  });

  /**
   * GET /api/v1/data-movement/import/template/:type
   * Downloads official CSV import template
   */
  fastify.get('/import/template/:type', async (request, reply) => {
    const { type } = request.params as { type: ImportEntityType };

    try {
      const { filename, csvContent } = dataImportService.getTemplateCsv(type);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.status(200).send(csvContent);
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: err.message,
        },
      });
    }
  });

  /**
   * GET /api/v1/data-movement/export/:entity
   * Exports dataset with formula injection sanitization and RBAC isolation
   */
  fastify.get('/export/:entity', async (request, reply) => {
    const { entity } = request.params as { entity: ExportEntityType };
    const query = request.query as {
      format?: ExportFormat;
      limit?: string;
      status?: string;
      customerType?: string;
      city?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };
    const userRole = (request as any).user?.role;

    try {
      const exportFile = await dataExportService.exportData(
        entity,
        query.format || 'csv',
        {
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          status: query.status,
          customerType: query.customerType as any,
          city: query.city,
          search: query.search,
          startDate: query.startDate,
          endDate: query.endDate,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        },
        {
          userId: (request as any).user?.id,
          userRole,
          ipAddress: request.ip,
        }
      );

      reply.header('Content-Type', exportFile.mimeType);
      reply.header('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
      return reply.status(200).send(exportFile.content);
    } catch (err: any) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: err.message,
        },
      });
    }
  });

  /**
   * POST /api/v1/data-movement/backup
   * Create an integrity-verified system backup snapshot
   */
  fastify.post(
    '/backup',
    { preHandler: [requirePermission('system.backup')] },
    async (request, reply) => {
      const body = (request.body || {}) as { notes?: string };
      try {
        const backup = await backupRestoreService.createBackup(
          body.notes,
          false,
          {
            userId: (request as any).user?.id,
            userRole: (request as any).user?.role,
            ipAddress: request.ip,
          }
        );

        return reply.status(201).send({
          success: true,
          data: backup,
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'BACKUP_FAILED',
            message: err.message,
          },
        });
      }
    }
  );

  /**
   * GET /api/v1/data-movement/backups
   * List all stored backups
   */
  fastify.get('/backups', async (_request, reply) => {
    try {
      const response = await backupRestoreService.listBackups();
      return reply.status(200).send({
        success: true,
        data: response,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'LIST_BACKUPS_FAILED',
          message: err.message,
        },
      });
    }
  });

  /**
   * GET /api/v1/data-movement/backups/:id/verify
   * Verify backup integrity and SHA-256 checksum
   */
  fastify.get('/backups/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const verification = backupRestoreService.verifyBackupIntegrity(id);
    return reply.status(200).send({
      success: true,
      data: verification,
    });
  });

  /**
   * POST /api/v1/data-movement/restore
   * High-risk system restoration with pre-restore safety backup
   */
  fastify.post(
    '/restore',
    { preHandler: [requirePermission('system.restore')] },
    async (request, reply) => {
      const body = request.body as RestoreRequest;

      if (!body || !body.backupId || !body.confirmationPhrase) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: "Missing 'backupId' or 'confirmationPhrase' in request body.",
          },
        });
      }

      try {
        const result = await backupRestoreService.restoreBackup(body, {
          userId: (request as any).user?.id,
          userRole: (request as any).user?.role,
          ipAddress: request.ip,
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'RESTORE_FAILED',
            message: err.message,
          },
        });
      }
    }
  );
};
