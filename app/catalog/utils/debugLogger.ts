// /app/catalog/utils/debugLogger.ts

/**
 * Centralized logging utility for catalog debugging
 * Provides consistent logging format and conditional logging based on environment
 */

export interface LogContext {
  component?: string;
  action?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export class DebugLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Log DOM access warnings
   */
  static domWarning(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`🔧 DOM Warning [${context?.component || 'Unknown'}]: ${message}`, context);
    }
  }

  /**
   * Log DOM access errors
   */
  static domError(message: string, context?: LogContext): void {
    console.error(`❌ DOM Error [${context?.component || 'Unknown'}]: ${message}`, context);
  }

  /**
   * Log hook-related warnings
   */
  static hookWarning(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`⚠️ Hook Warning [${context?.component || 'Unknown'}]: ${message}`, context);
    }
  }

  /**
   * Log hook-related errors
   */
  static hookError(message: string, context?: LogContext): void {
    console.error(`💥 Hook Error [${context?.component || 'Unknown'}]: ${message}`, context);
  }

  /**
   * Log cleanup operations
   */
  static cleanup(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`🧹 Cleanup [${context?.component || 'Unknown'}]: ${message}`, context);
    }
  }

  /**
   * Log performance warnings
   */
  static performance(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`⚡ Performance [${context?.component || 'Unknown'}]: ${message}`, context);
    }
  }

  /**
   * Log general debug information
   */
  static debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`🐛 Debug [${context?.component || 'Unknown'}]: ${message}`, context);
    }
  }

  /**
   * Log error boundary catches
   */
  static errorBoundary(message: string, error: Error, errorInfo?: Record<string, unknown>, context?: LogContext): void {
    console.error(`🛡️ Error Boundary [${context?.component || 'Unknown'}]: ${message}`, {
      error: error.message,
      stack: error.stack,
      errorInfo,
      context
    });
  }
}

/**
 * Utility function to safely access DOM elements with logging
 */
export const safeDOMAccess = <T>(
  operation: () => T,
  componentName: string,
  operationName: string,
  fallback?: T
): T | undefined => {
  try {
    const result = operation();
    if (result === null || result === undefined) {
      DebugLogger.domWarning(`${operationName} returned null/undefined`, {
        component: componentName,
        action: operationName
      });
      return fallback;
    }
    return result;
  } catch (error) {
    DebugLogger.domError(`${operationName} failed`, {
      component: componentName,
      action: operationName,
      error: error as Error
    });
    return fallback;
  }
};

/**
 * Utility function to safely add event listeners with cleanup tracking
 */
export const safeEventListener = (
  element: Element | Window | Document,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
  componentName?: string
): (() => void) => {
  try {
    element.addEventListener(event, handler, options);
    DebugLogger.debug(`Added event listener: ${event}`, {
      component: componentName,
      action: 'addEventListener'
    });
    
    // Return cleanup function
    return () => {
      try {
        element.removeEventListener(event, handler, options);
        DebugLogger.cleanup(`Removed event listener: ${event}`, {
          component: componentName,
          action: 'removeEventListener'
        });
      } catch (error) {
        DebugLogger.domError(`Failed to remove event listener: ${event}`, {
          component: componentName,
          action: 'removeEventListener',
          error: error as Error
        });
      }
    };
  } catch (error) {
    DebugLogger.domError(`Failed to add event listener: ${event}`, {
      component: componentName,
      action: 'addEventListener',
      error: error as Error
    });
    // Return no-op cleanup function
    return () => {};
  }
};