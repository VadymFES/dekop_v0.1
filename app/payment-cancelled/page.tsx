'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { OrderWithItems } from '@/app/lib/definitions';
import {
  formatUkrainianDate,
  formatUkrainianPrice,
  getDeliveryMethodName,
  getPaymentMethodName,
} from '@/app/lib/order-utils';
import { trackError } from '@/app/lib/gtm-analytics';
import styles from './page.module.css';

/**
 * Payment Cancelled Page Content Component
 */
function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const cancelledTrackedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setError('Ідентифікатор замовлення не знайдено');
      setLoading(false);
      return;
    }

    // Fetch order details
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);

        if (!response.ok) {
          throw new Error('Не вдалося завантажити дані замовлення');
        }

        const data = await response.json();

        if (data.success && data.order) {
          setOrder(data.order);

          // Track payment cancellation
          if (!cancelledTrackedRef.current) {
            try {
              trackError(
                'payment_cancelled',
                `Payment cancelled for order ${data.order.order_number}`,
                'payment-cancelled-page'
              );

              // Also push a custom event for cancelled checkout
              if (typeof window !== 'undefined' && (window as any).dataLayer) {
                (window as any).dataLayer.push({
                  event: 'payment_cancelled',
                  order_id: data.order.id,
                  order_number: data.order.order_number,
                  payment_method: data.order.payment_method,
                  order_value: parseFloat(data.order.total_amount.toString()),
                  currency: 'UAH',
                  timestamp: new Date().toISOString(),
                });
              }

              cancelledTrackedRef.current = true;
              console.log('[Payment Cancelled] Cancellation tracked successfully');
            } catch (trackError) {
              console.error('[Payment Cancelled] Failed to track:', trackError);
            }
          }
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
  }, [orderId]);

  const handleReturnToCheckout = () => {
    router.push('/checkout');
  };

  const handleReturnToCart = () => {
    router.push('/cart');
  };

  const handleRetryPayment = async () => {
    if (!order) return;

    setIsRetrying(true);

    try {
      const amount = order.prepayment_amount > 0 ? order.prepayment_amount : order.total_amount;
      const description = order.prepayment_amount > 0
        ? `Передплата 20% замовлення ${order.order_number} (оплата при отриманні)`
        : `Оплата замовлення ${order.order_number}`;

      // Retry payment based on payment method
      if (order.payment_method === 'liqpay' ||
          (order.payment_method === 'cash_on_delivery' && order.prepayment_amount > 0)) {
        const paymentResponse = await fetch('/api/payments/liqpay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            orderId: order.id,
            orderNumber: order.order_number,
            description: description,
            customerEmail: order.user_email,
            resultUrl: `${window.location.origin}/order-success?orderId=${order.id}`,
            serverUrl: `${window.location.origin}/api/webhooks/liqpay`
          })
        });

        if (!paymentResponse.ok) {
          throw new Error('Помилка при створенні платежу');
        }

        const liqpayPayment = await paymentResponse.json();

        if (liqpayPayment.success && liqpayPayment.checkoutUrl) {
          // Create form and redirect to LiqPay
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = liqpayPayment.checkoutUrl;
          form.style.display = 'none';

          const dataInput = document.createElement('input');
          dataInput.name = 'data';
          dataInput.value = liqpayPayment.data;
          form.appendChild(dataInput);

          const signatureInput = document.createElement('input');
          signatureInput.name = 'signature';
          signatureInput.value = liqpayPayment.signature;
          form.appendChild(signatureInput);

          document.body.appendChild(form);
          form.submit();
        }
      } else if (order.payment_method === 'monobank') {
        const paymentResponse = await fetch('/api/payments/monobank/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.user_email,
            resultUrl: `${window.location.origin}/order-success?orderId=${order.id}`,
            serverUrl: `${window.location.origin}/api/webhooks/monobank`
          })
        });

        if (!paymentResponse.ok) {
          throw new Error('Помилка при створенні платежу');
        }

        const monobankPayment = await paymentResponse.json();

        if (monobankPayment.success && monobankPayment.pageUrl) {
          window.location.href = monobankPayment.pageUrl;
        }
      }
    } catch (error) {
      console.error('Retry payment error:', error);
      alert('Помилка при спробі повторної оплати. Будь ласка, спробуйте ще раз або зв\'яжіться з нами.');
      setIsRetrying(false);
    }
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
          <button className={styles.primaryButton} onClick={handleReturnToCart}>
            Повернутися до кошика
          </button>
        </div>
      </div>
    );
  }

  const orderDate = formatUkrainianDate(order.created_at);
  const paymentAmount = order.prepayment_amount > 0
    ? order.prepayment_amount
    : order.total_amount;

  return (
    <div className={styles.container}>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.cancelIcon}>❌</div>
          <h1 className={styles.title}>Оплату скасовано</h1>
          <p className={styles.subtitle}>
            Ви скасували процес оплати. Ваше замовлення було збережено, і ви можете завершити оплату пізніше.
          </p>
        </div>

        {/* Order Info */}
        <div className={styles.content}>
          <section className={styles.orderInfo}>
            <div className={styles.orderHeader}>
              <div>
                <span className={styles.label}>Номер замовлення:</span>
                <span className={styles.orderNumber}>{order.order_number}</span>
              </div>
              <div>
                <span className={styles.label}>Дата:</span>
                <span className={styles.value}>{orderDate}</span>
              </div>
            </div>
          </section>

          {/* Alert */}
          <section className={styles.alertSection}>
            <div className={styles.alert}>
              <div className={styles.alertIcon}>ℹ️</div>
              <div>
                <p className={styles.alertTitle}>Що далі?</p>
                <p className={styles.alertText}>
                  Ваше замовлення створено, але оплата не була завершена.
                  Ви можете повторити спробу оплати, повернутися до кошика для внесення змін,
                  або звернутися до нашої служби підтримки.
                </p>
              </div>
            </div>
          </section>

          {/* Payment Details */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Деталі оплати</h2>
            <div className={styles.paymentDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Спосіб оплати:</span>
                <span className={styles.detailValue}>
                  {getPaymentMethodName(order.payment_method)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Сума до сплати:</span>
                <span className={styles.detailValue}>
                  {formatUkrainianPrice(paymentAmount)}
                </span>
              </div>
              {order.prepayment_amount > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Залишок при отриманні:</span>
                  <span className={styles.detailValue}>
                    {formatUkrainianPrice(order.total_amount - order.prepayment_amount)}
                  </span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Статус оплати:</span>
                <span className={styles.statusPending}>Очікується</span>
              </div>
            </div>
          </section>

          {/* Delivery Info */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Доставка</h2>
            <div className={styles.infoBlock}>
              <p className={styles.infoText}>
                {getDeliveryMethodName(order.delivery_method)}
              </p>
              {order.delivery_city && (
                <p className={styles.infoText}>
                  {order.delivery_city}, {order.delivery_street} {order.delivery_building}
                  {order.delivery_apartment && `, кв. ${order.delivery_apartment}`}
                </p>
              )}
              {order.store_location && (
                <p className={styles.infoText}>{order.store_location}</p>
              )}
            </div>
          </section>

          {/* Contact Info */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Контактна інформація</h2>
            <div className={styles.infoBlock}>
              <p className={styles.infoText}>
                {order.user_surname} {order.user_name}
              </p>
              <p className={styles.infoText}>{order.user_phone}</p>
              <p className={styles.infoText}>{order.user_email}</p>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <div className={styles.footer}>
          <button
            className={styles.tertiaryButton}
            onClick={handleReturnToCart}
            disabled={isRetrying}
          >
            Повернутися до кошика
          </button>
          <button
            className={styles.secondaryButton}
            onClick={handleReturnToCheckout}
            disabled={isRetrying}
          >
            Змінити замовлення
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleRetryPayment}
            disabled={isRetrying}
          >
            {isRetrying ? 'Обробка...' : 'Повторити оплату'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Cancelled Page
 * Displayed when customer cancels payment on external gateway
 */
export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Завантаження...</p>
        </div>
      </div>
    }>
      <PaymentCancelledContent />
    </Suspense>
  );
}
