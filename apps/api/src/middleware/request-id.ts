import { randomUUID } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { HTTP_HEADERS } from '@crm/shared';

/**
 * Fastify preHandler hook to attach / propagate correlation Request ID
 */
export async function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const incomingId = request.headers[HTTP_HEADERS.REQUEST_ID];
  const requestId = (typeof incomingId === 'string' && incomingId.trim().length > 0)
    ? incomingId.trim()
    : randomUUID();

  // Attach to request context
  request.id = requestId;

  // Echo back in response header
  reply.header(HTTP_HEADERS.REQUEST_ID, requestId);
}
