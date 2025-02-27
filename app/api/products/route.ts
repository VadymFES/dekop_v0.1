import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const maxPrice = searchParams.get("maxPrice");
  const types = searchParams.getAll("type"); // Array for multiple types
  const materials = searchParams.getAll("material");
  const features = searchParams.getAll("feature");
  const size = searchParams.get("size");

  try {
    let query = `
      SELECT 
        p.id, p.name, p.slug, p.description, p.category, p.price, p.stock, 
        p.rating, p.is_on_sale, p.is_new, p.is_bestseller, p.created_at, p.updated_at,
        ps.id AS specs_id, ps.construction, ps.length, ps.depth, ps.height, 
        ps.sleeping_area_width, ps.sleeping_area_length, ps.material_type, 
        ps.material_composition, ps.material_structure, ps.material_covers, 
        ps.backrest_filling, ps.cushion_filling, ps.additional_features,
        ps.has_shelves, ps.leg_height, ps.has_lift_mechanism, ps.types,
        json_agg(
          json_build_object(
            'id', pi.id, 
            'image_url', pi.image_url, 
            'alt', pi.alt, 
            'is_primary', pi.is_primary
          )
        ) FILTER (WHERE pi.id IS NOT NULL) AS images,
        json_agg(
          json_build_object(
            'product_id', pc.product_id, 
            'color', pc.color, 
            'image_url', pc.image_url
          )
        ) FILTER (WHERE pc.product_id IS NOT NULL) AS colors
      FROM products p
      LEFT JOIN product_specs ps ON p.id = ps.product_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_spec_colors pc ON p.id = pc.product_id
    `;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filter by category
    if (category) {
      conditions.push(`p.category = $${paramIndex++}`);
      values.push(category);
    }

    // Filter by max price
    if (maxPrice) {
      conditions.push(`p.price <= $${paramIndex++}`);
      values.push(parseFloat(maxPrice));
    }

    // Filter by types (folding, kitchen, office, modular)
    if (types.length > 0) {
      conditions.push(`ps.types && $${paramIndex++}`);
      values.push(types); // PostgreSQL array overlap operator (&&)
    }

    // Filter by materials
    if (materials.length > 0) {
      conditions.push(`ps.material_type ILIKE ANY ($${paramIndex++})`);
      values.push(materials.map(m => `%${m}%`));
    }

    // Filter by features
    if (features.length > 0) {
      const featureConditions: string[] = [];
      features.forEach((feature) => {
        if (feature === "shelves") featureConditions.push("ps.has_shelves = TRUE");
        if (feature === "high_legs") featureConditions.push("ps.leg_height = 'high'");
        if (feature === "low_legs") featureConditions.push("ps.leg_height = 'low'");
        if (feature === "lift") featureConditions.push("ps.has_lift_mechanism = TRUE");
        if (feature === "no_lift") featureConditions.push("ps.has_lift_mechanism = FALSE");
        // Fallback to additional_features for unmapped features
        featureConditions.push(`ps.additional_features ILIKE '%${feature}%'`);
      });
      conditions.push(`(${featureConditions.join(" OR ")})`);
    }

    // Filter by size
    if (size) {
      const widthCondition = size === "single" 
        ? `ps.sleeping_area_width <= 1000` 
        : `ps.sleeping_area_width >= 1400`;
      conditions.push(widthCondition);
    }

    // Combine conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Group by product and specs to aggregate images and colors
    query += ` 
      GROUP BY p.id, ps.id, p.name, p.slug, p.description, p.category, p.price, p.stock, 
        p.rating, p.is_on_sale, p.is_new, p.is_bestseller, p.created_at, p.updated_at,
        ps.construction, ps.length, ps.depth, ps.height, ps.sleeping_area_width, 
        ps.sleeping_area_length, ps.material_type, ps.material_composition, 
        ps.material_structure, ps.material_covers, ps.backrest_filling, 
        ps.cushion_filling, ps.additional_features, ps.has_shelves, ps.leg_height, 
        ps.has_lift_mechanism, ps.types
    `;

    const { rows } = await sql.query(query, values);

    const products = rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      price: row.price,
      stock: row.stock,
      rating: row.rating,
      is_on_sale: row.is_on_sale,
      is_new: row.is_new,
      is_bestseller: row.is_bestseller,
      created_at: row.created_at,
      updated_at: row.updated_at,
      images: row.images || [],
      specs: row.specs_id ? {
        id: row.specs_id,
        product_id: row.id,
        construction: row.construction,
        dimensions: {
          length: row.length,
          depth: row.depth,
          height: row.height,
          sleeping_area: {
            width: row.sleeping_area_width,
            length: row.sleeping_area_length,
          },
        },
        material: {
          type: row.material_type,
          composition: row.material_composition,
          backrest_filling: row.backrest_filling,
          covers: row.material_covers,
        },
        inner_material: {
          structure: row.material_structure,
          cushion_filling: row.cushion_filling,
        },
        additional_features: row.additional_features,
        has_shelves: row.has_shelves,
        leg_height: row.leg_height,
        has_lift_mechanism: row.has_lift_mechanism,
        types: row.types || [], // Include types array
      } : null,
      colors: row.colors || [],
    }));

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}