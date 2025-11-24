// instrumentation.ts
// Next.js Instrumentation API
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    console.log('Server instrumentation initialized');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    console.log('Edge instrumentation initialized');
  }
}
