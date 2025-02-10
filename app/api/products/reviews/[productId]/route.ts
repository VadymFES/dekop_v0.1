import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Review } from "@/app/lib/definitions";

export const dynamic = "force-dynamic";

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
    const { rows } = await sql<Review[]>`
      SELECT id, product_id, user_name, rating, comment, created_at
      FROM reviews
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(`Failed to fetch reviews: ${errorMessage}`, 500);
  }
}

// Add a new review for a product
export async function POST(
  request: Request,
  { params }: { params: { productId: string } }
) {
  const productId = validateProductId(params.productId);
  if (productId === null) {
    return errorResponse("Invalid productId. Must be a positive number.", 400);
  }

  try {
    const body = await request.json();
    const { user_name, rating, comment } = body;

    if (!user_name || typeof rating !== "number" || rating < 1 || rating > 5 || !comment) {
      return errorResponse("Invalid input: user_name, rating (1-5), and comment are required.", 400);
    }

    const result = await sql<Review[]>`
      INSERT INTO reviews (product_id, user_name, rating, comment, created_at)
      VALUES (${productId}, ${user_name}, ${rating}, ${comment}, now())
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error adding review:", error);
    return errorResponse("Failed to add review", 500);
  }
}

// Delete a review by its ID (optional for admin purposes)
export async function DELETE(
  request: Request
) {
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get("id");

  if (!reviewId || isNaN(Number(reviewId))) {
    return errorResponse("Valid review ID is required", 400);
  }

  try {
    await sql`
      DELETE FROM reviews
      WHERE id = ${Number(reviewId)}
    `;

    return NextResponse.json({ message: "Review deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting review:", error);
    return errorResponse("Failed to delete review", 500);
  }
}

