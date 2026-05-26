/**
 * Customer master helpers (CRM Phase 1).
 *
 * `findOrCreateCustomer` deduplicates by normalized phone and is safe to call
 * from inside an order transaction (pass the pooled pg client) or from a server
 * action (pass the app `db` wrapper) — both expose `.query(text, values)`.
 */

import { normalizePhone } from './phone';

/** Minimal executor shape shared by the pooled pg client and the app db wrapper. */
export interface QueryExecutor {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

export interface CustomerLinkInput {
  phone: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Find-or-create a customer by normalized phone. Refreshes contact fields to the
 * latest non-null values seen (admin-curated fields like notes/tags are untouched).
 * Returns the customer id, or null when the phone has no usable digits.
 */
export async function findOrCreateCustomer(
  executor: QueryExecutor,
  input: CustomerLinkInput,
): Promise<string | null> {
  const phone = normalizePhone(input.phone);
  if (!phone) return null;

  const result = await executor.query(
    `INSERT INTO customers (phone, email, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, customers.email),
       first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
       last_name = COALESCE(EXCLUDED.last_name, customers.last_name),
       updated_at = NOW()
     RETURNING id`,
    [
      phone,
      input.email ? input.email.toLowerCase() : null,
      input.firstName || null,
      input.lastName || null,
    ],
  );

  return (result.rows[0]?.id as string | undefined) ?? null;
}

/**
 * Increment denormalized spend aggregates after an order is created.
 * Kept consistent with the backfill (counts every order, regardless of payment
 * status); refine to paid-only when the accounting ledger lands.
 */
export async function applyOrderSpend(
  executor: QueryExecutor,
  customerId: string,
  amount: number,
): Promise<void> {
  await executor.query(
    `UPDATE customers
     SET total_orders = total_orders + 1,
         total_spent = total_spent + $2,
         last_order_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [customerId, amount],
  );
}
