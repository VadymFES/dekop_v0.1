import React from "react";
import styles from "./productGrid.module.css";
import skeletonStyles from "../carouselSkeleton/carouselSkeleton.module.css";

const ProductGridSkeleton: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bodyContentGrid}>
        {/* Product carousel skeleton */}
        <div className={styles.productGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div className={styles.productCardSlide} key={index}>
              <div className={skeletonStyles.skeletonCard}>
                <div className={skeletonStyles.skeletonImage}></div>
                <div className={skeletonStyles.skeletonDetails}>
                  <div className={skeletonStyles.skeletonInfo}>
                    <div className={skeletonStyles.skeletonTitle}></div>
                    <div className={skeletonStyles.skeletonRating}></div>
                  </div>
                  <div className={skeletonStyles.skeletonMeta}>
                    <div className={skeletonStyles.skeletonRatingRight}></div>
                    <div className={skeletonStyles.skeletonPrice}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Showcase image skeleton */}
        <div className={styles.specialProductShowcase}>
          <div className={skeletonStyles.skeletonImage} style={{ height: '100%', borderRadius: '8px' }}></div>
        </div>
      </div>

      {/* Mobile scroll buttons skeleton (hidden by media query on desktop) */}
      <div className={`${styles.scrollButtons} ${skeletonStyles.scrollButtons}`} style={{ marginTop: '1rem' }}>
        <div className={skeletonStyles.arrowScrollButton}>
          <svg
            width="34"
            height="24"
            viewBox="0 0 24 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.6663 7H1.33301M1.33301 7L9.33301 13M1.33301 7L9.33301 1"
              stroke="#ccc"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className={skeletonStyles.dotsContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 0 ? `${skeletonStyles.dot} ${skeletonStyles.activeDot}` : skeletonStyles.dot}
            />
          ))}
        </div>

        <div className={skeletonStyles.arrowScrollButton}>
          <svg
            width="34"
            height="24"
            viewBox="0 0 24 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.33301 7H22.6663M22.6663 7L14.6663 1M22.6663 7L14.6663 13"
              stroke="#ccc"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ProductGridSkeleton;
