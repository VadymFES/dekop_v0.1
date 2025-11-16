// components/ui/gridSkeleton/ProductGridSkeleton.tsx
import styles from "./productGridSkeleton.module.css";

const ProductGridSkeleton = ({ count = 6, isLoadingMore = false }: { count?: number, isLoadingMore?: boolean }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.skeletonInfo}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonPrice}></div>
            <div className={styles.skeletonRating}></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ProductGridSkeleton;