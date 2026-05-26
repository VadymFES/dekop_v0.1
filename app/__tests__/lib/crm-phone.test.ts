/**
 * CRM phone normalization tests.
 * Must agree with the SQL normalize_ua_phone() in migration 010.
 */

import { normalizePhone, isValidUaPhone } from '@/app/lib/crm/phone';

describe('normalizePhone', () => {
  it('keeps a canonical +380XXXXXXXXX number', () => {
    expect(normalizePhone('+380501234567')).toBe('+380501234567');
  });

  it('prefixes a bare 380XXXXXXXXX number', () => {
    expect(normalizePhone('380501234567')).toBe('+380501234567');
  });

  it('converts national 0XXXXXXXXX form', () => {
    expect(normalizePhone('0501234567')).toBe('+380501234567');
  });

  it('expands 9 significant digits', () => {
    expect(normalizePhone('501234567')).toBe('+380501234567');
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizePhone('+38 (050) 123-45-67')).toBe('+380501234567');
    expect(normalizePhone('050 123 45 67')).toBe('+380501234567');
  });

  it('returns null for empty/undefined input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('---')).toBeNull();
  });

  it('dedups different input formats of the same number to one key', () => {
    const a = normalizePhone('+380501234567');
    const b = normalizePhone('0501234567');
    const c = normalizePhone('38 050 123 45 67');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('isValidUaPhone', () => {
  it('accepts valid Ukrainian numbers in any accepted format', () => {
    expect(isValidUaPhone('+380501234567')).toBe(true);
    expect(isValidUaPhone('0501234567')).toBe(true);
  });

  it('rejects malformed numbers', () => {
    expect(isValidUaPhone('123')).toBe(false);
    expect(isValidUaPhone('')).toBe(false);
    expect(isValidUaPhone(null)).toBe(false);
  });
});
