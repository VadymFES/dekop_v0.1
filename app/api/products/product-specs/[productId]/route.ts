import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ProductSpecs } from "@/app/lib/definitions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> } 
) {

  const productId = (await params).productId;

  try {
    const { rows } = await sql`
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
      WHERE product_id = ${Number(productId)}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Product specs not found" },
        { status: 404 }
      );
    }

    const row = rows[0];
    const specs: ProductSpecs = {
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
        structure: row["inner_material.structure"],
        cushion_filling: row["inner_material.cushion_filling"],
      },
      additional_features: row["additional_features"],
    };

    return NextResponse.json(specs, { status: 200 });
  } catch (error) {
    console.error("Error fetching product specs:", error);
    return NextResponse.json(
      { error: "Failed to fetch product specs" },
      { status: 500 }
    );
  }
}