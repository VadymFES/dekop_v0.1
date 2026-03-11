import { notFound } from 'next/navigation';

// This page is the internal rewrite target for unknown single-level paths
// intercepted by the proxy (see proxy.ts DYNAMIC SEGMENT LEAK GUARD).
// Calling notFound() here renders app/not-found.tsx with 404 status while
// giving the client a real route to hydrate against (no mismatch).
export default function NotFoundProxy() {
  notFound();
}
