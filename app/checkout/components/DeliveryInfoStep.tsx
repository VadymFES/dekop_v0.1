'use client';

import React from 'react';
import { DELIVERY_OPTIONS, type DeliveryMethod } from '../types';
import styles from './CheckoutSteps.module.css';

interface DeliveryInfoStepProps {
  formData: {
    method: DeliveryMethod;
    city?: string;
    street?: string;
    building?: string;
    apartment?: string;
    postalCode?: string;
    storeLocation?: string;
  };
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export default function DeliveryInfoStep({
  formData,
  onChange,
  errors
}: DeliveryInfoStepProps) {
  const showAddressFields = formData.method === 'nova_poshta' || formData.method === 'store_delivery';
  const showStoreLocation = formData.method === 'pickup';

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Спосіб доставки</h2>
      <p className={styles.stepDescription}>
        Оберіть зручний для вас спосіб доставки
      </p>

      {/* Delivery Method Selection */}
      <div className={styles.optionsGrid}>
        {DELIVERY_OPTIONS.map((option) => (
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
                name="deliveryMethod"
                value={option.value}
                checked={formData.method === option.value}
                onChange={() => onChange('method', option.value)}
                className={styles.radioInput}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Address Fields (for Nova Poshta and Courier) */}
      {showAddressFields && (
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="city" className={styles.label}>
              Місто <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
              value={formData.city || ''}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="Київ"
              required
            />
            {errors.city && (
              <span className={styles.errorMessage}>{errors.city}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="street" className={styles.label}>
              Вулиця <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="street"
              name="street"
              className={`${styles.input} ${errors.street ? styles.inputError : ''}`}
              value={formData.street || ''}
              onChange={(e) => onChange('street', e.target.value)}
              placeholder="Хрещатик"
              required
            />
            {errors.street && (
              <span className={styles.errorMessage}>{errors.street}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="building" className={styles.label}>
              Будинок <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="building"
              name="building"
              className={`${styles.input} ${errors.building ? styles.inputError : ''}`}
              value={formData.building || ''}
              onChange={(e) => onChange('building', e.target.value)}
              placeholder="1"
              required
            />
            {errors.building && (
              <span className={styles.errorMessage}>{errors.building}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="apartment" className={styles.label}>
              Квартира
            </label>
            <input
              type="text"
              id="apartment"
              name="apartment"
              className={styles.input}
              value={formData.apartment || ''}
              onChange={(e) => onChange('apartment', e.target.value)}
              placeholder="10"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="postalCode" className={styles.label}>
              Поштовий індекс
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              className={styles.input}
              value={formData.postalCode || ''}
              onChange={(e) => onChange('postalCode', e.target.value)}
              placeholder="01001"
            />
          </div>
        </div>
      )}

      {/* Store Location (for Pickup) */}
      {showStoreLocation && (
        <div className={styles.formGroup}>
          <label htmlFor="storeLocation" className={styles.label}>
            Оберіть магазин <span className={styles.required}>*</span>
          </label>
          <select
            id="storeLocation"
            name="storeLocation"
            className={`${styles.input} ${errors.storeLocation ? styles.inputError : ''}`}
            value={formData.storeLocation || ''}
            onChange={(e) => onChange('storeLocation', e.target.value)}
            required
          >
            <option value="">Оберіть магазин</option>
            <option value="Магазин Dekop - вул. Хрещатик, 1, Київ">
              Магазин Dekop - вул. Хрещатик, 1, Київ
            </option>
            <option value="Магазин Dekop - вул. Дерибасівська, 10, Одеса">
              Магазин Dekop - вул. Дерибасівська, 10, Одеса
            </option>
            <option value="Магазин Dekop - вул. Сумська, 25, Харків">
              Магазин Dekop - вул. Сумська, 25, Харків
            </option>
          </select>
          {errors.storeLocation && (
            <span className={styles.errorMessage}>{errors.storeLocation}</span>
          )}
        </div>
      )}
    </div>
  );
}
