import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage } from "@/app/lib/definitions";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params; // Get the slug from the request params

  try {
    // Fetch the product by slug
    const { rows: productRows } = await sql<Product>`
      SELECT * FROM products WHERE slug = ${slug}
    `;
    console.log("Fetched Product:", productRows);

    if (productRows.length === 0) {
      // If no product is found, return a 404 response
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productRows[0]; // Get the first (and only) product

    // Fetch images for the product
    const { rows: imageRows } = await sql<ProductImage>`
      SELECT * FROM product_images WHERE product_id = ${product.id}
    `;
    console.log("Fetched Images:", imageRows);

    // Attach images to the product
    const productWithImages = {
      ...product,
      images: imageRows,
    };

    // Return the product with images as a JSON response
    return NextResponse.json(productWithImages, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}