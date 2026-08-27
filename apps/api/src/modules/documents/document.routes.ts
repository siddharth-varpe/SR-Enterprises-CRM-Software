import type { FastifyPluginAsync } from 'fastify';
import { documentService } from './document.service';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { HTTP_STATUS } from '@crm/shared';
import type {
  UploadDocumentRequest,
  AttachDocumentRequest,
  DocumentEntityType,
} from '@crm/types';

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * POST /api/v1/documents/upload
   * Upload and register a new document
   */
  fastify.post<{ Body: UploadDocumentRequest }>(
    '/upload',
    { preHandler: [requirePermission('documents.upload')] },
    async (request, reply) => {
      const user = (request as any).user;
      const body = request.body;

      if (!body?.filename || !body?.dataBase64) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'filename and dataBase64 payload are required.' },
        });
      }

      try {
        const fileBuffer = Buffer.from(body.dataBase64, 'base64');
        const document = await documentService.uploadDocument(fileBuffer, body, {
          userId: user?.userId || user?.id,
          role: user?.role,
          permissions: user?.permissions,
        });

        return reply.status(HTTP_STATUS.CREATED).send({
          success: true,
          data: document,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'DOCUMENT_UPLOAD_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * GET /api/v1/documents/:id
   * Get document metadata
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requirePermission('documents.view')] },
    async (request, reply) => {
      const { id } = request.params;
      const doc = await documentService.getDocument(id);

      if (!doc) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Document '${id}' not found.` },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: doc,
      });
    }
  );

  /**
   * GET /api/v1/documents/:id/download
   * Stream file download
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/download',
    { preHandler: [requirePermission('documents.view')] },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;

      try {
        const { document, stream } = await documentService.getDocumentStream(id, {
          userId: user?.userId || user?.id,
          role: user?.role,
          permissions: user?.permissions,
        });

        reply.header('Content-Type', document.mimeType);
        reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalFilename)}"`);
        reply.header('Content-Length', document.fileSizeBytes);

        return reply.send(stream);
      } catch (err: any) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'DOWNLOAD_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * GET /api/v1/documents/:id/preview
   * Stream file inline preview
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/preview',
    { preHandler: [requirePermission('documents.view')] },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;

      try {
        const { document, stream } = await documentService.getDocumentStream(id, {
          userId: user?.userId || user?.id,
          role: user?.role,
          permissions: user?.permissions,
        });

        reply.header('Content-Type', document.mimeType);
        reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalFilename)}"`);
        reply.header('Content-Length', document.fileSizeBytes);

        return reply.send(stream);
      } catch (err: any) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'PREVIEW_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * DELETE /api/v1/documents/:id
   * Soft delete document
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requirePermission('documents.delete')] },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;

      const success = await documentService.deleteDocument(id, {
        userId: user?.userId || user?.id,
      });

      if (!success) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Document '${id}' not found.` },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { id, deleted: true },
      });
    }
  );

  /**
   * POST /api/v1/documents/:id/restore
   * Restore soft-deleted document
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/restore',
    { preHandler: [requirePermission('documents.manage')] },
    async (request, reply) => {
      const { id } = request.params;
      const success = await documentService.restoreDocument(id);

      if (!success) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Document '${id}' not found.` },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { id, restored: true },
      });
    }
  );

  /**
   * POST /api/v1/documents/attach
   * Attach existing document to entity
   */
  fastify.post<{ Body: AttachDocumentRequest }>(
    '/attach',
    { preHandler: [requirePermission('documents.upload')] },
    async (request, reply) => {
      const user = (request as any).user;
      const body = request.body;

      if (!body?.documentId || !body?.entityType || !body?.entityId) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'documentId, entityType, and entityId are required.' },
        });
      }

      try {
        const attachment = await documentService.attachDocument(
          body.documentId,
          body.entityType,
          body.entityId,
          { userId: user?.userId || user?.id }
        );

        return reply.status(HTTP_STATUS.CREATED).send({
          success: true,
          data: attachment,
        });
      } catch (err: any) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'ATTACH_ERROR', message: err.message },
        });
      }
    }
  );

  /**
   * DELETE /api/v1/documents/attachments/:attachmentId
   * Detach document from entity
   */
  fastify.delete<{ Params: { attachmentId: string } }>(
    '/attachments/:attachmentId',
    { preHandler: [requirePermission('documents.delete')] },
    async (request, reply) => {
      const { attachmentId } = request.params;
      const success = await documentService.detachDocument(attachmentId);

      if (!success) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Attachment '${attachmentId}' not found.` },
        });
      }

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: { attachmentId, detached: true },
      });
    }
  );

  /**
   * GET /api/v1/documents/entity/:entityType/:entityId
   * List all documents attached to an entity
   */
  fastify.get<{ Params: { entityType: DocumentEntityType; entityId: string } }>(
    '/entity/:entityType/:entityId',
    { preHandler: [requirePermission('documents.view')] },
    async (request, reply) => {
      const { entityType, entityId } = request.params;
      const attachments = await documentService.listEntityDocuments(entityType, entityId);

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: attachments,
      });
    }
  );

  /**
   * GET /api/v1/documents/storage/stats
   * Retrieve storage statistics
   */
  fastify.get(
    '/storage/stats',
    { preHandler: [requirePermission('documents.view')] },
    async (_request, reply) => {
      const stats = await documentService.getStorageStats();
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: stats,
      });
    }
  );

  /**
   * POST /api/v1/documents/storage/reconcile
   * Audit storage and reconcile orphan / missing files
   */
  fastify.post(
    '/storage/reconcile',
    { preHandler: [requirePermission('documents.manage')] },
    async (_request, reply) => {
      const report = await documentService.reconcileStorage();
      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: report,
      });
    }
  );
};
