'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  formatUkrainianDate,
  formatUkrainianPrice,
  getOrderStatusName,
  getPaymentStatusName,
  getPaymentMethodName,
} from '@/app/lib/order-utils';
import styles from './page.module.css';

interface LookupOrder {
  id: string;
  order_number: string;
  payment_status: string;
  order_status: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function OrderLookupPage() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<LookupOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrders([]);
    setSearched(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Введіть адресу електронної пошти');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Помилка пошуку');
      }

      setOrders(data.orders || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка сервера. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Пошук замовлення</h1>
          <p className={styles.subtitle}>
            Введіть адресу електронної пошти, яку ви вказали при оформленні замовлення
          </p>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Електронна пошта
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className={styles.input}
                disabled={loading}
                required
              />
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? 'Пошук...' : 'Знайти замовлення'}
            </button>
          </form>

          {searched && orders.length === 0 && (
            <div className={styles.emptyState}>
              <p>За цією адресою замовлень не знайдено.</p>
              <p className={styles.emptyHint}>
                Переконайтеся, що вказали правильну адресу або{' '}
                <Link href="/" className={styles.link}>поверніться на головну</Link>.
              </p>
            </div>
          )}

          {orders.length > 0 && (
            <div className={styles.ordersList}>
              <h2 className={styles.ordersTitle}>
                Знайдено замовлень: {orders.length}
              </h2>
              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderCardHeader}>
                    <span className={styles.orderNumber}>{order.order_number}</span>
                    <span className={styles.orderDate}>
                      {formatUkrainianDate(order.created_at)}
                    </span>
                  </div>
                  <div className={styles.orderCardBody}>
                    <div className={styles.orderDetail}>
                      <span className={styles.detailLabel}>Статус замовлення:</span>
                      <span className={styles.detailValue}>{getOrderStatusName(order.order_status)}</span>
                    </div>
                    <div className={styles.orderDetail}>
                      <span className={styles.detailLabel}>Статус оплати:</span>
                      <span className={`${styles.detailValue} ${styles[`payStatus_${order.payment_status}`]}`}>
                        {getPaymentStatusName(order.payment_status)}
                      </span>
                    </div>
                    <div className={styles.orderDetail}>
                      <span className={styles.detailLabel}>Спосіб оплати:</span>
                      <span className={styles.detailValue}>{getPaymentMethodName(order.payment_method)}</span>
                    </div>
                    <div className={styles.orderDetail}>
                      <span className={styles.detailLabel}>Сума:</span>
                      <span className={styles.detailValue}>{formatUkrainianPrice(order.total_amount)}</span>
                    </div>
                  </div>
                  <div className={styles.orderCardFooter}>
                    <Link
                      href={`/order-success?orderId=${order.id}&email=${encodeURIComponent(email.trim())}`}
                      className={styles.viewOrderButton}
                    >
                      Переглянути замовлення
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>
            ← Повернутися на головну
          </Link>
        </div>
      </div>
    </div>
  );
}
