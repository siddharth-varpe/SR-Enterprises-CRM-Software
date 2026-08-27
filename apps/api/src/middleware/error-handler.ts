import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@crm/shared';
import type { ApiErrorResponse } from '@crm/types';

/**
 * Centralized Fastify Error Handler
 * Formats all exceptions into standard shape:
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     requestId: string,
 *     details?: unknown
 *   }
 * }
 */
export function centralizedErrorHandler(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (request.id as string) || 'unknown';

  // 1. Handle Zod Validation Errors
  if (error instanceof ZodError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Request validation failed',
        requestId,
        details: error.flatten().fieldErrors,
      },
    };
    return reply.status(422).send(response);
  }

  const err = error as Partial<FastifyError> & { validation?: unknown };

  // 2. Handle Fastify Schema Validation Errors
  if (err.validation) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: err.message || 'Request validation error',
        requestId,
        details: err.validation,
      },
    };
    return reply.status(400).send(response);
  }

  // 3. Handle Rate Limiting Errors
  if (err.statusCode === 429) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
        requestId,
      },
    };
    return reply.status(429).send(response);
  }

  // 4. Handle Known HTTP Status Codes (4xx)
  const statusCode = err.statusCode || 500;
  if (statusCode >= 400 && statusCode < 500) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code || ERROR_CODES.BAD_REQUEST,
        message: err.message || 'Client error',
        requestId,
      },
    };
    return reply.status(statusCode).send(response);
  }

  // 5. Catch-All Internal Server Errors (500) — Never leak internal stack trace or raw SQL errors
  request.log.error({ err: error, requestId }, 'Internal Server Error caught by centralized error handler');

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'An unexpected internal server error occurred',
      requestId,
    },
  };

  return reply.status(500).send(response);
}
