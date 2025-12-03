'use client';

/**
 * Reusable confirmation modal component
 */

import { useEffect, useCallback } from 'react';
import styles from '../styles/admin.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemCount?: number;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  itemCount,
  confirmText = 'Підтвердити',
  cancelText = 'Скасувати',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    }
  }, [onCancel, isLoading]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const variantColors = {
    danger: { bg: '#f44336', hover: '#d32f2f' },
    warning: { bg: '#ff9800', hover: '#f57c00' },
    info: { bg: '#2196f3', hover: '#1976d2' },
  };

  const colors = variantColors[variant];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {variant === 'danger' && <span style={{ color: colors.bg }}>⚠️</span>}
            {variant === 'warning' && <span style={{ color: colors.bg }}>⚡</span>}
            {variant === 'info' && <span style={{ color: colors.bg }}>ℹ️</span>}
            {title}
          </h3>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.5',
          }}>
            {message}
          </p>
          {itemCount !== undefined && itemCount > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: variant === 'danger' ? '#ffebee' : '#fff3e0',
              borderRadius: '4px',
              fontSize: '14px',
              color: variant === 'danger' ? '#c62828' : '#e65100',
              fontWeight: '500',
            }}>
              Буде видалено: {itemCount} {getItemWord(itemCount)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={styles.buttonSecondary}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: isLoading ? '#ccc' : colors.bg,
              color: 'white',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {isLoading ? 'Видалення...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function getItemWord(count: number): string {
  if (count === 1) return 'елемент';
  if (count >= 2 && count <= 4) return 'елементи';
  return 'елементів';
}
