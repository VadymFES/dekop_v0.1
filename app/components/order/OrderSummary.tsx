'use client';

import React from 'react';
import Image from 'next/image';
import type { OrderItem } from '@/app/lib/definitions';
import { formatUkrainianPrice } from '@/app/lib/order-utils';
import styles from './OrderSummary.module.css';

interface OrderSummaryProps {
  items: OrderItem[];
}

/**
 * Order Summary Component
 * Displays list of items in the order
 */
export default function OrderSummary({ items }: OrderSummaryProps) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Немає товарів у замовленні</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          {/* Product Image */}
          <div className={styles.imageWrapper}>
            {item.product_image_url ? (
              <Image
                src={item.product_image_url}
                alt={item.product_name}
                width={80}
                height={80}
                className={styles.image}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <span>Без фото</span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className={styles.details}>
            <h3 className={styles.productName}>{item.product_name}</h3>
            {item.product_article && (
              <p className={styles.article}>Арт. №{item.product_article}</p>
            )}
            {item.color && (
              <p className={styles.color}>Колір: {item.color}</p>
            )}
            <div className={styles.quantityPrice}>
              <span className={styles.quantity}>×{item.quantity}</span>
              <span className={styles.price}>
                {formatUkrainianPrice(item.total_price)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
