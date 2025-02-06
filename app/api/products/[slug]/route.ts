import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage } from "@/app/lib/definitions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }  // Directly type params here
) {
  const slug = (await params).slug;

  // Query to get the product by slug.
  const { rows: productRows } = await sql<Product>`
    SELECT * FROM products WHERE slug = ${slug}
  `;

  if (productRows.length === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const product = productRows[0];

  // Query to get product images.
  const { rows: imageRows } = await sql<ProductImage>`
    SELECT * FROM product_images WHERE product_id = ${product.id}
  `;

  return NextResponse.json(
    {
      ...product,
      images: imageRows,
    },
    { status: 200 }
  );
}
