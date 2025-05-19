"use client";

import React from "react";
import styles from "./productGridSkeleton.module.css";

const ProductGridSkeleton = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bodyContentGrid}>
        {/* Product Grid Skeleton */}
        <div className={styles.productGrid}>
          {[...Array(6)].map((_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonText} />
              <div className={styles.skeletonText} />
            </div>
          ))}
        </div>

        {/* Special Showcase Skeleton */}
        <div className={styles.specialProductShowcase}>
          <div className={styles.skeletonShowcase} />
        </div>
        </div>
      </div>
  );
};

export default ProductGridSkeleton;
