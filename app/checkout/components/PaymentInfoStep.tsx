'use client';

import React from 'react';
import { PAYMENT_OPTIONS, DEPOSIT_PAYMENT_OPTIONS, type PaymentMethod } from '../types';
import styles from './CheckoutSteps.module.css';

interface PaymentInfoStepProps {
  formData: {
    method: PaymentMethod;
    depositPaymentMethod?: 'liqpay' | 'monobank';
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
        <>
          <div className={styles.depositSection}>
            <h3 className={styles.depositTitle}>Оберіть спосіб оплати передплати (20%)</h3>
            <p className={styles.depositDescription}>
              Вам необхідно сплатити 20% від вартості замовлення зараз, решту оплатите при отриманні
            </p>

            <div className={styles.depositOptions}>
              {DEPOSIT_PAYMENT_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`${styles.depositCard} ${
                    formData.depositPaymentMethod === option.value ? styles.depositCardSelected : ''
                  }`}
                  onClick={() => onChange('depositPaymentMethod', option.value)}
                >
                  <div className={styles.depositIcon}>{option.icon}</div>
                  <div className={styles.depositLabel}>{option.label}</div>
                  <input
                    type="radio"
                    name="depositPaymentMethod"
                    value={option.value}
                    checked={formData.depositPaymentMethod === option.value}
                    onChange={() => onChange('depositPaymentMethod', option.value)}
                    className={styles.radioInput}
                  />
                </div>
              ))}
            </div>

            {errors.depositPaymentMethod && (
              <span className={styles.errorMessage}>{errors.depositPaymentMethod}</span>
            )}
          </div>

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              💰 Передплата: 20% від суми замовлення
              <br />
              💵 Залишок: оплата готівкою при отриманні товару
            </p>
          </div>
        </>
      )}
    </div>
  );
}
