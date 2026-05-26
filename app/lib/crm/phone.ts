/**
 * Ukrainian phone normalization for the customer master.
 *
 * Produces the canonical `+380XXXXXXXXX` form used as the dedup key in the
 * `customers` table. Must stay in lockstep with the SQL `normalize_ua_phone()`
 * function in migration 010 so the app and the backfill agree on dedup keys.
 */

/**
 * Normalize a raw phone string to `+380XXXXXXXXX`, or return null if there are
 * no usable digits. Best-effort for malformed input (keeps digits with `+`).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits === '') return null;

  // 380XXXXXXXXX (12 digits, full country code)
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+${digits}`;
  }

  // 0XXXXXXXXX (10 digits, national leading zero)
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+38${digits}`;
  }

  // XXXXXXXXX (9 significant digits)
  if (digits.length === 9) {
    return `+380${digits}`;
  }

  return `+${digits}`;
}

/**
 * True when the value is a fully valid Ukrainian mobile/landline number in the
 * canonical `+380XXXXXXXXX` form after normalization.
 */
export function isValidUaPhone(raw: string | null | undefined): boolean {
  const normalized = normalizePhone(raw);
  return normalized != null && /^\+380\d{9}$/.test(normalized);
}
