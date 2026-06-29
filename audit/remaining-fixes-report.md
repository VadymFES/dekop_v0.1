# Checkout Remaining Fixes Report
**Branch:** `fix/checkout-remaining-2026-06-29`  
**Date:** 2026-06-29  
**Build:** PASS (`npm run build` — no TypeScript errors)

---

## Fix 1 — Payment Block Visual Distinction DONE

**Files changed:**
- `app/checkout/components/CheckoutSteps.module.css` — added `.paymentBlock`, `.liqpayBadge`, `.liqpayBadgeImg`
- `app/checkout/components/PaymentInfoStep.tsx` — wrapped options grid + info boxes in `<div className={styles.paymentBlock}>`

The payment method selection area (option cards + info notice) is now enclosed in a container with `background: #f9f9f9`, `border: 2px solid #e5e5e5`, and `border-radius: 12px`.

---

## Fix 2 — Official LiqPay Badge DONE

**Files changed:**
- `public/images/liqpay-logo.png` — downloaded from `https://static.liqpay.ua/buttons/logo-small.png`
- `app/checkout/components/PaymentInfoStep.tsx` — added `<img src="/images/liqpay-logo.png" alt="Оплата через LiqPay" className={styles.liqpayBadgeImg}>` inside the LiqPay info box alongside "Powered by LiqPay" label

**Note:** Official LiqPay logo at the specified URL is 18x18px PNG, displayed at 36x36px. Swap `public/images/liqpay-logo.png` to upgrade without code changes.

---

## Fix 3 — Order Lookup by Email DONE

**Files created:**
- `app/order-lookup/page.tsx` — email form, calls `/api/orders/lookup`, renders up to 5 order cards with Ukrainian labels, links to `/order-success?orderId=...&email=...`
- `app/order-lookup/page.module.css` — matching styles
- `app/api/orders/lookup/route.ts` — `POST /api/orders/lookup`: Zod-validates email, queries `orders` by `LOWER(user_email)`, returns last 5 rows. Rate-limited: 10 req/hour per IP.

**Files modified:**
- `app/order-success/page.tsx` — added "Знайти за email" link in the `payment_status === 'failed'` alert
- `app/payment-cancelled/page.tsx` — added "Знайти замовлення за email" link in the error state

Security: lookup returns summary fields only (no phone, address, or payment intent IDs).

---

## Fix 4 — Multi-Tab Cart Uniqueness DONE

**Migration — NOT applied (run manually):**
```
app/db/migrations/016_orders_cart_id_unique.sql
```
```bash
npm run migrate
```
SQL adds `cart_id VARCHAR(255)` column and a partial unique index (`WHERE cart_id IS NOT NULL`) so existing rows without a cart_id are unaffected.

**Code changes:**
- `app/api/orders/route.ts` — INSERT now includes `cart_id` ($26). Catch block detects PostgreSQL error code `23505` on the `orders_cart_id_unique` index and returns the existing order for that cart_id instead of an error — the second tab gets the same order the first tab created.
- `app/lib/definitions.ts` — added `cart_id?: string` to `Order` interface

---

## Fix 5 — LiqPay Error Codes -> Ukrainian Strings DONE

**Migration — NOT applied (run manually):**
```
app/db/migrations/017_orders_payment_err_code.sql
```
```bash
npm run migrate
```
SQL adds `payment_err_code VARCHAR(100)` to `orders`.

**Files created:**
- `app/lib/liqpay-errors.ts` — `getLiqPayErrorInfo(errCode)` maps 17 known LiqPay err_codes to `{ message: string (Ukrainian), offerAfterpayment: boolean }`. Falls back to a generic Ukrainian message for unknown codes. Raw err_code is never shown to the user.

**Files modified:**
- `app/api/webhooks/liqpay/route.ts` — parses `err_code` from callback, stores it in `payment_err_code` on the failure UPDATE
- `app/lib/definitions.ts` — added `payment_err_code?: string` to `Order` interface
- `app/order-success/page.tsx` — failure alert now calls `getLiqPayErrorInfo(order.payment_err_code)`. If `offerAfterpayment: true` (codes: `not_enough_money`, `limit`, `err_declined`), shows an additional line suggesting LiqPay installment options.

Error codes mapped: `limit`, `invalid_card`, `card_blocked`, `card_expired`, `not_enough_money`, `one_click_not_available`, `3ds_not_passed`, `fail_otp`, `sender_not_verified`, `wrong_amount_currency`, `payment_blocked`, `fail_phone_check`, `phone_not_sent`, `err_commission`, `score_kill`, `incorrect_credentials`, `err_declined`

---

## Migrations — Manual Run Required

| File | What it does |
|---|---|
| `016_orders_cart_id_unique.sql` | Adds `cart_id` column + partial unique index to `orders` |
| `017_orders_payment_err_code.sql` | Adds `payment_err_code` column to `orders` |

Both run with: `npm run migrate`

---

## Summary

| Fix | Status | Key files |
|-----|--------|-----------|
| 1 Payment block | DONE | CheckoutSteps.module.css, PaymentInfoStep.tsx |
| 2 LiqPay badge | DONE | public/images/liqpay-logo.png, PaymentInfoStep.tsx |
| 3 Order lookup | DONE | order-lookup/page.tsx, api/orders/lookup/route.ts, +2 modified |
| 4 Multi-tab guard | DONE | Migration 016, api/orders/route.ts, definitions.ts |
| 5 Error mapping | DONE | Migration 017, lib/liqpay-errors.ts, webhook, order-success, definitions.ts |

Build: **PASS** — `npm run build` exits 0.
