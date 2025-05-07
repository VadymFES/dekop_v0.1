// components/ProductGridSkeleton.tsx
import styles from "./productGridSkeleton.module.css";

const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className={styles.productGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`${styles.productCard} ${styles.skeletonCard}`}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.skeletonInfo}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonPrice}></div>
            <div className={styles.skeletonRating}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGridSkeleton;