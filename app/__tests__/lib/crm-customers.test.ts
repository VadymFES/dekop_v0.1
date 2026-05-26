/**
 * Customer master helper tests (find-or-create dedup + spend aggregates).
 * Uses a mock query executor so no database is required.
 */

import { findOrCreateCustomer, applyOrderSpend } from '@/app/lib/crm/customers';

function mockExecutor(returnId = 'cust-1') {
  const query = jest.fn().mockResolvedValue({ rows: [{ id: returnId }] });
  return { query };
}

describe('findOrCreateCustomer', () => {
  it('normalizes the phone before upserting (dedup key)', async () => {
    const exec = mockExecutor();
    const id = await findOrCreateCustomer(exec, {
      phone: '0501234567',
      email: 'TEST@Example.com',
      firstName: 'Іван',
      lastName: 'Петренко',
    });

    expect(id).toBe('cust-1');
    expect(exec.query).toHaveBeenCalledTimes(1);
    const [sqlText, params] = exec.query.mock.calls[0];
    expect(sqlText).toMatch(/INSERT INTO customers/i);
    expect(sqlText).toMatch(/ON CONFLICT \(phone\) DO UPDATE/i);
    // phone normalized, email lowercased
    expect(params[0]).toBe('+380501234567');
    expect(params[1]).toBe('test@example.com');
    expect(params[2]).toBe('Іван');
    expect(params[3]).toBe('Петренко');
  });

  it('returns null and does not query when phone has no digits', async () => {
    const exec = mockExecutor();
    const id = await findOrCreateCustomer(exec, { phone: '---' });
    expect(id).toBeNull();
    expect(exec.query).not.toHaveBeenCalled();
  });

  it('passes null for missing optional contact fields', async () => {
    const exec = mockExecutor();
    await findOrCreateCustomer(exec, { phone: '+380501234567' });
    const [, params] = exec.query.mock.calls[0];
    expect(params[1]).toBeNull();
    expect(params[2]).toBeNull();
    expect(params[3]).toBeNull();
  });
});

describe('applyOrderSpend', () => {
  it('increments aggregates for the given customer', async () => {
    const exec = mockExecutor();
    await applyOrderSpend(exec, 'cust-1', 1500);
    expect(exec.query).toHaveBeenCalledTimes(1);
    const [sqlText, params] = exec.query.mock.calls[0];
    expect(sqlText).toMatch(/UPDATE customers/i);
    expect(sqlText).toMatch(/total_orders = total_orders \+ 1/i);
    expect(sqlText).toMatch(/total_spent = total_spent \+ \$2/i);
    expect(params).toEqual(['cust-1', 1500]);
  });
});
