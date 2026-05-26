import type { QueryExecutor } from '@/app/lib/crm/customers';

export type StockMovementType = 'purchase_in' | 'order_out' | 'adjustment' | 'return_in';

export interface StockMovementInput {
  productId: number;
  warehouseId: string;
  type: StockMovementType;
  /** Signed quantity: negative for order_out, positive for everything else. */
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}

export async function recordStockMovement(
  executor: QueryExecutor,
  input: StockMovementInput,
): Promise<void> {
  await executor.query(
    `INSERT INTO stock_movements
       (product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.productId,
      input.warehouseId,
      input.type,
      input.quantity,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.notes ?? null,
      input.createdBy ?? null,
    ],
  );
}
