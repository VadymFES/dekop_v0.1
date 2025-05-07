import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage, ProductSpecs } from "@/app/lib/definitions";

// Extended interface to match what's returned from the database
interface ProductImageWithProductId extends ProductImage {
  product_id: number;
}

// Extended interface to match what's returned from the database
interface ProductSpecsWithProductId extends Omit<ProductSpecs, 'product_id'> {
  product_id: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;

  try {
    // 1️⃣ Fetch product by slug to get its category
    const { rows: productRows } = await sql<Product>`
      SELECT * FROM products WHERE slug = ${slug}
    `;
    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const product = productRows[0];

    // 2️⃣ Fetch similar products based on category
    const { rows: similarProductRows } = await sql<Product>`
      SELECT * FROM products 
      WHERE category = ${product.category} 
        AND slug != ${slug} 
      LIMIT 8
    `;

    // 3️⃣ Extract similar product IDs
    const similarProductIds = similarProductRows.map((product) => product.id);
    if (similarProductIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 4️⃣ Use JSONB array method for querying images and specs
    // Convert the similarProductIds array into a JSON string
    const idsJsonb = JSON.stringify(similarProductIds);

    // Query product_images using the JSONB array method
    const { rows: imageRows } = await sql<ProductImageWithProductId>`
      SELECT * FROM product_images 
      WHERE product_id = ANY(
        ARRAY(
          SELECT jsonb_array_elements_text(${idsJsonb}::jsonb)::int
        )
      )
    `;

    // Query product_specs using the JSONB array method
    const { rows: specsRows } = await sql<ProductSpecsWithProductId>`
      SELECT * FROM product_specs 
      WHERE product_id = ANY(
        ARRAY(
          SELECT jsonb_array_elements_text(${idsJsonb}::jsonb)::int
        )
      )
    `;

    // 5️⃣ Organize images and specs by product
    const imagesMap = imageRows.reduce<Record<number, ProductImageWithProductId[]>>((acc, image) => {
      if (!acc[image.product_id]) acc[image.product_id] = [];
      acc[image.product_id].push(image);
      return acc;
    }, {});

    const specsMap = specsRows.reduce<Record<number, ProductSpecsWithProductId>>((acc, spec) => {
      acc[spec.product_id] = spec;
      return acc;
    }, {});

    // 6️⃣ Attach images and specs to similar products
    const similarProducts = similarProductRows.map((product) => ({
      ...product,
      images: imagesMap[product.id] || [],
      specs: specsMap[product.id] || null,
    }));

    return NextResponse.json(similarProducts, { status: 200 });
  } catch (error) {
    console.error("Error fetching similar products:", error);
    return NextResponse.json({ error: "Failed to fetch similar products" }, { status: 500 });
  }
}