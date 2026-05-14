import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return NextResponse.json(body, { status });
}

export function notFound(resource = 'Resource') {
  return apiError('not_found', `${resource} not found`, 404);
}

export function badRequest(message: string, details?: unknown) {
  return apiError('bad_request', message, 400, details);
}

export function unauthorized() {
  return apiError('unauthorized', 'Authentication required', 401);
}

export function forbidden() {
  return apiError('forbidden', 'Access denied', 403);
}

export function internalError(message = 'Internal server error') {
  return apiError('internal_error', message, 500);
}

export function validationError(issues: Array<{ field: string; message: string }>) {
  return apiError('validation_error', 'Request validation failed', 422, issues);
}
