'use client';

import React from 'react';
import styles from './CheckoutSteps.module.css';

interface CustomerInfoStepProps {
  formData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}

export default function CustomerInfoStep({
  formData,
  onChange,
  errors
}: CustomerInfoStepProps) {
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Особисті дані</h2>
      <p className={styles.stepDescription}>
        Введіть ваші контактні дані для зв'язку
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="firstName" className={styles.label}>
            Ім'я <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="Введіть ваше ім'я"
            required
          />
          {errors.firstName && (
            <span className={styles.errorMessage}>{errors.firstName}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="lastName" className={styles.label}>
            Прізвище <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Введіть ваше прізвище"
            required
          />
          {errors.lastName && (
            <span className={styles.errorMessage}>{errors.lastName}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>
            Телефон <span className={styles.required}>*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+380501234567"
            required
          />
          {errors.phone && (
            <span className={styles.errorMessage}>{errors.phone}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email <span className={styles.required}>*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="example@email.com"
            required
          />
          {errors.email && (
            <span className={styles.errorMessage}>{errors.email}</span>
          )}
        </div>
      </div>
    </div>
  );
}
