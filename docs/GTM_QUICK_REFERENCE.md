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
| `view_item` | Product detail page | Page load |
| `add_to_cart` | Cart context | Item added to cart |
| `remove_from_cart` | Cart context | Item removed from cart |
| `view_cart` | Cart page | Page load (cart has items) |
| `begin_checkout` | Checkout page | Page load |
| `add_shipping_info` | Checkout page | Shipping step completed |
| `add_payment_info` | Checkout page | Payment step completed |
| `purchase` | Checkout page | Order created successfully |

### Search Events

| Event | Location | Trigger |
|-------|----------|---------|
| `search_initiated` | SearchBar component | User starts typing (3+ chars) |
| `search_submitted` | SearchBar component | User submits search |
| `search_no_results` | SearchBar component | Search returns no results |
| `view_all_results_clicked` | SearchBar component | "View all" link clicked |

### User Engagement Events

| Event | Location | Trigger |
|-------|----------|---------|
| `suggestion_clicked` | SearchBar component | Product suggestion clicked |
| `category_suggestion_clicked` | SearchBar component | Category suggestion clicked |
| `filter_suggestion_clicked` | SearchBar component | Filter suggestion clicked |

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
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  // ... other functions
} from '@/app/lib/gtm-analytics';
```

### Examples

```javascript
// Track product view
trackViewItem(product);

// Track add to cart
trackAddToCart(product, quantity, color);

// Track remove from cart
trackRemoveFromCart(cartItem, quantity);

// Track cart view
trackViewCart(cartItems);

// Track checkout
trackBeginCheckout(cartItems);

// Track purchase
trackPurchase(orderId, cartItems, orderTotal, {
  paymentMethod: 'liqpay',
  deliveryMethod: 'nova_poshta'
});

// Track search
trackSearch(searchTerm, resultsCount);
```

## Testing Checklist

- [ ] Product view tracking fires on product pages
- [ ] Add to cart tracking fires when adding items
- [ ] Remove from cart tracking fires when removing items
- [ ] Cart view tracking fires on cart page
- [ ] Begin checkout tracking fires on checkout page
- [ ] Shipping info tracking fires at step 2
- [ ] Payment info tracking fires at step 3
- [ ] Purchase tracking fires after successful order
- [ ] Search tracking fires on search actions

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

- `ecommerce`
- `ecommerce.transaction_id`
- `ecommerce.currency`
- `ecommerce.value`
- `ecommerce.items`
- `search_term`
- `results_count`
- `payment_method`
- `delivery_method`

## Files Modified

- ✅ `app/lib/gtm-analytics.ts` - Analytics utilities (NEW)
- ✅ `app/components/GoogleTagManager.tsx` - GTM component (existing)
- ✅ `app/layout.tsx` - GTM integration (existing)
- ✅ `app/product/[slug]/client-page.tsx` - Product view tracking
- ✅ `app/context/CartContext.tsx` - Cart operation tracking
- ✅ `app/cart/page.tsx` - Cart view tracking
- ✅ `app/checkout/page.tsx` - Checkout & purchase tracking
- ✅ `app/api/products/by-id/[productId]/route.ts` - Product fetch API (NEW)
- ✅ `app/shared/components/SearchBar/SearchBar.tsx` - Search tracking (existing)

## Next Steps for Full Implementation

1. Complete GTM container configuration (see GTM_CONFIGURATION_GUIDE.md)
2. Create all GA4 event tags in GTM
3. Test in Preview mode
4. Publish GTM container
5. Monitor in GA4 Realtime reports
6. Set up conversions for key events
7. Create custom reports and dashboards

## Additional Features Available

The `gtm-analytics.ts` module includes functions for:

- ✅ Product list views (`trackViewItemList`)
- ✅ Item selection from lists (`trackSelectItem`)
- ✅ Wishlist tracking (`trackAddToWishlist`, `trackRemoveFromWishlist`)
- ✅ Form submissions (`trackFormSubmission`)
- ✅ Newsletter signups (`trackNewsletterSignup`)
- ✅ Filter usage (`trackFilterUsed`)
- ✅ Sort usage (`trackSortUsed`)
- ✅ Scroll depth (`trackScrollDepth`)
- ✅ Video interactions (`trackVideoInteraction`)
- ✅ File downloads (`trackFileDownload`)
- ✅ Outbound clicks (`trackOutboundClick`)
- ✅ Error tracking (`trackError`)
- ✅ Custom conversions (`trackConversion`)

These can be integrated as needed throughout the application.
