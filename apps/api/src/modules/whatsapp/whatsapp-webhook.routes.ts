import type { FastifyPluginAsync } from 'fastify';
import { whatsappService } from './whatsapp.service';
import { env } from '../../config/env';

export const whatsappWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/webhooks/whatsapp
   * Meta Webhook Verification Endpoint (Challenge-Response Handshake)
   */
  fastify.get('/', async (request, reply) => {
    const query = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      fastify.log.info('Meta WhatsApp Webhook successfully verified');
      return reply.status(200).type('text/plain').send(challenge);
    }

    fastify.log.warn(
      { mode, tokenProvided: !!token },
      'Rejected WhatsApp webhook verification attempt with invalid verify token'
    );
    return reply.status(403).send('Forbidden: Invalid Verification Token');
  });

  /**
   * POST /api/v1/webhooks/whatsapp
   * Meta Webhook Event Ingestion (Message Status Callbacks & Incoming Messages)
   * Protected with HMAC SHA-256 signature verification & event deduplication idempotency
   */
  fastify.post('/', async (request, reply) => {
    try {
      const signature = request.headers['x-hub-signature-256'] as string | undefined;
      const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

      const results = await whatsappService.processWebhook(rawBody, signature, request.body);

      return reply.status(200).send({
        success: true,
        status: 'EVENT_RECEIVED',
        results,
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Error processing WhatsApp Webhook payload');

      if (err.message === 'Invalid webhook signature') {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Signature verification failed',
          },
        });
      }

      // Always return 200 to Meta to acknowledge event reception unless signature failed
      return reply.status(200).send({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Event logged with processing warning',
        },
      });
    }
  });
};
