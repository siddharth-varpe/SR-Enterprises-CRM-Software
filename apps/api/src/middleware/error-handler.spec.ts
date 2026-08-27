import { describe, it, expect, vi } from 'vitest';
import { z, ZodError } from 'zod';
import { centralizedErrorHandler } from './error-handler.js';

describe('Centralized Error Handler', () => {
  it('should format Zod validation errors as 422 with requestId and field issues', () => {
    let statusCode = 200;
    let sentPayload: any = null;

    const mockReply: any = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockReply;
      }),
      send: vi.fn((payload: any) => {
        sentPayload = payload;
        return mockReply;
      }),
    };

    const mockRequest: any = {
      id: 'test-req-123',
      log: { error: vi.fn() },
    };

    // Trigger a real zod error
    const schema = z.object({ email: z.string().email() });
    try {
      schema.parse({ email: 'not-an-email' });
    } catch (err) {
      centralizedErrorHandler(err as any, mockRequest, mockReply);
    }

    expect(statusCode).toBe(422);
    expect(sentPayload).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId: 'test-req-123',
        details: {
          email: ['Invalid email'],
        },
      },
    });
  });

  it('should format internal errors as 500 without leaking stack traces', () => {
    let statusCode = 200;
    let sentPayload: any = null;

    const mockReply: any = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockReply;
      }),
      send: vi.fn((payload: any) => {
        sentPayload = payload;
        return mockReply;
      }),
    };

    const mockRequest: any = {
      id: 'test-req-999',
      log: { error: vi.fn() },
    };

    const genericError: any = new Error('Database connection failed password=secret');
    centralizedErrorHandler(genericError, mockRequest, mockReply);

    expect(statusCode).toBe(500);
    expect(sentPayload).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred',
        requestId: 'test-req-999',
      },
    });
  });
});
