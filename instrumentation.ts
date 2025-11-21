/**
 * Next.js Instrumentation File
 * Initializes Sentry for server-side monitoring
 * This file is automatically loaded by Next.js on server startup
 */

export async function register() {
  // Only register Sentry in server environments
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
