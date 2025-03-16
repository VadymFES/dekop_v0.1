import React from 'react';
import styles from './reviews.module.css';
import { Review } from '@/app/lib/definitions';

interface ProductReviewsProps {
  reviews: Review[] | undefined; // Allow reviews to be undefined
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ reviews = [] }) => { // Default to empty array
  return (
    <section className={styles.reviewSection}>
      <h2 className={styles.reviewTitle}>Відгуки ({reviews.length})</h2>
      <div className={styles.reviewList}>
        {reviews.length === 0 ? (
          <p className={styles.noReviews}>Відгуків ще немає</p>
        ) : (
          reviews.map((review, index) => (
            <div key={index} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <strong>{review.user_name}</strong>
                <span>{new Date(review.created_at).toLocaleDateString('uk-UA')}</span>
              </div>
              <div className={styles.rating}>
                {'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}
              </div>
              <p>{review.comment}</p>
            </div>
          ))
        )}
      </div>
      <div className={styles.reviewFooter}>
          {/* //show more reviews// */}
      </div>
    </section>
  );
};

export default ProductReviews;
