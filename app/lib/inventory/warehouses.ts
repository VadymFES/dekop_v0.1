import { sql } from '@vercel/postgres';

let cachedId: string | null = null;

export async function getDefaultWarehouseId(): Promise<string> {
  if (cachedId) return cachedId;
  const { rows } = await sql`SELECT id FROM warehouses WHERE is_default = true LIMIT 1`;
  if (!rows[0]) throw new Error('No default warehouse configured');
  cachedId = rows[0].id as string;
  return cachedId;
}
