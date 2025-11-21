/**
 * Sentry Server-Side Configuration
 * Initializes Sentry for Node.js server environments
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment configuration
  environment: process.env.NODE_ENV || "development",

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logging to Sentry
  enableLogs: true,

  // Integrations
  integrations: [
    // Capture console.log, console.error, and console.warn as logs
    Sentry.consoleLoggingIntegration({
      levels: ["log", "error", "warn", "debug"]
    }),

    // HTTP instrumentation for API calls
    Sentry.httpIntegration(),

    // Note: nodeProfilingIntegration() requires @sentry/profiling-node package
    // Uncomment if you install it: npm install @sentry/profiling-node
    // Sentry.nodeProfilingIntegration(),
  ],

  // Note: Profiling requires additional package installation
  // Uncomment if you install @sentry/profiling-node
  // profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Data filtering - remove sensitive information
  beforeSend(event, hint) {
    // Don't send errors in development (log only)
    if (process.env.NODE_ENV === "development") {
      console.log("[Sentry Dev]", event.message || event.exception);
      return null;
    }

    // Remove sensitive data from event
    if (event.request) {
      delete event.request.cookies;

      // Sanitize headers
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers["x-api-key"];
      }

      // Sanitize query parameters
      if (event.request.query_string) {
        // Remove sensitive query params
        const sensitiveParams = ["token", "api_key", "password", "secret"];
        let queryString = event.request.query_string;

        sensitiveParams.forEach(param => {
          const regex = new RegExp(`${param}=[^&]*`, "gi");
          queryString = queryString.replace(regex, `${param}=[REDACTED]`);
        });

        event.request.query_string = queryString;
      }
    }

    // Sanitize extra data
    if (event.extra) {
      const sensitiveKeys = [
        "password",
        "token",
        "api_key",
        "secret",
        "private_key",
        "credit_card",
        "cvv",
        "ssn",
      ];

      Object.keys(event.extra).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          event.extra![key] = "[REDACTED]";
        }
      });
    }

    return event;
  },

  // Ignore certain errors
  ignoreErrors: [
    // Network errors
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
  ],

  // Tags for filtering
  initialScope: {
    tags: {
      runtime: "server",
    },
  },
});
