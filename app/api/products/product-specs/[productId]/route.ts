import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getCacheHeaders } from "@/app/lib/cache-headers";
import { ProductSpecs, SofaSpecs, CornerSofaSpecs, BedSpecs, TableSpecs, ChairSpecs, MattressSpecs, WardrobeSpecs, AccessorySpecs } from "@/app/lib/definitions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const productId = (await params).productId;
  console.log("Fetching specs for product ID:", productId);

  try {
    // Fetch the product's category
    const { rows: productRows } = await db.query`
      SELECT id, category FROM products WHERE id = ${Number(productId)}
    `;

    if (productRows.length === 0) {
      console.log("Product not found:", productId);
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.log("Product found:", productRows[0]);
    const category = productRows[0].category.trim().toLowerCase();
    console.log("Raw category from database:", category);

    // Define a mapping from Ukrainian categories to English categories
    const categoryMapping: { [key: string]: string } = {
      'ліжко': 'beds',
      'диван': 'sofas',
      'кутовий диван': 'corner_sofas',
      'кутовийдиван': 'corner_sofas', // No space variant
      'стіл': 'tables',
      'стілець': 'chairs',
      'матрац': 'mattresses',
      'матрас': 'mattresses', // Alternative spelling
      'шафа': 'wardrobes',
      'гардероб': 'wardrobes', // Alternative term
      'аксесуар': 'accessories'
    };

    // Normalize the category by mapping it to its English equivalent
    const normalizedCategory = categoryMapping[category] || category;
    console.log("Normalized category:", normalizedCategory);

    // Fetch raw product specs without transformations
    const { rows: specRows } = await db.query`
      SELECT * FROM product_specs WHERE product_id = ${Number(productId)}
    `;

    if (specRows.length === 0) {
      console.log("No specs found for product:", productId);
      return NextResponse.json(
        { error: "Product specs not found" },
        { status: 404 }
      );
    }

    console.log("Raw specs found:", specRows[0]);
    const row = specRows[0];

    // Base specs object with common fields
    const specs: Partial<ProductSpecs> = {
      id: row.id,
      product_id: row.product_id,
    };

    // Process types field - it may come as a string or array from the database
    let types: string[] = [];
    if (row.types) {
      if (Array.isArray(row.types)) {
        types = row.types;
      } else if (typeof row.types === 'string') {
        // If it's a JSON string
        try {
            types = JSON.parse(row.types);
          } catch (error) {
            console.error("Failed to parse JSON types:", error);
          // If it's a comma-separated string
          types = row.types.split(',').map((t: string) => t.trim());
        }
      }
    }

    // Handle both sofa and corner sofa with similar logic
    if (normalizedCategory === "sofas" || normalizedCategory === "corner_sofas") {
      // Use the appropriate type based on the category
      const isSofa = normalizedCategory === "sofas";
      const sofaSpecs = isSofa ? (specs as Partial<SofaSpecs>) : (specs as Partial<CornerSofaSpecs>);
      
      sofaSpecs.category = isSofa ? 'sofas' : 'corner_sofas';
      sofaSpecs.construction = row.construction || '';
      
      // Initialize dimensions with both width (for corner sofas) and depth (for regular sofas)
      if (!isSofa) {
        // For corner sofas include width
        sofaSpecs.dimensions = {
          length: row.length || 0,
          width: row.width || 0,
          depth: row.depth || 0,
          height: row.height || 0
        };
      } else {
        // For regular sofas
        sofaSpecs.dimensions = {
          length: row.length || 0,
          depth: row.depth || 0,
          height: row.height || 0
        };
      }

      // Only add sleeping area if both dimensions exist
      if (row.sleeping_area_width && row.sleeping_area_length) {
        sofaSpecs.dimensions.sleeping_area = {
          width: row.sleeping_area_width,
          length: row.sleeping_area_length
        };
      }

      sofaSpecs.material = {
        type: row.material_type || '',
        composition: row.material_composition || null,
        backrest_filling: row.backrest_filling || undefined,
        covers: row.material_covers || null
      };

      sofaSpecs.inner_material = {
        structure: row.material_structure || '',
        cushion_filling: row.cushion_filling || ''
      };

      sofaSpecs.additional_features = row.additional_features || undefined;
      sofaSpecs.has_shelves = !!row.has_shelves;
      sofaSpecs.leg_height = row.leg_height || undefined;
      sofaSpecs.has_lift_mechanism = !!row.has_lift_mechanism;
      sofaSpecs.types = types;
      sofaSpecs.armrest_type = row.armrest_type || null;
      sofaSpecs.seat_height = row.seat_height ? Number(row.seat_height) : null;

      return NextResponse.json(sofaSpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else if (normalizedCategory === "beds") {
      const bedSpecs = specs as Partial<BedSpecs>;
      bedSpecs.category = 'beds';
      bedSpecs.construction = row.construction || undefined;
      bedSpecs.dimensions = {
        length: row.length || 0,
        depth: row.depth || 0,
        height: row.height || 0
      };
      bedSpecs.headboard_type = row.headboard_type || null;
      bedSpecs.storage_options = row.storage_options || null;
      bedSpecs.material = row.material_type || '';

      return NextResponse.json(bedSpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else if (normalizedCategory === "tables") {
      const tableSpecs = specs as Partial<TableSpecs>;
      tableSpecs.category = 'tables';
      tableSpecs.shape = types.includes('round') ? 'round' : 
                         types.includes('oval') ? 'oval' : 
                         types.includes('square') ? 'square' : 'rectangular';
      tableSpecs.extendable = types.includes('folding');
      tableSpecs.material = row.material_type || '';
      tableSpecs.dimensions = {
        length: row.length || 0,
        width: row.width || 0,
        depth: row.depth || 0,
        height: row.height || 0
      };

      return NextResponse.json(tableSpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else if (normalizedCategory === "chairs") {
      const chairSpecs = specs as Partial<ChairSpecs>;
      chairSpecs.category = 'chairs';
      chairSpecs.upholstery = row.material_covers || undefined;
      chairSpecs.seat_height = row.seat_height ? Number(row.seat_height) : undefined;
      chairSpecs.weight_capacity = undefined; // Not in your sample data, add if needed
      chairSpecs.material = row.material_type || '';
      chairSpecs.dimensions = {
        length: row.length || 0,
        width: row.width || 0,
        depth: row.depth || 0,
        height: row.height || 0
      };

      return NextResponse.json(chairSpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else if (normalizedCategory === "mattresses") {
      const mattressSpecs = specs as Partial<MattressSpecs>;
      mattressSpecs.category = 'mattresses';
      mattressSpecs.type = row.core_type || row.material_type || '';
      mattressSpecs.firmness = row.hardness || '';
      mattressSpecs.thickness = row.height || 0;
      mattressSpecs.dimensions = {
        length: row.length || 0,
        width: row.depth || 0 // Using depth for width in mattresses
      };

      return NextResponse.json(mattressSpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else if (normalizedCategory === "wardrobes") {
      const wardrobeSpecs = specs as Partial<WardrobeSpecs>;
      wardrobeSpecs.category = 'wardrobes';
      wardrobeSpecs.door_count = types.includes('one_door') ? 1 :
                                 types.includes('two_doors') ? 2 :
                                 types.includes('three_doors') ? 3 :
                                 types.includes('four_doors') ? 4 : 2; // Default
      wardrobeSpecs.door_type = types.includes('sliding_doors') ? 'sliding' : 'hinged';
      wardrobeSpecs.internal_layout = row.additional_features || undefined;
      wardrobeSpecs.material = row.material_type || '';
      wardrobeSpecs.dimensions = {
        length: row.length || 0,
        width: row.width || 0,
        depth: row.depth || 0,
        height: row.height || 0
      };

      return NextResponse.json(wardrobeSpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else if (normalizedCategory === "accessories") {
      const accessorySpecs = specs as Partial<AccessorySpecs>;
      accessorySpecs.category = 'accessories';
      accessorySpecs.mounting_type = null; // Not in your sample data
      accessorySpecs.shelf_count = null; // Not in your sample data
      accessorySpecs.material = row.material_type || '';
      accessorySpecs.dimensions = {
        length: row.length || 0,
        width: row.width || 0,
        depth: row.depth || 0,
        height: row.height || 0
      };

      return NextResponse.json(accessorySpecs, { status: 200, headers: getCacheHeaders('static') });
    } 
    else {
      // If category doesn't match, return the raw data with a warning
      console.log(`Unknown category after mapping: ${normalizedCategory}`);
      return NextResponse.json({
        warning: `Category '${category}' (normalized to '${normalizedCategory}') is not specifically handled`,
        rawData: row,
        // Add basic specs that all components will expect
        id: row.id,
        product_id: row.product_id,
        category: 'unknown',
        dimensions: {
          length: row.length || 0,
          width: row.width || 0,
          depth: row.depth || 0,
          height: row.height || 0
        },
        material: row.material_type || '',
        additional_features: row.additional_features || ''
      }, { status: 200, headers: getCacheHeaders('static') });
    }
  } catch (error: unknown) {
    console.error("Error fetching product specs:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch product specs",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}