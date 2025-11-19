import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getCacheHeaders } from "@/app/lib/cache-headers";
import { Review } from "@/app/lib/definitions";

// Utility function to validate productId
function validateProductId(productId: string): number | null {
  const parsedId = Number(productId);
  return isNaN(parsedId) || parsedId <= 0 ? null : parsedId;
}

// Utility function to return an error response
function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Get all reviews for a specific product
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const productId = validateProductId((await params).productId);

  if (productId === null) {
    return errorResponse("Invalid productId. Must be a positive number.", 400);
  }

  try {
    const { rows } = await db.query`
      SELECT id, product_id, user_name, rating, comment, created_at
      FROM reviews
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { status: 200, headers: getCacheHeaders('static') });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(`Failed to fetch reviews: ${errorMessage}`, 500);
  }
}

