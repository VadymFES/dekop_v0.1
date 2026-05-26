/**
 * Inventory stock movement helper tests.
 * Uses a mock query executor — no database required.
 */

import { recordStockMovement } from '@/app/lib/inventory/movements';

function mockExec() {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  return { query };
}

describe('recordStockMovement', () => {
  it('inserts a signed-negative movement for order_out', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 42,
      warehouseId: 'wh-uuid',
      type: 'order_out',
      quantity: -3,
      referenceType: 'order',
      referenceId: 'ord-99',
    });

    expect(exec.query).toHaveBeenCalledTimes(1);
    const [sql, params] = exec.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO stock_movements/i);
    expect(params[0]).toBe(42);
    expect(params[1]).toBe('wh-uuid');
    expect(params[2]).toBe('order_out');
    expect(params[3]).toBe(-3);
    expect(params[4]).toBe('order');
    expect(params[5]).toBe('ord-99');
  });

  it('inserts a positive movement for purchase_in', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 1,
      warehouseId: 'wh-uuid',
      type: 'purchase_in',
      quantity: 50,
      notes: 'Delivery from supplier',
      createdBy: 'admin@test.com',
    });

    const [, params] = exec.query.mock.calls[0];
    expect(params[2]).toBe('purchase_in');
    expect(params[3]).toBe(50);
    expect(params[6]).toBe('Delivery from supplier');
    expect(params[7]).toBe('admin@test.com');
  });

  it('passes null for missing optional fields', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 5,
      warehouseId: 'wh-uuid',
      type: 'adjustment',
      quantity: 10,
    });

    const [, params] = exec.query.mock.calls[0];
    expect(params[4]).toBeNull(); // referenceType
    expect(params[5]).toBeNull(); // referenceId
    expect(params[6]).toBeNull(); // notes
    expect(params[7]).toBeNull(); // createdBy
  });

  it('supports adjustment with negative quantity for write-off', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 7,
      warehouseId: 'wh-uuid',
      type: 'adjustment',
      quantity: -2,
      notes: 'Damaged goods',
    });

    const [, params] = exec.query.mock.calls[0];
    expect(params[3]).toBe(-2);
  });
});
