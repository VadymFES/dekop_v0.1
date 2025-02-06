import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage } from "@/app/lib/definitions";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const { rows: productRows } = await sql<Product>`
      SELECT * FROM products WHERE slug = ${slug}
    `;

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productRows[0];

    const { rows: imageRows } = await sql<ProductImage>`
      SELECT * FROM product_images WHERE product_id = ${product.id}
    `;

    const productWithImages = {
      ...product,
      images: imageRows,
    };

    return NextResponse.json(productWithImages, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}