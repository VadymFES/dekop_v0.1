'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { OrderWithItems, CartItem } from '@/app/lib/definitions';
import {
  formatUkrainianDate,
  formatUkrainianPrice,
  getDeliveryMethodName,
  getPaymentMethodName,
  getOrderStatusName,
  formatDeliveryAddress
} from '@/app/lib/order-utils';
import OrderSummary from '@/app/components/order/OrderSummary';
import { useCart } from '@/app/context/CartContext';
import { trackPurchase } from '@/app/lib/gtm-analytics';
import styles from './page.module.css';

// LocalStorage key for checkout form data (same as in checkout page)
const CHECKOUT_STORAGE_KEY = 'dekop_checkout_form';
const ORDER_EMAIL_MAPPING_KEY = 'dekop_order_email_mapping';

// Polling configuration
const POLLING_INTERVAL_MS = 3000; // Check every 3 seconds
const POLLING_MAX_DURATION_MS = 90000; // Stop polling after 90 seconds

/**
 * Order Success Page Content Component
 */
function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const { clearCart } = useCart();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Use ref to track cleanup status to prevent infinite loops
  const cleanupInitiatedRef = useRef(false);
  const purchaseTrackedRef = useRef(false);
  const pollingStartTimeRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to get customer email
  const getCustomerEmail = useCallback((): string | null => {
    let customerEmail: string | null = null;

    // 1. First, check order-email mapping (persists through payment flow)
    try {
      const mappingData = localStorage.getItem(ORDER_EMAIL_MAPPING_KEY);
      if (mappingData && orderId) {
        const mapping = JSON.parse(mappingData);
        const orderData = mapping[orderId];
        customerEmail = orderData?.email || null;
      }
    } catch (error) {
      console.error('Error reading order-email mapping:', error);
    }

    // 2. If not found, try URL params (from payment gateway redirect)
    if (!customerEmail) {
      customerEmail = searchParams.get('email');
    }

    // 3. If still not found, try checkout form data (for cash_on_delivery)
    if (!customerEmail) {
      try {
        const checkoutData = localStorage.getItem(CHECKOUT_STORAGE_KEY);
        if (checkoutData) {
          const parsedData = JSON.parse(checkoutData);
          customerEmail = parsedData.formData?.customerInfo?.email || null;
        }
      } catch (storageError) {
        console.error('Error reading checkout data from localStorage:', storageError);
      }
    }

    return customerEmail;
  }, [orderId, searchParams]);

  // Poll payment status for online payment methods
  const pollPaymentStatus = useCallback(async () => {
    if (!orderId) return;

    const customerEmail = getCustomerEmail();
    if (!customerEmail) {
      console.error('[Payment Poll] No customer email found');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}?email=${encodeURIComponent(customerEmail)}`);

      if (!response.ok) {
        console.error('[Payment Poll] Failed to fetch order:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success && data.order) {
        const updatedOrder = data.order as OrderWithItems;

        // Check if payment status has changed from pending
        if (updatedOrder.payment_status !== 'pending') {
          console.log('[Payment Poll] Payment status changed:', updatedOrder.payment_status);
          setOrder(updatedOrder);
          setIsCheckingPayment(false);

          // Clear the polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }

        // Check if max polling duration exceeded
        if (pollingStartTimeRef.current) {
          const elapsed = Date.now() - pollingStartTimeRef.current;
          if (elapsed >= POLLING_MAX_DURATION_MS) {
            console.log('[Payment Poll] Max polling duration exceeded, stopping');
            setOrder(updatedOrder);
            setIsCheckingPayment(false);

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      }
    } catch (error) {
      console.error('[Payment Poll] Error polling payment status:', error);
    }
  }, [orderId, getCustomerEmail]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!orderId) {
      setError('Ідентифікатор замовлення не знайдено');
      setLoading(false);
      return;
    }

    // Fetch order details
    const fetchOrder = async () => {
      try {
        const customerEmail = getCustomerEmail();

        if (!customerEmail) {
          throw new Error('Не вдалося знайти email для перевірки замовлення');
        }

        // Fetch order with email verification
        const response = await fetch(`/api/orders/${orderId}?email=${encodeURIComponent(customerEmail)}`);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Не вдалося підтвердити доступ до замовлення');
          }
          throw new Error('Не вдалося завантажити дані замовлення');
        }

        const data = await response.json();

        if (data.success && data.order) {
          const fetchedOrder = data.order as OrderWithItems;

          // Check if we need to poll for payment status (online payments pending)
          const isOnlinePayment = fetchedOrder.payment_method === 'liqpay' || fetchedOrder.payment_method === 'monobank';
          const isPending = fetchedOrder.payment_status === 'pending';

          if (isOnlinePayment && isPending) {
            // Start polling for payment status
            console.log('[Order Success] Payment pending, starting polling...');
            setIsCheckingPayment(true);
            pollingStartTimeRef.current = Date.now();

            // Set up polling interval
            pollingIntervalRef.current = setInterval(() => {
              pollPaymentStatus();
            }, POLLING_INTERVAL_MS);
          }

          setOrder(fetchedOrder);
        } else {
          throw new Error('Замовлення не знайдено');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'Помилка завантаження замовлення');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, getCustomerEmail, pollPaymentStatus]); // Removed clearCart and cartCleared from dependencies

  // Separate effect for cleanup and tracking - runs only once after order is loaded
  useEffect(() => {
    if (order && !cleanupInitiatedRef.current) {
      // Set ref immediately to prevent re-runs (before any async operations)
      cleanupInitiatedRef.current = true;

      console.log('[Order Success] Starting cleanup...');

      // Track successful purchase (only if paid)
      if (!purchaseTrackedRef.current && order.payment_status === 'paid') {
        try {
          // Convert order items to format expected by tracking (CartItem format)
          const trackingItems: CartItem[] = order.items.map((item, index) => ({
            id: `order-${order.id}-item-${index}`,
            product_id: item.product_id,
            name: item.product_name,
            price: parseFloat(item.unit_price.toString()),
            quantity: item.quantity,
            color: item.color,
            image_url: item.product_image_url,
          }));

          trackPurchase(
            order.order_number || order.id.toString(),
            trackingItems,
            parseFloat(order.total_amount.toString()),
            {
              paymentMethod: order.payment_method,
              deliveryMethod: order.delivery_method,
            }
          );

          purchaseTrackedRef.current = true;
          console.log('[Order Success] Purchase tracked successfully');
        } catch (trackError) {
          console.error('[Order Success] Failed to track purchase:', trackError);
        }
      }

      const performCleanup = async () => {
        // Clear cart
        try {
          await clearCart();
          console.log('[Order Success] Cart cleared successfully');
        } catch (cartError) {
          // Cart clearing may fail if already cleared - this is non-critical
          console.warn('[Order Success] Cart clearing failed (may already be cleared):', cartError);
        }

        // Clear saved checkout form data from localStorage
        try {
          localStorage.removeItem(CHECKOUT_STORAGE_KEY);
          console.log('[Order Success] Checkout form data cleared');
        } catch (storageError) {
          console.error('[Order Success] Error clearing checkout form data:', storageError);
        }

        // Clean up order-email mapping for this order
        try {
          const mappingData = localStorage.getItem(ORDER_EMAIL_MAPPING_KEY);
          if (mappingData && orderId) {
            const mapping = JSON.parse(mappingData);
            delete mapping[orderId];
            // Clean up old entries (older than 24 hours)
            const now = Date.now();
            Object.keys(mapping).forEach(key => {
              if (mapping[key].timestamp && (now - mapping[key].timestamp) > 24 * 60 * 60 * 1000) {
                delete mapping[key];
              }
            });
            if (Object.keys(mapping).length > 0) {
              localStorage.setItem(ORDER_EMAIL_MAPPING_KEY, JSON.stringify(mapping));
            } else {
              localStorage.removeItem(ORDER_EMAIL_MAPPING_KEY);
            }
          }
          console.log('[Order Success] Order-email mapping cleaned up');
        } catch (cleanupError) {
          console.error('[Order Success] Error cleaning up order-email mapping:', cleanupError);
        }
      };

      performCleanup();
    }
  }, [order, clearCart, orderId]);

  const handleContinueShopping = () => {
    router.push('/');
  };

  const handleTrackOrder = () => {
    // Placeholder for future tracking functionality
    alert('Функція відстеження замовлення буде доступна незабаром');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Завантаження деталей замовлення...</p>
        </div>
      </div>
    );
  }

  // Show payment checking state while polling
  if (isCheckingPayment && order) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Перевіряємо оплату...</p>
          <p className={styles.subText}>Це може зайняти до хвилини</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1>Помилка</h1>
          <p>{error || 'Замовлення не знайдено'}</p>
          <button className={styles.primaryButton} onClick={handleContinueShopping}>
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  const orderDate = formatUkrainianDate(order.created_at);
  const deliveryAddress = formatDeliveryAddress({
    city: order.delivery_city,
    street: order.delivery_street,
    building: order.delivery_building,
    apartment: order.delivery_apartment,
    postalCode: order.delivery_postal_code,
  });

  // Determine success message based on payment status
  const getSuccessMessage = () => {
    const isOnlinePayment = order.payment_method === 'liqpay' || order.payment_method === 'monobank';

    if (order.payment_status === 'paid') {
      return {
        icon: '✅',
        title: 'Оплата успішна!',
        subtitle: 'Дякуємо за Ваше замовлення. Оплату успішно отримано.'
      };
    } else if (order.payment_status === 'pending' && isOnlinePayment) {
      return {
        icon: '⏳',
        title: 'Очікуємо на оплату',
        subtitle: 'Ваше замовлення створено. Очікуємо підтвердження оплати.'
      };
    } else if (order.payment_status === 'failed') {
      return {
        icon: '❌',
        title: 'Оплата не вдалася',
        subtitle: 'На жаль, оплату не було завершено. Будь ласка, спробуйте ще раз або зв\'яжіться з нами.'
      };
    } else {
      return {
        icon: '✅',
        title: 'Дякуємо за Ваше замовлення!',
        subtitle: 'Ваше замовлення успішно створено.'
      };
    }
  };

  const successMessage = getSuccessMessage();

  return (
    <div className={styles.container}>
      <div className={styles.page}>
        {/* Success Header */}
        <div className={styles.header}>
          <div className={styles.successIcon}>{successMessage.icon}</div>
          <h1 className={styles.title}>{successMessage.title}</h1>
          <p className={styles.subtitle}>{successMessage.subtitle}</p>
        </div>

        {/* Order Content */}
        <div className={styles.content}>
          {/* Order Number and Status */}
          <section className={styles.section}>
            <div className={styles.orderHeader}>
              <div className={styles.orderNumber}>
                <span className={styles.label}>Номер замовлення:</span>
                <span className={styles.value}>{order.order_number}</span>
              </div>
              <div className={styles.statusBadge}>
                {getOrderStatusName(order.order_status)}
              </div>
            </div>
            <p className={styles.orderDate}>Дата замовлення: {orderDate}</p>
          </section>

          {/* Payment Status Alert */}
          {order.payment_status === 'pending' && (order.payment_method === 'liqpay' || order.payment_method === 'monobank') && (
            <section className={styles.alertSection}>
              <div className={styles.alert}>
                <div className={styles.alertIcon}>ℹ️</div>
                <div>
                  <p className={styles.alertTitle}>Очікуємо підтвердження оплати</p>
                  <p className={styles.alertText}>
                    Якщо ви вже здійснили оплату, підтвердження надійде протягом кількох хвилин.
                    Інформація про статус оплати буде відправлена на вашу електронну пошту.
                  </p>
                </div>
              </div>
            </section>
          )}

          {order.payment_status === 'failed' && (
            <section className={styles.alertSection}>
              <div className={`${styles.alert} ${styles.alertError}`}>
                <div className={styles.alertIcon}>⚠️</div>
                <div>
                  <p className={styles.alertTitle}>Оплата не пройшла</p>
                  <p className={styles.alertText}>
                    Будь ласка, зв'яжіться з нами для повторної спроби оплати або виберіть інший спосіб оплати.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Customer Information */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Отримувач</h2>
            <div className={styles.infoBlock}>
              <p className={styles.customerName}>
                {order.user_surname} {order.user_name}
              </p>
              <p className={styles.infoText}>{order.user_phone}</p>
              <p className={styles.infoText}>{order.user_email}</p>
            </div>
          </section>

          {/* Delivery Information */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Доставка</h2>
            <div className={styles.infoBlock}>
              <p className={styles.deliveryMethod}>
                {getDeliveryMethodName(order.delivery_method)}
              </p>
              {deliveryAddress && (
                <p className={styles.infoText}>{deliveryAddress}</p>
              )}
              {order.store_location && (
                <p className={styles.infoText}>{order.store_location}</p>
              )}
            </div>
          </section>

          {/* Payment Information */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Оплата</h2>
            <div className={styles.infoBlock}>
              <p className={styles.paymentMethod}>
                {getPaymentMethodName(order.payment_method)}
              </p>
              <div className={styles.paymentStatus}>
                <span>Статус оплати:</span>
                <span className={`${styles.statusText} ${styles[`status_${order.payment_status}`]}`}>
                  {order.payment_status === 'paid' ? 'Оплачено' :
                   order.payment_status === 'pending' ? 'Очікується' :
                   order.payment_status === 'failed' ? 'Не вдалося' : 'Повернуто'}
                </span>
              </div> {/* if its prepayment make prepayed amount status here*/}

              {/* {order.prepayment_amount > 0 && (
                // <>
                //   <p className={styles.prepaymentAmount}>
                //     Сума передплати: {formatUkrainianPrice(order.prepayment_amount)}
                //   </p>
                //   <div>
                //     <p className={styles.remainingAmount}>
                //       Залишок до сплати: {formatUkrainianPrice(order.total_amount - order.prepayment_amount)}
                //     </p>
                //   </div>
                // </>
              )} */}
            </div>
          </section>

          {/* Order Items */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Товари</h2>
            <OrderSummary items={order.items} />
          </section>

          {/* Order Total */}
          <section className={styles.section}>
            <div className={styles.totalSection}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Підсумок:</span>
                <span className={styles.totalValue}>
                  {formatUkrainianPrice(order.subtotal)}
                </span>
              </div>
              {order.discount_amount > 0 && (
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>
                    Знижка ({order.discount_percent}%):
                  </span>
                  <span className={`${styles.totalValue} ${styles.discount}`}>
                    -{formatUkrainianPrice(order.discount_amount)}
                  </span>
                </div>
              )}
              {order.delivery_cost > 0 && (
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Доставка:</span>
                  <span className={styles.totalValue}>
                    {formatUkrainianPrice(order.delivery_cost)}
                  </span>
                </div>
              )}
                
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span className={styles.totalLabel}>Сплачено:</span>
                <span className={styles.totalValue}>
                  {formatUkrainianPrice(order.prepayment_amount)}
                </span>
              </div>

              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span className={styles.totalLabel}>Залишок до сплати:</span>
                <span className={styles.totalValue}>
                  {formatUkrainianPrice(order.total_amount - order.prepayment_amount)}
                </span>
              </div>
            </div>
          </section>

          {/* Email Confirmation Notice */}
          <section className={styles.noticeSection}>
            <p className={styles.notice}>
              📧 Підтвердження замовлення відправлено на {order.user_email}
            </p>
          </section>
        </div>

        {/* Action Buttons */}
        <div className={styles.footer}>
          <button
            className={styles.secondaryButton}
            onClick={handleContinueShopping}
          >
            Продовжити покупки
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleTrackOrder}
          >
            Відслідкувати замовлення
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Order Success Page
 * Displayed after customer returns from payment gateway
 */
export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Завантаження...</p>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
