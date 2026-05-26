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
      type: 'order_out',
      quantity: -3,
      referenceType: 'order',
      referenceId: 'ord-99',
    });

    expect(exec.query).toHaveBeenCalledTimes(1);
    const [sql, params] = exec.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO stock_movements/i);
    expect(params[0]).toBe(42);
    expect(params[1]).toBe('order_out');
    expect(params[2]).toBe(-3);
    expect(params[3]).toBe('order');
    expect(params[4]).toBe('ord-99');
  });

  it('inserts a positive movement for produced_in', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 1,
      type: 'produced_in',
      quantity: 50,
      notes: 'Production batch',
      createdBy: 'admin@test.com',
    });

    const [, params] = exec.query.mock.calls[0];
    expect(params[1]).toBe('produced_in');
    expect(params[2]).toBe(50);
    expect(params[5]).toBe('Production batch');
    expect(params[6]).toBe('admin@test.com');
  });

  it('passes null for missing optional fields', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 5,
      type: 'adjustment',
      quantity: 10,
    });

    const [, params] = exec.query.mock.calls[0];
    expect(params[3]).toBeNull(); // referenceType
    expect(params[4]).toBeNull(); // referenceId
    expect(params[5]).toBeNull(); // notes
    expect(params[6]).toBeNull(); // createdBy
  });

  it('supports write_off with negative quantity', async () => {
    const exec = mockExec();
    await recordStockMovement(exec, {
      productId: 7,
      type: 'write_off',
      quantity: -2,
      notes: 'Damaged goods',
    });

    const [, params] = exec.query.mock.calls[0];
    expect(params[2]).toBe(-2);
  });
});
