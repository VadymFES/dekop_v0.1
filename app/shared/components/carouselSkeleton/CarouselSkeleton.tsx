import React from "react";
import styles from "./carouselSkeleton.module.css";

interface CarouselSkeletonProps {
  count?: number;
}

const CarouselSkeleton: React.FC<CarouselSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className={styles.wrapper}>
      {/* Scrollable container */}
      <div className={styles.carouselContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <div className={styles.productCardSlide} key={index}>
            <div className={styles.skeletonCard}>
              <div className={styles.skeletonImage}></div>
              <div className={styles.skeletonDetails}>
                <div className={styles.skeletonInfo}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonRating}></div>
                </div>
                <div className={styles.skeletonMeta}>
                  <div className={styles.skeletonRatingRight}></div>
                  <div className={styles.skeletonPrice}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows & Dots */}
      <div className={styles.scrollButtons}>
        <div className={styles.arrowScrollButton}>
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

        <div className={styles.dotsContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 0 ? `${styles.dot} ${styles.activeDot}` : styles.dot}
            />
          ))}
        </div>

        <div className={styles.arrowScrollButton}>
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

export default CarouselSkeleton;
