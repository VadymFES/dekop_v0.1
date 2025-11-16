// components/ui/gridSkeleton/ProductGridSkeleton.tsx
import styles from "./productGridSkeleton.module.css";

const ProductGridSkeleton = ({ count = 6, isLoadingMore = false }: { count?: number, isLoadingMore?: boolean }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonImageWrapper}>
            <div className={styles.skeletonImage}></div>

            {/* Favorite button placeholder */}
            <div className={styles.skeletonFavoriteButton}></div>

            {/* Labels placeholder (bottom-right badges) */}
            <div className={styles.skeletonLabels}>
              <div className={styles.skeletonLabel}></div>
            </div>
          </div>

          <div className={styles.skeletonDetails}>
            <div className={styles.skeletonInfo}>
              <div className={styles.skeletonName}></div>
              <div className={styles.skeletonCategory}></div>
            </div>
            <div className={styles.skeletonMeta}>
              <div className={styles.skeletonRating}></div>
              <div className={styles.skeletonPrice}></div>
            </div>
          </div>

          {/* Add to cart button placeholder */}
          <div className={styles.skeletonButton}></div>
        </div>
      ))}
    </>
  );
};

export default ProductGridSkeleton;