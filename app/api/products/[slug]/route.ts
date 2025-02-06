import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage } from "@/app/lib/definitions";

export async function GET(
  request: Request,
  context: Promise<{ params: { slug: string } }>
) {
  const { params } = await context;
  const { slug } = await params;

  try {
    const { rows: productRows } = await sql<Product>`
      SELECT * FROM products WHERE slug = ${slug}
    `;
    console.log("Fetched Product:", productRows);

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productRows[0];

    const { rows: imageRows } = await sql<ProductImage>`
      SELECT * FROM product_images WHERE product_id = ${product.id}
    `;
    console.log("Fetched Images:", imageRows);

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