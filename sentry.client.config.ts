/**
 * Sentry Client-Side Configuration
 * Initializes Sentry for browser/client environments
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV || "development",

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay (optional - captures user interactions for debugging)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Enable logging to Sentry
  enableLogs: true,

  // Integrations
  integrations: [
    // Capture console.log, console.error, and console.warn as logs
    Sentry.consoleLoggingIntegration({
      levels: ["log", "error", "warn"]
    }),

    // Session replay for debugging
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),

    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration(),
  ],

  // Data filtering - remove sensitive information
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    // Remove sensitive data from event
    if (event.request) {
      delete event.request.cookies;

      // Sanitize headers
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }

    return event;
  },

  // Ignore certain errors
  ignoreErrors: [
    // Network errors
    "NetworkError",
    "Failed to fetch",
    "Network request failed",

    // Browser extension errors
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],

  // Tags for filtering
  initialScope: {
    tags: {
      runtime: "client",
    },
  },
});
