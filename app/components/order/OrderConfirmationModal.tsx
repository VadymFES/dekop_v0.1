'use client';

import React from 'react';
import type { OrderWithItems } from '@/app/lib/definitions';
import {
  formatUkrainianDate,
  formatUkrainianPrice,
  getDeliveryMethodName,
  getPaymentMethodName,
  getOrderStatusName,
  formatDeliveryAddress
} from '@/app/lib/order-utils';
import OrderSummary from './OrderSummary';
import styles from './OrderConfirmationModal.module.css';

interface OrderConfirmationModalProps {
  order: OrderWithItems;
  isOpen: boolean;
  onClose: () => void;
  onContinueShopping: () => void;
}

/**
 * Order Confirmation Modal Component
 * Displays order details after successful payment
 */
export default function OrderConfirmationModal({
  order,
  isOpen,
  onClose,
  onContinueShopping
}: OrderConfirmationModalProps) {
  if (!isOpen) return null;

  const orderDate = formatUkrainianDate(order.created_at);
  const deliveryAddress = formatDeliveryAddress({
    city: order.delivery_city,
    street: order.delivery_street,
    building: order.delivery_building,
    apartment: order.delivery_apartment,
    postalCode: order.delivery_postal_code,
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTrackOrder = () => {
    // Placeholder for future tracking functionality
    alert('Функція відстеження замовлення буде доступна незабаром');
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Дякуємо за Ваше замовлення!</h1>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
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

          {/* Order Details */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Деталі замовлення</h2>
            <div className={styles.orderDetails}>
              <div className={styles.orderNumber}>
                <span>Замовлення {order.order_number}</span>
                <span className={styles.statusBadge}>
                  {getOrderStatusName(order.order_status)}
                </span>
              </div>
              <p className={styles.infoText}>Дата замовлення: {orderDate}</p>
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
              {order.prepayment_amount > 0 && (
                <>
                  <p className={styles.prepaymentAmount}>
                    Сума передплати: {formatUkrainianPrice(order.prepayment_amount)}
                  </p>
                  {order.payment_deadline && (
                    <p className={styles.infoText}>
                      Заплатіть до: {formatUkrainianDate(order.payment_deadline)}
                    </p>
                  )}
                </>
              )}
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
                <span className={styles.totalLabel}>Загальна вартість:</span>
                <span className={styles.totalValue}>
                  {formatUkrainianPrice(order.total_amount)}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <div className={styles.footer}>
          <button
            className={styles.secondaryButton}
            onClick={onContinueShopping}
          >
            Продовжити покупки
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleTrackOrder}
          >
            ВІДСЛІДКУВАТИ
          </button>
        </div>
      </div>
    </div>
  );
}
