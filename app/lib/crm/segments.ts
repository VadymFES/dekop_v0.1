/**
 * Customer segmentation thresholds and helpers (CRM Phase 1).
 * Segments are derived at query time from denormalized aggregates.
 */

import type { Customer, CustomerSegment } from '@/app/lib/definitions';

/** Spend (UAH) at/above which a customer is treated as VIP. */
export const VIP_SPEND_THRESHOLD = 50000;

/** Derive a segment label from a customer's aggregates. */
export function deriveSegment(customer: Pick<Customer, 'total_orders' | 'total_spent'>): CustomerSegment {
  if (customer.total_spent >= VIP_SPEND_THRESHOLD) return 'vip';
  if (customer.total_orders >= 2) return 'repeat';
  return 'new';
}
