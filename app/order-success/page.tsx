'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { OrderWithItems } from '@/app/lib/definitions';
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
import { logger } from '@/app/lib/logger';
import styles from './page.module.css';

// LocalStorage key for checkout form data (same as in checkout page)
const CHECKOUT_STORAGE_KEY = 'dekop_checkout_form';
const ORDER_EMAIL_MAPPING_KEY = 'dekop_order_email_mapping';

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

  // Use ref to track cleanup status to prevent infinite loops
  const cleanupInitiatedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setError('Ідентифікатор замовлення не знайдено');
      setLoading(false);
      return;
    }

    // Fetch order details
    const fetchOrder = async () => {
      try {
        // Get customer email - try multiple sources in order of preference
        let customerEmail: string | null = null;

        // 1. First, check order-email mapping (persists through payment flow)
        try {
          const mappingData = localStorage.getItem(ORDER_EMAIL_MAPPING_KEY);
          if (mappingData) {
            const mapping = JSON.parse(mappingData);
            const orderData = mapping[orderId];
            // Email is stored as an object with email and timestamp
            customerEmail = orderData?.email || null;
          }
        } catch (error) {
          logger.error('Error reading order-email mapping', error instanceof Error ? error : new Error(String(error)), { component: 'OrderSuccessPage' });
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
            logger.error('Error reading checkout data from localStorage', storageError instanceof Error ? storageError : new Error(String(storageError)), { component: 'OrderSuccessPage' });
          }
        }

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
          setOrder(data.order);
        } else {
          throw new Error('Замовлення не знайдено');
        }
      } catch (err) {
        logger.error('Error fetching order', err instanceof Error ? err : new Error(String(err)), { component: 'OrderSuccessPage' });
        setError(err instanceof Error ? err.message : 'Помилка завантаження замовлення');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, searchParams]); // Removed clearCart and cartCleared from dependencies

  // Separate effect for cleanup - runs only once after order is loaded
  useEffect(() => {
    if (order && !cleanupInitiatedRef.current) {
      // Set ref immediately to prevent re-runs (before any async operations)
      cleanupInitiatedRef.current = true;

      logger.info('Starting cleanup', { component: 'OrderSuccessPage' });

      const performCleanup = async () => {
        // Clear cart
        try {
          await clearCart();
          logger.info('Cart cleared successfully', { component: 'OrderSuccessPage' });
        } catch (cartError) {
          // Cart clearing may fail if already cleared - this is non-critical
          logger.warn('Cart clearing failed (may already be cleared)', { component: 'OrderSuccessPage', error: cartError });
        }

        // Clear saved checkout form data from localStorage
        try {
          localStorage.removeItem(CHECKOUT_STORAGE_KEY);
          logger.debug('Checkout form data cleared', { component: 'OrderSuccessPage' });
        } catch (storageError) {
          logger.error('Error clearing checkout form data', storageError instanceof Error ? storageError : new Error(String(storageError)), { component: 'OrderSuccessPage' });
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
          logger.debug('Order-email mapping cleaned up', { component: 'OrderSuccessPage' });
        } catch (cleanupError) {
          logger.error('Error cleaning up order-email mapping', cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)), { component: 'OrderSuccessPage' });
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
    if (order.payment_status === 'paid') {
      return {
        icon: '✅',
        title: 'Оплата успішна!',
        subtitle: 'Дякуємо за Ваше замовлення. Оплату успішно отримано.'
      };
    } else if (order.payment_status === 'pending' && order.payment_method === 'liqpay') {
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
          {order.payment_status === 'pending' && order.payment_method === 'liqpay' && (
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
