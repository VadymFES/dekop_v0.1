import { NextResponse } from "next/server";
import { logger } from './logger';

export function handleApiError(
  error: unknown,
  message: string,
  status: number = 500
) {
    // Log error with structured logging
    logger.error(
      message,
      error instanceof Error ? error : new Error(String(error)),
      { status }
    );

    const errorDetails = error instanceof Error
      ? error.message
      : "Unknown error";

    return NextResponse.json(
      { error: message, details: errorDetails },
      { status }
    );
}