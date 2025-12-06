import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getCacheHeaders } from "@/app/lib/cache-headers";

// Helper function to normalize category names
function normalizeCategory(category: string): string {
  // Convert category names to their normalized form
  const categoryMap: Record<string, string> = {
    'corner sofa': 'corner_sofas',
    'sofa': 'sofas',
    'sofa bed': 'sofa_beds',
    'bed': 'beds',
    'table': 'tables',
    'chair': 'chairs',
    'mattress': 'mattresses',
    'wardrobe': 'wardrobes',
    'accessory': 'accessories'
  };
  
  const lowerCategory = category.toLowerCase();
  return categoryMap[lowerCategory] || lowerCategory;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const maxPrice = searchParams.get("maxPrice");
  const types = searchParams.getAll("type");
  const materials = searchParams.getAll("material");
  const features = searchParams.getAll("feature");
  const size = searchParams.get("size");
  const statuses = searchParams.getAll("status");
  const search = searchParams.get("search");

  try {
    // Check if color column exists in product_images table
    let hasColorColumn = false;
    try {
      const colCheck = await sql.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'product_images' AND column_name = 'color'
      `);
      hasColorColumn = colCheck.rows.length > 0;
    } catch {
      hasColorColumn = false;
    }

    // Build image JSON dynamically based on column existence
    const imageJsonFields = hasColorColumn
      ? `'id', pi.id, 'image_url', pi.image_url, 'alt', pi.alt, 'is_primary', pi.is_primary, 'color', pi.color`
      : `'id', pi.id, 'image_url', pi.image_url, 'alt', pi.alt, 'is_primary', pi.is_primary, 'color', NULL`;

    let query = `
      SELECT
        p.id, p.name, p.slug, p.description, p.category, p.price, p.sale_price, p.stock,
        p.rating, COUNT(r.id) AS reviews,
        p.is_on_sale, p.is_new, p.is_bestseller, p.created_at, p.updated_at,
        ps.specs_id, ps.construction, ps.dimensions_length, ps.dimensions_width, 
        ps.dimensions_depth, ps.dimensions_height, 
        ps.dimensions_sleeping_area_width, 
        ps.dimensions_sleeping_area_length, 
        ps.material_type, ps.material_composition, ps.inner_material_structure, 
        ps.material_covers, ps.material_backrest_filling, 
        ps.inner_material_cushion_filling, ps.additional_features,
        ps.has_shelves, ps.leg_height, ps.has_lift_mechanism, ps.types,
        json_agg(
          json_build_object(
            ${imageJsonFields}
          )
        ) FILTER (WHERE pi.id IS NOT NULL) AS images,
        json_agg(
          json_build_object(
            'product_id', pc.product_id, 
            'color', pc.color, 
            'image_url', pc.image_url
          )
        ) FILTER (WHERE pc.product_id IS NOT NULL) AS colors,
        -- Category-specific columns for mapping
        ps.core_type, ps.hardness, ps.door_count, ps.door_type, ps.internal_layout,
        ps.headboard_type, ps.storage_options, ps.upholstery, ps.seat_height, ps.weight_capacity, 
        ps.mounting_type, ps.shelf_count, ps.shape, ps.extendable, ps.armrest_type
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      LEFT JOIN (
        SELECT 
          id AS specs_id, product_id, construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length, material_type, material_composition,
          inner_material_structure, material_covers, material_backrest_filling, inner_material_cushion_filling,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types, armrest_type, seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, 
          NULL::VARCHAR AS door_type, NULL::VARCHAR AS internal_layout, NULL::VARCHAR AS headboard_type, 
          NULL::VARCHAR AS storage_options, NULL::VARCHAR AS upholstery, NULL::NUMERIC AS weight_capacity, 
          NULL::VARCHAR AS mounting_type, NULL::INTEGER AS shelf_count,
          NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM corner_sofa_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, construction, dimensions_length, NULL::NUMERIC AS dimensions_width, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length, material_type, material_composition,
          inner_material_structure, material_covers, material_backrest_filling, inner_material_cushion_filling,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types, armrest_type, seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, 
          NULL::VARCHAR AS door_type, NULL::VARCHAR AS internal_layout, NULL::VARCHAR AS headboard_type, 
          NULL::VARCHAR AS storage_options, NULL::VARCHAR AS upholstery, NULL::NUMERIC AS weight_capacity, 
          NULL::VARCHAR AS mounting_type, NULL::INTEGER AS shelf_count,
          NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM sofa_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, construction, dimensions_length, NULL::NUMERIC AS dimensions_width, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length, material_type, material_composition,
          inner_material_structure, material_covers, material_backrest_filling, inner_material_cushion_filling,
          additional_features, has_shelves, leg_height, has_lift_mechanism, types, armrest_type, seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, 
          NULL::VARCHAR AS door_type, NULL::VARCHAR AS internal_layout, NULL::VARCHAR AS headboard_type, 
          NULL::VARCHAR AS storage_options, NULL::VARCHAR AS upholstery, NULL::NUMERIC AS weight_capacity, 
          NULL::VARCHAR AS mounting_type, NULL::INTEGER AS shelf_count,
          NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM sofa_bed_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, NULL::VARCHAR AS construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          NULL::NUMERIC AS dimensions_sleeping_area_width, NULL::NUMERIC AS dimensions_sleeping_area_length, material AS material_type,
          NULL::VARCHAR AS material_composition, NULL::VARCHAR AS inner_material_structure, NULL::VARCHAR AS material_covers, 
          NULL::VARCHAR AS material_backrest_filling, NULL::VARCHAR AS inner_material_cushion_filling, NULL::VARCHAR AS additional_features, 
          NULL::BOOLEAN AS has_shelves, NULL::VARCHAR AS leg_height, NULL::BOOLEAN AS has_lift_mechanism, types, 
          NULL::VARCHAR AS armrest_type, seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, NULL::VARCHAR AS door_type, 
          NULL::VARCHAR AS internal_layout, NULL::VARCHAR AS headboard_type, NULL::VARCHAR AS storage_options, 
          upholstery, weight_capacity, NULL::VARCHAR AS mounting_type, NULL::INTEGER AS shelf_count, 
          NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM chair_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, NULL::VARCHAR AS construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length, material AS material_type, NULL::VARCHAR AS material_composition,
          NULL::VARCHAR AS inner_material_structure, NULL::VARCHAR AS material_covers, NULL::VARCHAR AS material_backrest_filling, 
          NULL::VARCHAR AS inner_material_cushion_filling, NULL::VARCHAR AS additional_features, NULL::BOOLEAN AS has_shelves, 
          NULL::VARCHAR AS leg_height, NULL::BOOLEAN AS has_lift_mechanism, types, 
          NULL::VARCHAR AS armrest_type, NULL::NUMERIC AS seat_height,
          core_type, hardness, NULL::INTEGER AS door_count, NULL::VARCHAR AS door_type, NULL::VARCHAR AS internal_layout, 
          NULL::VARCHAR AS headboard_type, NULL::VARCHAR AS storage_options, NULL::VARCHAR AS upholstery, 
          NULL::NUMERIC AS weight_capacity, NULL::VARCHAR AS mounting_type, NULL::INTEGER AS shelf_count, 
          NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM mattress_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, NULL::VARCHAR AS construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          NULL::NUMERIC AS dimensions_sleeping_area_width, NULL::NUMERIC AS dimensions_sleeping_area_length, material AS material_type,
          NULL::VARCHAR AS material_composition, NULL::VARCHAR AS inner_material_structure, NULL::VARCHAR AS material_covers, 
          NULL::VARCHAR AS material_backrest_filling, NULL::VARCHAR AS inner_material_cushion_filling, NULL::VARCHAR AS additional_features, 
          NULL::BOOLEAN AS has_shelves, NULL::VARCHAR AS leg_height, NULL::BOOLEAN AS has_lift_mechanism, types, 
          NULL::VARCHAR AS armrest_type, NULL::NUMERIC AS seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, NULL::VARCHAR AS door_type, 
          NULL::VARCHAR AS internal_layout, NULL::VARCHAR AS headboard_type, NULL::VARCHAR AS storage_options, 
          NULL::VARCHAR AS upholstery, NULL::NUMERIC AS weight_capacity, 
          NULL::VARCHAR AS mounting_type, NULL::INTEGER AS shelf_count, shape, extendable
        FROM table_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, construction, dimensions_length, NULL::NUMERIC AS dimensions_width, dimensions_depth, dimensions_height,
          dimensions_sleeping_area_width, dimensions_sleeping_area_length, material AS material_type, NULL::VARCHAR AS material_composition,
          NULL::VARCHAR AS inner_material_structure, NULL::VARCHAR AS material_covers, NULL::VARCHAR AS material_backrest_filling, 
          NULL::VARCHAR AS inner_material_cushion_filling, NULL::VARCHAR AS additional_features, NULL::BOOLEAN AS has_shelves, 
          NULL::VARCHAR AS leg_height, NULL::BOOLEAN AS has_lift_mechanism, types, 
          NULL::VARCHAR AS armrest_type, NULL::NUMERIC AS seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, NULL::VARCHAR AS door_type, 
          NULL::VARCHAR AS internal_layout, headboard_type, storage_options, NULL::VARCHAR AS upholstery, 
          NULL::NUMERIC AS weight_capacity, NULL::VARCHAR AS mounting_type, 
          NULL::INTEGER AS shelf_count, NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM bed_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, NULL::VARCHAR AS construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          NULL::NUMERIC AS dimensions_sleeping_area_width, NULL::NUMERIC AS dimensions_sleeping_area_length, material AS material_type,
          NULL::VARCHAR AS material_composition, NULL::VARCHAR AS inner_material_structure, NULL::VARCHAR AS material_covers, 
          NULL::VARCHAR AS material_backrest_filling, NULL::VARCHAR AS inner_material_cushion_filling, NULL::VARCHAR AS additional_features, 
          NULL::BOOLEAN AS has_shelves, NULL::VARCHAR AS leg_height, NULL::BOOLEAN AS has_lift_mechanism, types, 
          NULL::VARCHAR AS armrest_type, NULL::NUMERIC AS seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, door_count, door_type, internal_layout, 
          NULL::VARCHAR AS headboard_type, NULL::VARCHAR AS storage_options, NULL::VARCHAR AS upholstery, 
          NULL::NUMERIC AS weight_capacity, NULL::VARCHAR AS mounting_type, 
          NULL::INTEGER AS shelf_count, NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM wardrobe_specs
        UNION ALL
        SELECT 
          id AS specs_id, product_id, NULL::VARCHAR AS construction, dimensions_length, dimensions_width, dimensions_depth, dimensions_height,
          NULL::NUMERIC AS dimensions_sleeping_area_width, NULL::NUMERIC AS dimensions_sleeping_area_length, material AS material_type,
          NULL::VARCHAR AS material_composition, NULL::VARCHAR AS inner_material_structure, NULL::VARCHAR AS material_covers, 
          NULL::VARCHAR AS material_backrest_filling, NULL::VARCHAR AS inner_material_cushion_filling, NULL::VARCHAR AS additional_features, 
          NULL::BOOLEAN AS has_shelves, NULL::VARCHAR AS leg_height, NULL::BOOLEAN AS has_lift_mechanism, types, 
          NULL::VARCHAR AS armrest_type, NULL::NUMERIC AS seat_height,
          NULL::VARCHAR AS core_type, NULL::VARCHAR AS hardness, NULL::INTEGER AS door_count, NULL::VARCHAR AS door_type, 
          NULL::VARCHAR AS internal_layout, NULL::VARCHAR AS headboard_type, NULL::VARCHAR AS storage_options, 
          NULL::VARCHAR AS upholstery, NULL::NUMERIC AS weight_capacity, 
          mounting_type, shelf_count, NULL::VARCHAR AS shape, NULL::BOOLEAN AS extendable
        FROM accessory_specs
      ) ps ON p.id = ps.product_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_spec_colors pc ON p.id = pc.product_id
    `;

    const conditions: string[] = [];
    const values: (string | number | string[] | number[])[] = [];
    let paramIndex = 1;

    // Filter by category
    if (category) {
      conditions.push(`p.category = $${paramIndex++}`);
      values.push(category);
    }

    // Filter by max price
    if (maxPrice) {
      conditions.push(`p.price <= $${paramIndex++}`);
      values.push(parseFloat(maxPrice).toString());
    }

    // Filter by types (folding, kitchen, office, modular)
    if (types.length > 0) {
      conditions.push(`ps.types && $${paramIndex++}`);
      values.push(types);
    }

    // Filter by materials
    if (materials.length > 0) {
      conditions.push(`ps.material_type ILIKE ANY ($${paramIndex++})`);
      values.push(materials.map(m => `%${m}%`));
    }

    // Filter by features - Безпечний параметризований запит
    if (features.length > 0) {
      const featureConditions: string[] = [];
      
      // Точні співпадіння для спеціальних фільтрів
      for (const feature of features) {
        if (feature === "shelves") {
          featureConditions.push("ps.has_shelves = TRUE");
        } else if (feature === "high_legs") {
          featureConditions.push("ps.leg_height = 'high'");
        } else if (feature === "low_legs") {
          featureConditions.push("ps.leg_height = 'low'");
        } else if (feature === "lift") {
          featureConditions.push("ps.has_lift_mechanism = TRUE");
        } else if (feature === "no_lift") {
          featureConditions.push("ps.has_lift_mechanism = FALSE");
        } else {
          // Для інших використовуємо параметризований пошук
          featureConditions.push(`ps.additional_features ILIKE $${paramIndex++}`);
          values.push(`%${feature}%`);
        }
      }
      
      if (featureConditions.length > 0) {
        conditions.push(`(${featureConditions.join(" OR ")})`);
      }
    }

    // Filter by size
    if (size) {
      const sizeParam = paramIndex++;
      const widthCondition = size === "single"
        ? `ps.dimensions_sleeping_area_width <= $${sizeParam}`
        : `ps.dimensions_sleeping_area_width >= $${sizeParam}`;

      conditions.push(widthCondition);
      values.push(size === "single" ? 1000 : 1400);
    }

    // Filter by status (new, on_sale, bestseller)
    if (statuses.length > 0) {
      const statusConditions: string[] = [];

      for (const status of statuses) {
        if (status === "new") {
          statusConditions.push("p.is_new = TRUE");
        } else if (status === "on_sale") {
          statusConditions.push("p.is_on_sale = TRUE");
        } else if (status === "bestseller") {
          statusConditions.push("p.is_bestseller = TRUE");
        }
      }

      if (statusConditions.length > 0) {
        conditions.push(`(${statusConditions.join(" OR ")})`);
      }
    }

    // Filter by search query
    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex + 1} OR p.category ILIKE $${paramIndex + 2})`);
      values.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 3;
    }

    // Combine conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Group by product and specs to aggregate images and colors
    query += `
      GROUP BY p.id, ps.specs_id, p.name, p.slug, p.description, p.category, p.price, p.sale_price, p.stock,
        p.is_on_sale, p.is_new, p.is_bestseller, p.created_at, p.updated_at,
        ps.construction, ps.dimensions_length, ps.dimensions_width, ps.dimensions_depth, ps.dimensions_height, 
        ps.dimensions_sleeping_area_width, ps.dimensions_sleeping_area_length, ps.material_type, ps.material_composition, 
        ps.inner_material_structure, ps.material_covers, ps.material_backrest_filling, 
        ps.inner_material_cushion_filling, ps.additional_features, ps.has_shelves, ps.leg_height, 
        ps.has_lift_mechanism, ps.types, ps.core_type, ps.hardness, ps.door_count, 
        ps.door_type, ps.internal_layout, ps.headboard_type, ps.storage_options, 
        ps.upholstery, ps.seat_height, ps.weight_capacity, ps.mounting_type, 
        ps.shelf_count, ps.shape, ps.extendable, ps.armrest_type
    `;

    // Додаємо сортування за рейтингом (опціонально)
    // query += ` ORDER BY rating DESC`;

    const { rows } = await sql.query(query, values);

    const products = rows.map(row => {
      const normalizedCategory = normalizeCategory(row.category);
      // console.log(`Normalizing category: ${row.category} -> ${normalizedCategory}`);

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        category: row.category,
        price: row.price,
        sale_price: row.sale_price || null,
        stock: row.stock,
        // Використовуємо розрахований рейтинг і кількість відгуків
        rating: parseFloat(row.rating) || 0,
        reviews: parseInt(row.reviews) || 0,
        is_on_sale: row.is_on_sale,
        is_new: row.is_new,
        is_bestseller: row.is_bestseller,
        created_at: row.created_at,
        updated_at: row.updated_at,
        images: row.images || [],
        specs: row.specs_id ? mapSpecsByCategory(normalizedCategory, row) : null,
        colors: row.colors || [],
      };
    });

    // Return with optimized caching headers
    return NextResponse.json(products, {
      status: 200,
      headers: getCacheHeaders('catalog'),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// Helper function to map specs by category
function mapSpecsByCategory(normalizedCategory: string, row: Record<string, unknown>) {
  const baseSpecs = {
    id: row.specs_id as number,
    product_id: row.id as number,
    category: normalizedCategory,
  };

  switch (normalizedCategory) {
    case 'corner_sofas':
    case 'sofas':
    case 'sofa_beds':
      return {
        ...baseSpecs,
        construction: (row.construction as string) || '',
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || (normalizedCategory === 'corner_sofas' ? 0 : undefined),
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0,
          ...(row.dimensions_sleeping_area_width && row.dimensions_sleeping_area_length ? {
            sleeping_area: {
              width: row.dimensions_sleeping_area_width as number,
              length: row.dimensions_sleeping_area_length as number
            }
          } : {})
        },
        material: {
          type: (row.material_type as string) || '',
          composition: (row.material_composition as string) || null,
          backrest_filling: (row.material_backrest_filling as string) || undefined,
          covers: (row.material_covers as string) || null
        },
        inner_material: row.inner_material_structure || row.inner_material_cushion_filling ? {
          structure: (row.inner_material_structure as string) || '',
          cushion_filling: (row.inner_material_cushion_filling as string) || ''
        } : undefined,
        additional_features: (row.additional_features as string) || undefined,
        has_shelves: row.has_shelves as boolean | undefined,
        leg_height: (row.leg_height as string) || undefined,
        has_lift_mechanism: row.has_lift_mechanism as boolean | undefined,
        types: (row.types as string[]) || [],
        armrest_type: (row.armrest_type as string) || undefined,
        seat_height: row.seat_height ? Number(row.seat_height) : undefined
      };

    case 'beds':
      return {
        ...baseSpecs,
        construction: (row.construction as string) || undefined,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0,
          ...(row.dimensions_sleeping_area_width && row.dimensions_sleeping_area_length ? {
            sleeping_area: {
              width: row.dimensions_sleeping_area_width as number,
              length: row.dimensions_sleeping_area_length as number
            }
          } : {})
        },
        headboard_type: (row.headboard_type as string) || null,
        storage_options: (row.storage_options as string) || null,
        material: (row.material_type as string) || ''
      };

    case 'tables':
      return {
        ...baseSpecs,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || 0,
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0
        },
        shape: (row.shape as string) || undefined,
        extendable: row.extendable as boolean | undefined,
        material: (row.material_type as string) || ''
      };

    case 'chairs':
      return {
        ...baseSpecs,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || 0,
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0
        },
        upholstery: (row.upholstery as string) || undefined,
        seat_height: row.seat_height ? Number(row.seat_height) : undefined,
        weight_capacity: row.weight_capacity ? Number(row.weight_capacity) : undefined,
        material: (row.material_type as string) || ''
      };

    case 'mattresses':
      return {
        ...baseSpecs,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || (row.dimensions_depth as number) || 0
        },
        type: (row.core_type as string) || (row.material_type as string) || '',
        firmness: (row.hardness as string) || '',
        thickness: (row.dimensions_height as number) || 0
      };

    case 'wardrobes':
      return {
        ...baseSpecs,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || 0,
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0
        },
        door_count: (row.door_count as number) || 0,
        door_type: (row.door_type as string) || '',
        internal_layout: (row.internal_layout as string) || undefined,
        material: (row.material_type as string) || ''
      };

    case 'accessories':
      return {
        ...baseSpecs,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || 0,
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0
        },
        mounting_type: (row.mounting_type as string) || null,
        shelf_count: row.shelf_count ? Number(row.shelf_count) : null,
        material: (row.material_type as string) || ''
      };

    default:
      return {
        ...baseSpecs,
        dimensions: {
          length: (row.dimensions_length as number) || 0,
          width: (row.dimensions_width as number) || 0,
          depth: (row.dimensions_depth as number) || 0,
          height: (row.dimensions_height as number) || 0
        },
        material: (row.material_type as string) || '',
        types: (row.types as string[]) || []
      };
  }
}