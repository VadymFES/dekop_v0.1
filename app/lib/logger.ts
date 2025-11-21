// app/lib/logger.ts

/**
 * Structured Logging Utility
 *
 * Provides structured logging with security event tracking, context enrichment,
 * and production-ready log formatting.
 *
 * FEATURES:
 * - Structured JSON logging for easy parsing
 * - Security event tracking
 * - Context enrichment (timestamp, environment, etc.)
 * - Log levels (debug, info, warn, error, security)
 * - Sensitive data masking
 * - Production/development formatting
 */

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
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    const timestamp = new Date().toISOString();
    const env = process.env.NODE_ENV || 'development';

    const logEntry = {
      timestamp,
      level,
      message,
      environment: env,
      context: maskSensitiveData({ ...this.context, ...context }),
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
        context ? maskSensitiveData(context) : ''
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
      console.error(`🚨 SECURITY EVENT: ${message}`, maskSensitiveData(context));
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
   * Security event logging
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

    // For critical events, also alert (in production, this could send to monitoring service)
    if (event.severity === 'critical') {
      console.error('🚨🚨🚨 CRITICAL SECURITY EVENT 🚨🚨🚨');
      console.error(JSON.stringify(securityContext, null, 2));

      // TODO: In production, send alerts to:
      // - Sentry / DataDog / CloudWatch
      // - Email / Slack / PagerDuty
      // - Security incident response system
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
   * Log payment event
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

    this.log(level, `Payment ${event}: ${provider}`, {
      paymentEvent: event,
      provider,
      orderId,
      amount,
      transactionId,
    }, error);
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
