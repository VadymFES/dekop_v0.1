/**
 * Sentry Edge Runtime Configuration
 * Initializes Sentry for Edge runtime environments (middleware, edge API routes)
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

  // Tags for filtering
  initialScope: {
    tags: {
      runtime: "edge",
    },
  },
});
