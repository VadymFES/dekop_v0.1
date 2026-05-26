import type { QueryExecutor } from '@/app/lib/crm/customers';

export type StockMovementType = 'produced_in' | 'order_out' | 'adjustment' | 'return_in' | 'write_off';

export interface StockMovementInput {
  productId: number;
  type: StockMovementType;
  /** Signed quantity: negative for order_out/write_off, positive for everything else. */
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
       (product_id, type, quantity, reference_type, reference_id, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.productId,
      input.type,
      input.quantity,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.notes ?? null,
      input.createdBy ?? null,
    ],
  );
}
