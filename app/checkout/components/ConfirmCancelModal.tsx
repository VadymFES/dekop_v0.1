'use client';

import React, { useEffect } from 'react';
import styles from './ConfirmCancelModal.module.css';

interface ConfirmCancelModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation Modal for canceling checkout
 */
export default function ConfirmCancelModal({
  isOpen,
  onConfirm,
  onCancel
}: ConfirmCancelModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Скасувати оформлення замовлення?</h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Ви впевнені, що хочете скасувати оформлення замовлення?
            Всі введені дані буде очищено, але товари залишаться в кошику.
          </p>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.secondaryButton}
            onClick={onCancel}
          >
            Ні, продовжити оформлення
          </button>
          <button
            className={styles.primaryButton}
            onClick={onConfirm}
          >
            Так, скасувати
          </button>
        </div>
      </div>
    </div>
  );
}
