'use client';

import React from 'react';
import { PAYMENT_OPTIONS, type PaymentMethod } from '../types';
import styles from './CheckoutSteps.module.css';

interface PaymentInfoStepProps {
  formData: {
    method: PaymentMethod;
  };
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export default function PaymentInfoStep({
  formData,
  onChange,
  errors
}: PaymentInfoStepProps) {
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Спосіб оплати</h2>
      <p className={styles.stepDescription}>
        Оберіть зручний для вас спосіб оплати
      </p>

      {/* Payment Method Selection */}
      <div className={styles.optionsGrid}>
        {PAYMENT_OPTIONS.map((option) => (
          <div
            key={option.value}
            className={`${styles.optionCard} ${
              formData.method === option.value ? styles.optionCardSelected : ''
            }`}
            onClick={() => onChange('method', option.value)}
          >
            <div className={styles.optionIcon}>{option.icon}</div>
            <div className={styles.optionContent}>
              <h3 className={styles.optionTitle}>{option.label}</h3>
              <p className={styles.optionDescription}>{option.description}</p>
            </div>
            <div className={styles.optionRadio}>
              <input
                type="radio"
                name="paymentMethod"
                value={option.value}
                checked={formData.method === option.value}
                onChange={() => onChange('method', option.value)}
                className={styles.radioInput}
              />
            </div>
          </div>
        ))}
      </div>

      {errors.method && (
        <span className={styles.errorMessage}>{errors.method}</span>
      )}

      {/* Payment Info Notice */}
      {formData.method === 'liqpay' && (
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            💳 Безпечна оплата через LiqPay. Ваші дані карти захищені.
          </p>
        </div>
      )}

      {formData.method === 'monobank' && (
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            🏦 Після підтвердження замовлення ви будете перенаправлені на сторінку Monobank для оплати.
          </p>
        </div>
      )}

      {formData.method === 'cash_on_delivery' && (
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            💵 Оплата готівкою при отриманні товару. Необхідна передплата 20% через LiqPay.
          </p>
        </div>
      )}
    </div>
  );
}
