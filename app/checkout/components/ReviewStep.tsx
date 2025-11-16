'use client';

import React from 'react';
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS, type CheckoutFormData } from '../types';
import { formatUkrainianPrice } from '@/app/lib/order-utils';
import type { CartItem } from '@/app/lib/definitions';
import styles from './CheckoutSteps.module.css';

interface ReviewStepProps {
  formData: CheckoutFormData;
  cart: CartItem[];
  cartTotal: number;
  onEdit: (step: number) => void;
}

export default function ReviewStep({
  formData,
  cart,
  cartTotal,
  onEdit
}: ReviewStepProps) {
  // Get delivery method label
  const deliveryOption = DELIVERY_OPTIONS.find(
    (option) => option.value === formData.deliveryInfo.method
  );

  // Get payment method label
  const paymentOption = PAYMENT_OPTIONS.find(
    (option) => option.value === formData.paymentInfo.method
  );

  // Calculate prepayment for cash on delivery
  const prepaymentAmount = formData.paymentInfo.method === 'cash_on_delivery'
    ? Math.round(cartTotal * 0.2)
    : 0;

  const remainingAmount = formData.paymentInfo.method === 'cash_on_delivery'
    ? cartTotal - prepaymentAmount
    : 0;

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Перевірте ваше замовлення</h2>
      <p className={styles.stepDescription}>
        Переконайтесь, що всі дані введені правильно перед оплатою
      </p>

      <div className={styles.reviewContainer}>
        {/* Customer Information */}
        <div className={styles.reviewSection}>
          <div className={styles.reviewHeader}>
            <h3 className={styles.reviewSectionTitle}>Особисті дані</h3>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => onEdit(1)}
            >
              Редагувати
            </button>
          </div>
          <div className={styles.reviewContent}>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Ім'я та прізвище:</span>
              <span className={styles.reviewValue}>
                {formData.customerInfo.firstName} {formData.customerInfo.lastName}
              </span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Телефон:</span>
              <span className={styles.reviewValue}>{formData.customerInfo.phone}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Email:</span>
              <span className={styles.reviewValue}>{formData.customerInfo.email}</span>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className={styles.reviewSection}>
          <div className={styles.reviewHeader}>
            <h3 className={styles.reviewSectionTitle}>Доставка</h3>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => onEdit(2)}
            >
              Редагувати
            </button>
          </div>
          <div className={styles.reviewContent}>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Спосіб доставки:</span>
              <span className={styles.reviewValue}>
                {deliveryOption?.icon} {deliveryOption?.label}
              </span>
            </div>
            {formData.deliveryInfo.method === 'pickup' ? (
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Магазин:</span>
                <span className={styles.reviewValue}>{formData.deliveryInfo.storeLocation}</span>
              </div>
            ) : (
              <>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Адреса:</span>
                  <span className={styles.reviewValue}>
                    {formData.deliveryInfo.city}, вул. {formData.deliveryInfo.street},
                    буд. {formData.deliveryInfo.building}
                    {formData.deliveryInfo.apartment && `, кв. ${formData.deliveryInfo.apartment}`}
                    {formData.deliveryInfo.postalCode && `, ${formData.deliveryInfo.postalCode}`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div className={styles.reviewSection}>
          <div className={styles.reviewHeader}>
            <h3 className={styles.reviewSectionTitle}>Оплата</h3>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => onEdit(3)}
            >
              Редагувати
            </button>
          </div>
          <div className={styles.reviewContent}>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>Спосіб оплати:</span>
              <span className={styles.reviewValue}>
                {paymentOption?.icon} {paymentOption?.label}
              </span>
            </div>
            {formData.paymentInfo.method === 'cash_on_delivery' && (
              <>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Передплата (20%):</span>
                  <span className={styles.reviewValue}>
                    {formatUkrainianPrice(prepaymentAmount)} через{' '}
                    {formData.paymentInfo.depositPaymentMethod === 'liqpay' ? 'LiqPay' : 'Monobank'}
                  </span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>До сплати при отриманні:</span>
                  <span className={styles.reviewValue}>
                    {formatUkrainianPrice(remainingAmount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className={styles.reviewSection}>
          <div className={styles.reviewHeader}>
            <h3 className={styles.reviewSectionTitle}>Товари в замовленні</h3>
            <span className={styles.reviewItemCount}>{cart.length} {cart.length === 1 ? 'товар' : 'товари'}</span>
          </div>
          <div className={styles.reviewContent}>
            {cart.map((item) => (
              <div key={item.id} className={styles.reviewItemRow}>
                <div className={styles.reviewItemInfo}>
                  <span className={styles.reviewItemName}>{item.name}</span>
                  {item.color && (
                    <span className={styles.reviewItemColor}>Колір: {item.color}</span>
                  )}
                </div>
                <div className={styles.reviewItemPricing}>
                  <span className={styles.reviewItemQuantity}>×{item.quantity}</span>
                  <span className={styles.reviewItemPrice}>
                    {formatUkrainianPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className={styles.reviewSection}>
          <div className={styles.reviewTotals}>
            <div className={styles.reviewTotalRow}>
              <span className={styles.reviewTotalLabel}>Підсумок:</span>
              <span className={styles.reviewTotalValue}>{formatUkrainianPrice(cartTotal)}</span>
            </div>
            <div className={styles.reviewTotalRow}>
              <span className={styles.reviewTotalLabel}>Доставка:</span>
              <span className={styles.reviewTotalValue}>За тарифами перевізника</span>
            </div>
            <div className={`${styles.reviewTotalRow} ${styles.reviewGrandTotal}`}>
              <span className={styles.reviewTotalLabel}>Всього:</span>
              <span className={styles.reviewTotalValue}>{formatUkrainianPrice(cartTotal)}</span>
            </div>
            {formData.paymentInfo.method === 'cash_on_delivery' && (
              <div className={styles.reviewPaymentNote}>
                <p className={styles.reviewNoteText}>
                  💳 Зараз до сплати: {formatUkrainianPrice(prepaymentAmount)} (передплата 20%)
                </p>
                <p className={styles.reviewNoteText}>
                  💵 При отриманні: {formatUkrainianPrice(remainingAmount)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Important Notice */}
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            ℹ️ Після натискання кнопки "Підтвердити та оплатити" ви будете перенаправлені на сторінку оплати.
            Після успішної оплати ви отримаєте підтвердження на email.
          </p>
        </div>
      </div>
    </div>
  );
}
