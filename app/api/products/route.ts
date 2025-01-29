import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage } from "@/app/lib/definitions";

export async function GET() {
  try {
    // Fetch products (each row is typed as Product, not Product[])
    const { rows: productRows } = await sql<Product>`SELECT * FROM products`;
    // console.log("Fetched Products:", productRows);

    // Fetch product images (each row is typed as ProductImage)
    const { rows: imageRows } = await sql<ProductImage>`SELECT * FROM product_images`;
    // console.log("Fetched Images:", imageRows);

    // Build a map of product_id -> array of ProductImage
    const imagesMap = imageRows.reduce<Record<number, ProductImage[]>>(
      (acc, image) => {
        const { product_id } = image;
        if (!acc[product_id]) {
          acc[product_id] = [];
        }
        acc[product_id].push(image);
        return acc;
      },
      {}
    );
    // console.log("Images Map:", imagesMap);

    // Attach images to their corresponding product
    const productsWithImages = productRows.map((product) => ({
      ...product,
      images: imagesMap[product.id] || [],
    }));
    // console.log("Products with Images:", productsWithImages);

    // Return JSON response using NextResponse
    return NextResponse.json(productsWithImages, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
