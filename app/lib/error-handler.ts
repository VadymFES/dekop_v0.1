// app/lib/error-handler.ts

/**
 * Error Handling & Sanitization Utilities
 *
 * Provides safe error handling with automatic sanitization for production environments.
 *
 * SECURITY FEATURES:
 * - Sanitizes error messages in production
 * - Prevents information disclosure
 * - Logs full errors internally
 * - Returns safe error responses to clients
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * Error categories
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PAYMENT = 'PAYMENT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
}

/**
 * Application Error class with additional context
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Sanitizes error message for client response
 *
 * SECURITY: Never expose internal error details, stack traces, or
 * sensitive information to clients in production
 */
function sanitizeErrorMessage(error: Error, errorType: ErrorType): string {
  // In development, return actual error messages
  if (process.env.NODE_ENV === 'development') {
    return error.message;
  }

  // In production, return safe generic messages
  const safeMessages: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: 'Невірні дані запиту',
    [ErrorType.AUTHENTICATION]: 'Помилка автентифікації',
    [ErrorType.AUTHORIZATION]: 'Недостатньо прав доступу',
    [ErrorType.NOT_FOUND]: 'Ресурс не знайдено',
    [ErrorType.PAYMENT]: 'Помилка обробки платежу',
    [ErrorType.DATABASE]: 'Помилка бази даних',
    [ErrorType.EXTERNAL_API]: 'Помилка зовнішнього сервісу',
    [ErrorType.INTERNAL]: 'Внутрішня помилка сервера',
    [ErrorType.RATE_LIMIT]: 'Перевищено ліміт запитів',
  };

  return safeMessages[errorType] || 'Виникла помилка при обробці запиту';
}

/**
 * Gets HTTP status code for error type
 */
function getStatusCode(errorType: ErrorType): number {
  const statusCodes: Record<ErrorType, number> = {
    [ErrorType.VALIDATION]: 400,
    [ErrorType.AUTHENTICATION]: 401,
    [ErrorType.AUTHORIZATION]: 403,
    [ErrorType.NOT_FOUND]: 404,
    [ErrorType.PAYMENT]: 402,
    [ErrorType.DATABASE]: 500,
    [ErrorType.EXTERNAL_API]: 502,
    [ErrorType.INTERNAL]: 500,
    [ErrorType.RATE_LIMIT]: 429,
  };

  return statusCodes[errorType] || 500;
}

/**
 * Handles errors and returns sanitized response
 *
 * @param error - The error to handle
 * @param context - Additional context for logging
 * @returns NextResponse with sanitized error
 */
export function handleError(
  error: Error | AppError,
  context?: Record<string, any>
): NextResponse<ErrorResponse> {
  const isAppError = error instanceof AppError;
  const errorType = isAppError ? error.type : ErrorType.INTERNAL;
  const statusCode = isAppError ? error.statusCode : getStatusCode(errorType);

  // Log full error details internally
  logger.error(
    `Error occurred: ${error.message}`,
    error,
    {
      ...context,
      errorType,
      statusCode,
      stack: error.stack,
    }
  );

  // Create sanitized response
  const response: ErrorResponse = {
    error: errorType,
    message: sanitizeErrorMessage(error, errorType),
    timestamp: new Date().toISOString(),
  };

  // In development, include additional details
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      originalMessage: error.message,
      stack: error.stack,
      ...(isAppError && error.details ? { errorDetails: error.details } : {}),
    };
  }

  // Add error code if available
  if (isAppError) {
    response.code = error.type;
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Validates and sanitizes user input
 */
export function sanitizeInput<T>(input: T): T {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.trim().replace(/<[^>]*>/g, '').replace(/[<>]/g, '') as T;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item)) as T;
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }

  return input;
}

/**
 * Common error creators for convenience
 */
export const createValidationError = (message: string, details?: any) =>
  new AppError(ErrorType.VALIDATION, message, 400, details);

export const createAuthError = (message: string = 'Authentication required') =>
  new AppError(ErrorType.AUTHENTICATION, message, 401);

export const createAuthorizationError = (message: string = 'Insufficient permissions') =>
  new AppError(ErrorType.AUTHORIZATION, message, 403);

export const createNotFoundError = (resource: string) =>
  new AppError(ErrorType.NOT_FOUND, `${resource} not found`, 404);

export const createPaymentError = (message: string, details?: any) =>
  new AppError(ErrorType.PAYMENT, message, 402, details);

export const createRateLimitError = (message: string = 'Too many requests') =>
  new AppError(ErrorType.RATE_LIMIT, message, 429);

/**
 * Async error wrapper for route handlers
 *
 * Usage:
 * ```typescript
 * export const GET = withErrorHandler(async (request) => {
 *   // Your handler code
 *   throw createValidationError('Invalid input');
 * });
 * ```
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error) {
        return handleError(error, {
          handler: handler.name,
        });
      }
      return handleError(new Error('Unknown error occurred'));
    }
  }) as T;
}
