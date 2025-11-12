import { NextResponse } from "next/server";

export function handleApiError(
  error: unknown, 
  message: string,
  status: number = 500
) {
    console.error(message, error);
    
    const errorDetails = error instanceof Error 
      ? error.message 
      : "Unknown error";
    
    return NextResponse.json(
      { error: message, details: errorDetails },
      { status }
    );
}