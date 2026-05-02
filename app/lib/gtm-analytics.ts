/**
 * Google Tag Manager Analytics Utilities
 *
 * Implements Google Analytics 4 (GA4) Enhanced E-commerce tracking
 * following the official GA4 e-commerce measurement specification.
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

import { ProductWithImages, CartItem } from './definitions';

// Extend Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

/**
 * Initialize dataLayer if it doesn't exist
 */
function initDataLayer() {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = [];
  }
}

/**
 * Push event to GTM dataLayer
 */
function pushToDataLayer(data: Record<string, any>) {
  if (typeof window === 'undefined') return;

  initDataLayer();

  // Add timestamp to all events
  window.dataLayer.push({
    ...data,
    timestamp: new Date().toISOString(),
  });

  console.log('[GTM Analytics]', data.event, data);
}

/**
 * Format product data for GA4 e-commerce events
 */
function formatProductItem(product: ProductWithImages | CartItem, quantity?: number, index?: number) {
  // Check if this is a CartItem (has productDetails) or ProductWithImages
  const isCartItem = 'productDetails' in product;
  const productData = isCartItem ? (product as CartItem).productDetails || product : product;

  // Get category - CartItem doesn't have category, but ProductWithImages does
  let itemCategory = '';
  if ('category' in productData) {
    itemCategory = productData.category;
  } else if (isCartItem && (product as CartItem).productDetails) {
    itemCategory = (product as CartItem).productDetails!.category;
  }

  // Get discount - only ProductWithImages has is_on_sale and sale_price
  const discountData: { discount?: number } = {};
  if ('is_on_sale' in productData && productData.is_on_sale && 'sale_price' in productData && productData.sale_price) {
    const regularPrice = parseFloat(productData.price?.toString() || '0');
    const salePrice = parseFloat((productData as any).sale_price?.toString() || '0');
    discountData.discount = parseFloat((regularPrice - salePrice).toFixed(2));
  }

  return {
    item_id: productData.id?.toString() || product.id?.toString(),
    item_name: productData.name || product.name,
    item_category: itemCategory,
    price: parseFloat(productData.price?.toString() || product.price?.toString() || '0'),
    quantity: quantity || (product as CartItem).quantity || 1,
    ...(index !== undefined && { index }),
    ...discountData,
    ...((product as CartItem).color && { item_variant: (product as CartItem).color }),
  };
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle: string) {
  pushToDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: pageTitle,
  });
}

/**
 * Track product view (view_item)
 * Fire when a user views a product detail page
 */
export function trackViewItem(product: ProductWithImages) {
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'UAH',
      value: parseFloat(product.price.toString()),
      items: [formatProductItem(product)],
    },
  });
}

/**
 * Track product list view (view_item_list)
 * Fire when user views a list of products (catalog, category, search results)
 */
export function trackViewItemList(
  products: ProductWithImages[],
  listName: string,
  listId?: string
) {
  pushToDataLayer({
    event: 'view_item_list',
    ecommerce: {
      item_list_name: listName,
      item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
      items: products.slice(0, 10).map((product, index) => formatProductItem(product, 1, index)),
    },
  });
}

/**
 * Track product click from list (select_item)
 */
export function trackSelectItem(
  product: ProductWithImages,
  listName: string,
  index?: number
) {
  pushToDataLayer({
    event: 'select_item',
    ecommerce: {
      item_list_name: listName,
      items: [formatProductItem(product, 1, index)],
    },
  });
}

/**
 * Track add to cart (add_to_cart)
 */
export function trackAddToCart(
  product: ProductWithImages | CartItem,
  quantity: number = 1,
  color?: string
) {
  const item = formatProductItem(product, quantity);
  if (color) {
    item.item_variant = color;
  }

  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'UAH',
      value: item.price * quantity,
      items: [item],
    },
  });
}

/**
 * Track remove from cart (remove_from_cart)
 */
export function trackRemoveFromCart(
  product: ProductWithImages | CartItem,
  quantity?: number
) {
  const item = formatProductItem(product, quantity);

  pushToDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'UAH',
      value: item.price * item.quantity,
      items: [item],
    },
  });
}

/**
 * Track view cart page (view_cart)
 */
export function trackViewCart(cartItems: CartItem[]) {
  const totalValue = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price?.toString() || '0');
    return sum + (price * item.quantity);
  }, 0);

  pushToDataLayer({
    event: 'view_cart',
    ecommerce: {
      currency: 'UAH',
      value: totalValue,
      items: cartItems.map((item) => formatProductItem(item, item.quantity)),
    },
  });
}

/**
 * Track begin checkout (begin_checkout)
 */
export function trackBeginCheckout(cartItems: CartItem[]) {
  const totalValue = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price?.toString() || '0');
    return sum + (price * item.quantity);
  }, 0);

  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'UAH',
      value: totalValue,
      items: cartItems.map((item) => formatProductItem(item, item.quantity)),
    },
  });
}

/**
 * Track checkout progress (add_shipping_info, add_payment_info)
 */
export function trackCheckoutProgress(
  step: 'shipping' | 'payment',
  cartItems: CartItem[],
  additionalData?: Record<string, any>
) {
  const totalValue = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price?.toString() || '0');
    return sum + (price * item.quantity);
  }, 0);

  const eventName = step === 'shipping' ? 'add_shipping_info' : 'add_payment_info';

  pushToDataLayer({
    event: eventName,
    ecommerce: {
      currency: 'UAH',
      value: totalValue,
      items: cartItems.map((item) => formatProductItem(item, item.quantity)),
      ...additionalData,
    },
  });
}

/**
 * Track purchase completion (purchase)
 */
export function trackPurchase(
  orderId: string,
  cartItems: CartItem[],
  orderTotal: number,
  additionalData?: {
    shipping?: number;
    tax?: number;
    coupon?: string;
    paymentMethod?: string;
    deliveryMethod?: string;
  }
) {
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: orderId,
      value: orderTotal,
      currency: 'UAH',
      shipping: additionalData?.shipping || 0,
      tax: additionalData?.tax || 0,
      coupon: additionalData?.coupon || '',
      items: cartItems.map((item) => formatProductItem(item, item.quantity)),
    },
    // Additional metadata
    payment_method: additionalData?.paymentMethod,
    delivery_method: additionalData?.deliveryMethod,
  });
}

/**
 * Track search (search)
 */
export function trackSearch(searchTerm: string, resultsCount?: number) {
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
    ...(resultsCount !== undefined && { results_count: resultsCount }),
  });
}

/**
 * Track internal site search with results
 */
export function trackSearchResults(
  searchTerm: string,
  resultsCount: number,
  products?: ProductWithImages[]
) {
  pushToDataLayer({
    event: 'view_search_results',
    search_term: searchTerm,
    results_count: resultsCount,
    ...(products && products.length > 0 && {
      ecommerce: {
        items: products.slice(0, 10).map((product, index) => formatProductItem(product, 1, index)),
      },
    }),
  });
}

/**
 * Track user engagement events
 */
export function trackUserEngagement(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  pushToDataLayer({
    event: 'user_engagement',
    engagement_action: action,
    engagement_category: category,
    ...(label && { engagement_label: label }),
    ...(value !== undefined && { engagement_value: value }),
  });
}

/**
 * Track add to favorites/wishlist
 */
export function trackAddToWishlist(product: ProductWithImages) {
  pushToDataLayer({
    event: 'add_to_wishlist',
    ecommerce: {
      currency: 'UAH',
      value: parseFloat(product.price.toString()),
      items: [formatProductItem(product)],
    },
  });
}

/**
 * Track remove from favorites/wishlist
 */
export function trackRemoveFromWishlist(product: ProductWithImages) {
  pushToDataLayer({
    event: 'remove_from_wishlist',
    ecommerce: {
      currency: 'UAH',
      value: parseFloat(product.price.toString()),
      items: [formatProductItem(product)],
    },
  });
}

/**
 * Track form submissions
 */
export function trackFormSubmission(
  formName: string,
  formId?: string,
  success: boolean = true
) {
  pushToDataLayer({
    event: 'form_submission',
    form_name: formName,
    form_id: formId || formName.toLowerCase().replace(/\s+/g, '_'),
    submission_success: success,
  });
}

/**
 * Track newsletter signup
 */
export function trackNewsletterSignup(email: string) {
  pushToDataLayer({
    event: 'newsletter_signup',
    user_email_hash: btoa(email), // Hash email for privacy
  });
}

/**
 * Track filter usage in catalog
 */
export function trackFilterUsed(
  filterType: string,
  filterValue: string,
  resultsCount?: number
) {
  pushToDataLayer({
    event: 'filter_used',
    filter_type: filterType,
    filter_value: filterValue,
    ...(resultsCount !== undefined && { results_count: resultsCount }),
  });
}

/**
 * Track sort usage in catalog
 */
export function trackSortUsed(sortBy: string, sortOrder: string) {
  pushToDataLayer({
    event: 'sort_used',
    sort_by: sortBy,
    sort_order: sortOrder,
  });
}

/**
 * Track scroll depth (for engagement measurement)
 */
export function trackScrollDepth(percentage: number) {
  pushToDataLayer({
    event: 'scroll_depth',
    scroll_percentage: percentage,
  });
}

/**
 * Track video play/pause
 */
export function trackVideoInteraction(
  action: 'play' | 'pause' | 'complete',
  videoTitle: string,
  videoDuration?: number,
  videoCurrentTime?: number
) {
  pushToDataLayer({
    event: 'video_interaction',
    video_action: action,
    video_title: videoTitle,
    ...(videoDuration && { video_duration: videoDuration }),
    ...(videoCurrentTime && { video_current_time: videoCurrentTime }),
  });
}

/**
 * Track file downloads
 */
export function trackFileDownload(fileName: string, fileType: string, fileUrl: string) {
  pushToDataLayer({
    event: 'file_download',
    file_name: fileName,
    file_type: fileType,
    file_url: fileUrl,
  });
}

/**
 * Track outbound link clicks
 */
export function trackOutboundClick(url: string, linkText?: string) {
  pushToDataLayer({
    event: 'outbound_click',
    outbound_url: url,
    ...(linkText && { link_text: linkText }),
  });
}

/**
 * Track error occurrences
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  errorLocation?: string
) {
  pushToDataLayer({
    event: 'error_occurred',
    error_type: errorType,
    error_message: errorMessage,
    ...(errorLocation && { error_location: errorLocation }),
  });
}

/**
 * Track custom conversion events
 */
export function trackConversion(
  conversionName: string,
  conversionValue?: number,
  conversionData?: Record<string, any>
) {
  pushToDataLayer({
    event: 'conversion',
    conversion_name: conversionName,
    ...(conversionValue !== undefined && { conversion_value: conversionValue }),
    ...conversionData,
  });
}
