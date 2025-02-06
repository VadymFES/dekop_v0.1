import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ProductColor } from "@/app/lib/definitions";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: Promise<{ params: { productId: string } }>
) {
  const { params } = await context;
  const { productId } = await params;

  try {
    const { rows } = await sql<ProductColor>`
      SELECT product_id, color, image_url FROM product_spec_colors WHERE product_id = ${Number(productId)}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Product colors not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product colors" },
      { status: 500 }
    );
  }
}