# GTM Integration - Quick Reference

Quick reference for the GTM e-commerce tracking implementation in Dekop Furniture Enterprise.

## Current GTM Setup

- **GTM ID**: `GTM-TVVGC6PQ`
- **Location**: `app/layout.tsx` and `app/components/GoogleTagManager.tsx`
- **Analytics Module**: `app/lib/gtm-analytics.ts`

## Events Currently Tracked

### E-commerce Events

| Event | Location | Trigger |
|-------|----------|---------|
| `view_item` | Product detail page | Page load (fires once per page) |
| `add_to_cart` | Product actions/cards | Item added to cart |
| `begin_checkout` | Checkout page | Page load |
| `add_shipping_info` | Checkout page | Shipping step completed |
| `add_payment_info` | Checkout page | Payment step completed |
| `purchase` | Order success page | **Only when payment_status = 'paid'** ✅ |

### Payment Tracking Events

| Event | Location | Trigger |
|-------|----------|---------|
| `payment_cancelled` | Payment cancelled page | User cancels/abandons payment |

### Events NOT Tracked (Disabled)

The following events are available in the analytics module but **not actively tracked**:
- ❌ `remove_from_cart` - Removed per user request
- ❌ `view_cart` - Removed per user request
- ❌ Search suggestion engagement - Removed per user request
- ❌ Video interactions - Not implemented
- ❌ File downloads - Not implemented

## Data Layer Structure

All e-commerce events follow the GA4 e-commerce specification:

```javascript
{
  event: 'event_name',
  ecommerce: {
    currency: 'UAH',
    value: 1234.56,
    items: [
      {
        item_id: '123',
        item_name: 'Product Name',
        item_category: 'Category',
        price: 1234.56,
        quantity: 1,
        discount: 0,
        item_variant: 'Color'
      }
    ]
  },
  // Additional metadata
  timestamp: '2025-12-01T10:30:00.000Z'
}
```

## Using Analytics Functions

### Import

```javascript
import {
  trackViewItem,
  trackAddToCart,
  trackBeginCheckout,
  trackCheckoutProgress,
  trackPurchase,
  // ... other functions
} from '@/app/lib/gtm-analytics';
```

### Examples

```javascript
// Track product view
trackViewItem(product);

// Track add to cart
trackAddToCart(product, quantity, color);

// Track checkout
trackBeginCheckout(cartItems);

// Track shipping info
trackCheckoutProgress('shipping', cartItems, {
  shipping_method: 'nova_poshta'
});

// Track payment info
trackCheckoutProgress('payment', cartItems, {
  payment_method: 'liqpay'
});

// Track purchase
trackPurchase(orderId, cartItems, orderTotal, {
  paymentMethod: 'liqpay',
  deliveryMethod: 'nova_poshta'
});
```

## Testing Checklist

- [ ] Product view tracking fires **once** on product pages (not twice)
- [ ] Add to cart tracking fires when adding items
- [ ] Begin checkout tracking fires on checkout page
- [ ] Shipping info tracking fires at step 2
- [ ] Payment info tracking fires at step 3
- [ ] Purchase tracking fires on /order-success **only if payment is paid** ✅
- [ ] Payment cancelled tracking fires on /payment-cancelled ❌

## GTM Preview Mode

1. Go to GTM → Preview
2. Enter site URL
3. Test each event
4. Check dataLayer in debug panel
5. Verify all parameters are correct

## GA4 Verification

1. Go to GA4 → DebugView (with GTM Preview active)
2. Perform actions on site
3. See events in real-time
4. Verify parameters match expected values

## Common Data Layer Variables Needed in GTM

Create these in GTM → Variables → User-Defined Variables:

**E-commerce Variables:**
- `ecommerce`
- `ecommerce.transaction_id`
- `ecommerce.currency`
- `ecommerce.value`
- `ecommerce.items`
- `payment_method`
- `delivery_method`

**Payment Tracking Variables:**
- `order_id`
- `order_number`
- `order_value`

## Files Modified

- ✅ `app/lib/gtm-analytics.ts` - Analytics utilities (NEW)
- ✅ `app/components/GoogleTagManager.tsx` - GTM component (existing)
- ✅ `app/layout.tsx` - GTM integration (existing)
- ✅ `app/product/[slug]/client-page.tsx` - Product view tracking (fires once)
- ✅ `app/product/components/actions/actions.tsx` - Add to cart tracking
- ✅ `app/shared/components/productCard/productCard.tsx` - Add to cart tracking
- ✅ `app/cart/page.tsx` - No tracking (view_cart removed)
- ✅ `app/checkout/page.tsx` - Checkout progress tracking only
- ✅ `app/order-success/page.tsx` - Purchase tracking for paid orders ✅
- ✅ `app/payment-cancelled/page.tsx` - Cancelled payment tracking ❌
- ✅ `app/api/products/by-id/[productId]/route.ts` - Product fetch API (NEW)
- ✅ `app/shared/components/SearchBar/SearchBar.tsx` - Search tracking disabled

## Next Steps for Full Implementation

1. Complete GTM container configuration (see GTM_CONFIGURATION_GUIDE.md)
2. Create GA4 event tags in GTM:
   - 6 e-commerce events (view_item through purchase)
   - 1 payment_cancelled event for abandoned checkouts
3. Test in Preview mode:
   - Verify view_item fires **once** per page
   - Complete full purchase flow to test purchase event
   - Cancel payment to test payment_cancelled event
4. Publish GTM container
5. Monitor in GA4 Realtime reports
6. Set up conversions:
   - Primary: `purchase` (only counts paid orders)
   - Secondary: `begin_checkout`, `add_to_cart`
7. Create funnel exploration:
   - Steps: view_item → add_to_cart → begin_checkout → purchase
   - Track drop-offs and payment_cancelled events
8. Create custom reports and dashboards

## Additional Features Available (Not Currently Used)

The `gtm-analytics.ts` module includes functions for optional future use:

- Product list views (`trackViewItemList`)
- Item selection from lists (`trackSelectItem`)
- Wishlist tracking (`trackAddToWishlist`, `trackRemoveFromWishlist`)
- Form submissions (`trackFormSubmission`)
- Newsletter signups (`trackNewsletterSignup`)
- Filter usage (`trackFilterUsed`)
- Sort usage (`trackSortUsed`)
- Scroll depth (`trackScrollDepth`)
- Outbound clicks (`trackOutboundClick`)
- Error tracking (`trackError`)
- Custom conversions (`trackConversion`)

These can be integrated as needed if requirements change.
