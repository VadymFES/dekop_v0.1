// pages/catalog/components/FiltersSkeleton.tsx
import styles from "./filtersSkeleton.module.css";

const FiltersSkeleton = () => {
  return (
    <div className={styles.filtersSkeleton}>
      {/* Category select skeleton */}
      <div className={styles.skeletonCategorySelect}>
        <div className={styles.skeletonLabel}></div>
        <div className={styles.skeletonSelect}></div>
      </div>

      {/* Filter sections skeleton (simulating 3 filter groups) */}
      {[1, 2, 3].map((_, index) => (
        <div key={index} className={styles.skeletonFilterSection}>
          <div className={styles.skeletonTitle}></div>
          <ul className={styles.skeletonFilterList}>
            {[1, 2, 3, 4].map((_, i) => (
              <li key={i} className={styles.skeletonFilterItem}>
                <div className={styles.skeletonCheckbox}></div>
                <div className={styles.skeletonOption}></div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default FiltersSkeleton;