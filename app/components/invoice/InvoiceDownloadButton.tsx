// app/components/invoice/InvoiceDownloadButton.tsx
'use client';

import React, { useState } from 'react';
import { downloadInvoicePDF, previewInvoicePDF } from '@/app/lib/invoice/invoice-generator';
import type { InvoiceData } from '@/app/lib/types/invoice';
import styles from './InvoiceDownloadButton.module.css';

interface InvoiceDownloadButtonProps {
  orderId: string;
  orderNumber?: string;
  variant?: 'primary' | 'secondary';
  showPreview?: boolean;
  className?: string;
}

export const InvoiceDownloadButton: React.FC<InvoiceDownloadButtonProps> = ({
  orderId,
  orderNumber,
  variant = 'secondary',
  showPreview = false,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  /**
   * Fetch invoice data from API
   */
  const fetchInvoiceData = async (): Promise<InvoiceData> => {
    if (invoiceData) {
      return invoiceData;
    }

    const response = await fetch(`/api/orders/${orderId}/invoice`);

    if (!response.ok) {
      throw new Error('Не вдалося завантажити дані рахунку');
    }

    const data = await response.json();

    if (!data.success || !data.invoice) {
      throw new Error('Дані рахунку не знайдено');
    }

    setInvoiceData(data.invoice);
    return data.invoice;
  };

  /**
   * Handle invoice download
   */
  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const invoice = await fetchInvoiceData();
      await downloadInvoicePDF(invoice);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setError(err instanceof Error ? err.message : 'Помилка завантаження рахунку');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle invoice preview
   */
  const handlePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const invoice = await fetchInvoiceData();
      await previewInvoicePDF(invoice);
    } catch (err) {
      console.error('Error previewing invoice:', err);
      setError(err instanceof Error ? err.message : 'Помилка перегляду рахунку');
    } finally {
      setLoading(false);
    }
  };

  const buttonClass = `${styles.button} ${variant === 'primary' ? styles.primary : styles.secondary} ${className}`;

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        <button
          className={buttonClass}
          onClick={handleDownload}
          disabled={loading}
          aria-label="Завантажити рахунок-фактуру"
        >
          {loading ? (
            <>
              <span className={styles.spinner}></span>
              <span>Генерація рахунку...</span>
            </>
          ) : (
            <>
              <svg
                className={styles.icon}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Завантажити рахунок-фактуру</span>
            </>
          )}
        </button>

        {showPreview && (
          <button
            className={`${styles.button} ${styles.previewButton}`}
            onClick={handlePreview}
            disabled={loading}
            aria-label="Переглянути рахунок-фактуру"
            title="Переглянути в новій вкладці"
          >
            <svg
              className={styles.icon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <svg
            className={styles.errorIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default InvoiceDownloadButton;
