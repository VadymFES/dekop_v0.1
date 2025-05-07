"use client"

import { NextResponse } from "next/server";

export function handleApiError(error: unknown, message: string) {
    console.error(message, error);
    return NextResponse.json(
      { error: message, details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }