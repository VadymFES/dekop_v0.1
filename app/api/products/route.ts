// api/products/route.ts

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage, ProductColor, ProductSpecs } from "@/app/lib/definitions";

export async function GET() {
  try {
    // 1. Fetch products.
    const { rows: productRows } = await sql<Product>`SELECT * FROM products`;

    // 2. Fetch product images.
    const { rows: imageRows } = await sql<ProductImage>`SELECT * FROM product_images`;

    // 3. Fetch product specifications.
    const { rows: specsRows } = await sql<ProductSpecs>`SELECT * FROM product_specs`;

    // 4. Fetch product colors.
    const { rows: colorRows } = await sql<ProductColor>`SELECT * FROM product_spec_colors`;

    // 5. Map images to their product IDs.
    const imagesMap = imageRows.reduce<Record<number, ProductImage[]>>((acc, image) => {
      const { product_id } = image;
      if (!acc[product_id]) {
        acc[product_id] = [];
      }
      acc[product_id].push(image);
      return acc;
    }, {});

    // 6. Map specs to their product IDs.
    const specsMap = specsRows.reduce<Record<number, ProductSpecs>>((acc, spec) => {
      acc[spec.product_id] = spec;
      return acc;
    }, {});

    // 7. Map colors to their product IDs.
    const colorsMap = colorRows.reduce<Record<number, ProductColor[]>>((acc, color) => {
      const key = color.product_id; // Use the product_spec_id from the color row.
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(color);
      return acc;
    }, {});

    // 8. Attach images, specs, and colors to their corresponding product.
    const productsWithImages = productRows.map((product) => ({
      ...product,
      images: imagesMap[product.id] || [],
      specs: specsMap[product.id] || null,
      colors: colorsMap[product.id] || []
    }));

    return NextResponse.json(productsWithImages, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
