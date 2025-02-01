/////// uncomeent the code below to seed the products table with slugs


// import { db } from "@vercel/postgres";
// import { generateSlug } from "@/app/lib/slugify";

// const client = await db.connect();

// async function seedProducts() {
//   try {
//     // Add slug column if not exists
//     await client.sql`
//       ALTER TABLE products
//       ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
//     `;

//     // Get products directly from database
//     const { rows: products } = await client.sql`
//       SELECT * FROM products;
//     `;

//     // Update slugs in transaction
//     await client.sql`BEGIN`;
//     try {
//       for (const product of products) {
//         if (!product.slug) {
//           let slug = generateSlug(product.name);
          
//           // Ensure slug is not empty
//           if (!slug) {
//             slug = `product-${product.id.slice(0, 8)}`;
//           }

//           // Check for existing slugs
//           const { rows: existing } = await client.sql`
//             SELECT slug FROM products WHERE slug = ${slug}
//           `;

//           let finalSlug = slug;
//           if (existing.length > 0) {
//             finalSlug = `${slug}-${product.id.slice(0, 4)}`;
//           }

//           // Update product slug
//           await client.sql`
//             UPDATE products
//             SET slug = ${finalSlug}
//             WHERE id = ${product.id}
//           `;
//         }
//       }
//       await client.sql`COMMIT`;
//     } catch (error) {
//       await client.sql`ROLLBACK`;
//       throw error;
//     }

//     // Add constraints after successful update
//     await client.sql`
//       ALTER TABLE products
//       ALTER COLUMN slug SET NOT NULL,
//       ADD CONSTRAINT unique_slug UNIQUE (slug);
//     `;

//     return { success: true };
//   } catch (error) {
//     console.error('Seed failed:', error);
//     throw error;
//   }
// }

// // Separate API endpoint handler
// export async function GET() {
//   try {
//     await seedProducts();
//     return new Response(
//       JSON.stringify({ status: "success", message: "Slugs generated successfully" }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error: any) {
//     return new Response(
//       JSON.stringify({ 
//         status: "error", 
//         error: error.message,
//         details: error.stack 
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }