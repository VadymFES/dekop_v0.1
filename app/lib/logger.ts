// app/lib/logger.ts

/**
 * Structured Logging Utility with Sentry Integration
 *
 * Provides structured logging with security event tracking, context enrichment,
 * and production-ready log formatting integrated with Sentry for monitoring.
 *
 * FEATURES:
 * - Structured JSON logging for easy parsing
 * - Sentry integration for error tracking and monitoring
 * - Security event tracking
 * - Context enrichment (timestamp, environment, etc.)
 * - Log levels (debug, info, warn, error, security)
 * - Sensitive data masking
 * - Production/development formatting
 * - Performance tracing with Sentry spans
 */

import * as Sentry from "@sentry/nextjs";

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security',
}

export interface LogContext {
  userId?: string;
  orderId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

export interface SecurityEvent {
  type: 'auth_failure' | 'webhook_invalid' | 'replay_attack' | 'unauthorized_access' | 'suspicious_activity' | 'rate_limit' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  metadata?: Record<string, any>;
}

/**
 * Masks sensitive data in logs
 */
function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'creditCard',
    'credit_card',
    'cvv',
    'ssn',
    'privateKey',
    'private_key',
  ];

  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const key in masked) {
    const lowerKey = key.toLowerCase();

    // Check if key contains sensitive information
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      // Recursively mask nested objects
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

/**
 * Base logger class
 */
class Logger {
  private context: LogContext = {};

  /**
   * Set global context for all logs
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Core logging method with Sentry integration
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    const timestamp = new Date().toISOString();
    const env = process.env.NODE_ENV || 'development';

    const maskedContext = maskSensitiveData({ ...this.context, ...context });

    const logEntry = {
      timestamp,
      level,
      message,
      environment: env,
      context: maskedContext,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
    };

    // In development, use pretty formatting
    if (env === 'development') {
      const emoji = {
        [LogLevel.DEBUG]: '🔍',
        [LogLevel.INFO]: 'ℹ️',
        [LogLevel.WARN]: '⚠️',
        [LogLevel.ERROR]: '❌',
        [LogLevel.SECURITY]: '🔒',
      };

      console.log(
        `${emoji[level]} [${level.toUpperCase()}] ${message}`,
        context ? maskedContext : ''
      );

      if (error) {
        console.error(error);
      }
    } else {
      // In production, use JSON for log aggregation
      console.log(JSON.stringify(logEntry));
    }

    // For security events, always log to console.error to ensure visibility
    if (level === LogLevel.SECURITY) {
      console.error(`🚨 SECURITY EVENT: ${message}`, maskedContext);
    }

    // ===== SENTRY INTEGRATION =====
    // Send logs to Sentry based on level
    try {
      // Set context in Sentry scope
      Sentry.withScope((scope) => {
        // Add context as tags and extra data
        if (maskedContext) {
          Object.entries(maskedContext).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
              scope.setTag(key, String(value));
            }
            scope.setExtra(key, value);
          });
        }

        // Set log level
        scope.setLevel(
          level === LogLevel.ERROR || level === LogLevel.SECURITY
            ? 'error'
            : level === LogLevel.WARN
            ? 'warning'
            : level === LogLevel.INFO
            ? 'info'
            : 'debug'
        );

        // For errors, capture the exception
        if (error) {
          Sentry.captureException(error, {
            level: level === LogLevel.SECURITY ? 'fatal' : 'error',
            tags: {
              logLevel: level,
            },
            contexts: {
              log: maskedContext,
            },
          });
        } else {
          // For non-error logs, use Sentry's logger
          const { logger: sentryLogger } = Sentry;

          switch (level) {
            case LogLevel.DEBUG:
              sentryLogger.debug(message);
              break;
            case LogLevel.INFO:
              sentryLogger.info(message);
              break;
            case LogLevel.WARN:
              sentryLogger.warn(message);
              break;
            case LogLevel.ERROR:
              sentryLogger.error(message);
              break;
            case LogLevel.SECURITY:
              // Critical security events
              sentryLogger.fatal(message);
              Sentry.captureMessage(message, {
                level: 'fatal',
                tags: {
                  security: true,
                  logLevel: level,
                },
              });
              break;
          }
        }
      });
    } catch (sentryError) {
      // Don't let Sentry errors break logging
      console.error('Failed to log to Sentry:', sentryError);
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Security event logging with Sentry integration
   *
   * IMPORTANT: Use this for all security-related events:
   * - Failed authentication attempts
   * - Unauthorized access attempts
   * - Suspicious activity
   * - Webhook validation failures
   * - Replay attacks
   * - Rate limiting violations
   */
  security(event: SecurityEvent, context?: LogContext) {
    const securityContext = {
      ...context,
      securityEventType: event.type,
      severity: event.severity,
      details: event.details,
      metadata: maskSensitiveData(event.metadata),
    };

    this.log(LogLevel.SECURITY, `Security Event: ${event.type}`, securityContext);

    // Send security event to Sentry with appropriate severity
    try {
      Sentry.captureMessage(`Security Event: ${event.type} - ${event.details}`, {
        level: event.severity === 'critical' || event.severity === 'high' ? 'fatal' : 'warning',
        tags: {
          security: true,
          securityEventType: event.type,
          severity: event.severity,
        },
        extra: {
          securityContext: maskSensitiveData(securityContext),
        },
      });
    } catch (sentryError) {
      console.error('Failed to send security event to Sentry:', sentryError);
    }

    // For critical events, also alert
    if (event.severity === 'critical') {
      console.error('🚨🚨🚨 CRITICAL SECURITY EVENT 🚨🚨🚨');
      console.error(JSON.stringify(securityContext, null, 2));
    }
  }

  /**
   * Log API request/response
   */
  apiLog(params: {
    method: string;
    path: string;
    status: number;
    duration: number;
    ip?: string;
    userAgent?: string;
  }) {
    const { method, path, status, duration, ip, userAgent } = params;

    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `${method} ${path} - ${status}`, {
      method,
      path,
      status,
      duration,
      ip,
      userAgent,
    });
  }

  /**
   * Log database query
   */
  dbLog(params: {
    query: string;
    duration: number;
    rowCount?: number;
    error?: Error;
  }) {
    const { query, duration, rowCount, error } = params;

    // Truncate long queries for readability
    const truncatedQuery = query.length > 200
      ? query.substring(0, 200) + '...'
      : query;

    if (error) {
      this.error('Database query failed', error, {
        query: truncatedQuery,
        duration,
      });
    } else {
      this.debug('Database query executed', {
        query: truncatedQuery,
        duration,
        rowCount,
      });
    }
  }

  /**
   * Log payment event with Sentry transaction tracking
   */
  paymentLog(params: {
    event: 'created' | 'success' | 'failed' | 'refunded';
    provider: 'liqpay' | 'monobank';
    orderId: string;
    amount?: number;
    transactionId?: string;
    error?: Error;
  }) {
    const { event, provider, orderId, amount, transactionId, error } = params;

    const level = error ? LogLevel.ERROR : LogLevel.INFO;

    const paymentContext = {
      paymentEvent: event,
      provider,
      orderId,
      amount,
      transactionId,
    };

    this.log(level, `Payment ${event}: ${provider}`, paymentContext, error);

    // Create audit trail in Sentry for all payment events
    try {
      Sentry.captureMessage(`Payment ${event}: ${provider} - Order ${orderId}`, {
        level: error ? 'error' : 'info',
        tags: {
          payment: true,
          paymentEvent: event,
          provider,
          orderId,
        },
        extra: {
          amount,
          transactionId,
          ...paymentContext,
        },
      });

      // Add breadcrumb for payment flow tracking
      Sentry.addBreadcrumb({
        category: 'payment',
        message: `Payment ${event}: ${provider}`,
        level: error ? 'error' : 'info',
        data: paymentContext,
      });
    } catch (sentryError) {
      console.error('Failed to log payment event to Sentry:', sentryError);
    }
  }

  /**
   * Create a Sentry span for performance tracking
   *
   * Usage:
   * ```typescript
   * const result = await logger.withSpan(
   *   { op: 'http.client', name: 'Fetch user data' },
   *   async () => {
   *     return await fetchUserData();
   *   }
   * );
   * ```
   */
  async withSpan<T>(
    spanOptions: { op: string; name: string; attributes?: Record<string, any> },
    callback: () => Promise<T>
  ): Promise<T> {
    return Sentry.startSpan(spanOptions, async (span) => {
      if (spanOptions.attributes) {
        Object.entries(spanOptions.attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }
      return await callback();
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenient functions
export const logSecurity = (event: SecurityEvent, context?: LogContext) =>
  logger.security(event, context);

export const logError = (message: string, error?: Error, context?: LogContext) =>
  logger.error(message, error, context);

export const logInfo = (message: string, context?: LogContext) =>
  logger.info(message, context);

export const logWarning = (message: string, context?: LogContext) =>
  logger.warn(message, context);

export const logDebug = (message: string, context?: LogContext) =>
  logger.debug(message, context);
