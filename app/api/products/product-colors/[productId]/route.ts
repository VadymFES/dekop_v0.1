import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getCacheHeaders } from "@/app/lib/cache-headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> } 
) {

  const productId = (await params).productId;

  try {
    const { rows } = await db.query`
      SELECT product_id, color, image_url FROM product_spec_colors WHERE product_id = ${Number(productId)}
    `;

    // Return empty array if no colors found (not all products have colors)
    return NextResponse.json(rows || [], { status: 200, headers: getCacheHeaders('static') });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product colors" },
      { status: 500 }
    );
  }
}