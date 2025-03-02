import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { Product, ProductImage, ProductSpecs } from "@/app/lib/definitions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
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

  // Query to get the product specs.
  const { rows: specsRows } = await sql`
    SELECT
      id,
      product_id,
      construction,
      length AS "dimensions.length",
      depth AS "dimensions.depth",
      height AS "dimensions.height",
      sleeping_area_width AS "dimensions.sleeping_area.width",
      sleeping_area_length AS "dimensions.sleeping_area.length",
      material_type AS "material.type",
      material_composition AS "material.composition",
      material_structure AS "material.structure",
      backrest_filling AS "material.backrest_filling",
      material_covers AS "material.covers",
      cushion_filling AS "inner_material.cushion_filling",
      additional_features AS "additional_features"
    FROM product_specs
    WHERE product_id = ${product.id}
  `;

  let specs: ProductSpecs | null = null;
  if (specsRows.length > 0) {
    const row = specsRows[0];
    specs = {
      id: row.id,
      product_id: row.product_id,
      construction: row.construction,
      dimensions: {
        length: row["dimensions.length"],
        depth: row["dimensions.depth"],
        height: row["dimensions.height"],
        sleeping_area: {
          width: row["dimensions.sleeping_area.width"],
          length: row["dimensions.sleeping_area.length"],
        },
      },
      material: {
        type: row["material.type"],
        composition: row["material.composition"],
        backrest_filling: row["material.backrest_filling"],
        covers: row["material.covers"],
      },
      inner_material: {
        structure: row["material.structure"],
        cushion_filling: row["inner_material.cushion_filling"],
      },
      additional_features: row["additional_features"],
    };
  }

  return NextResponse.json(
    {
      ...product,
      images: imageRows,
      specs,
    },
    { status: 200 }
  );
}
