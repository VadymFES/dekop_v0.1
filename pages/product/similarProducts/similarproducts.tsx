import React, { useState, useRef, useEffect, useCallback } from 'react';
import ProductCard from '@/app/components/productCard/productCard';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './similar.module.css';

// Helper for limiting visible dots in the carousel
function getDotRange(
  currentIndex: number,
  totalSlides: number,
  maxDots: number
): [number, number] {
  if (totalSlides <= maxDots) {
    return [0, totalSlides - 1];
  }
  const half = Math.floor(maxDots / 2);
  let start = currentIndex - half;
  let end = start + (maxDots - 1);

  if (start < 0) {
    start = 0;
    end = start + (maxDots - 1);
  }
  if (end >= totalSlides) {
    end = totalSlides - 1;
    start = end - (maxDots - 1);
  }
  return [start, end];
}

interface SimilarProps {
  products: ProductWithImages[] | null;
}

const SimilarProducts: React.FC<SimilarProps> = ({ products }) => {
  const similarRef = useRef<HTMLDivElement>(null);
  const [similarIndex, setSimilarIndex] = useState(0);
  const [similarSlides, setSimilarSlides] = useState(1);

  const similarScrollLeft = useCallback(() => {
    if (!similarRef.current) return;
    similarRef.current.scrollBy({
      left: -similarRef.current.clientWidth,
      behavior: 'smooth',
    });
  }, []);

  const similarScrollRight = useCallback(() => {
    if (!similarRef.current) return;
    similarRef.current.scrollBy({
      left: similarRef.current.clientWidth,
      behavior: 'smooth',
    });
  }, []);

  const similarHandleScroll = useCallback(() => {
    if (!similarRef.current) return;
    const container = similarRef.current;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setSimilarIndex(index);
  }, []);

  const similarHandleResize = useCallback(() => {
    if (!similarRef.current) return;
    const container = similarRef.current;
    setSimilarSlides(Math.ceil(container.scrollWidth / container.clientWidth));
    similarHandleScroll();
  }, [similarHandleScroll]);

  useEffect(() => {
    const container = similarRef.current;
    if (!container) return;

    similarHandleResize();
    container.addEventListener('scroll', similarHandleScroll);
    window.addEventListener('resize', similarHandleResize);

    return () => {
      container.removeEventListener('scroll', similarHandleScroll);
      window.removeEventListener('resize', similarHandleResize);
    };
  }, [similarHandleResize, similarHandleScroll]);

  const maxDots = 6;
  const [startDot, endDot] = getDotRange(similarIndex, similarSlides, maxDots);
  const dotsToRender = Array.from({ length: similarSlides }, (_, i) => i).slice(
    startDot,
    endDot + 1
  );

  return (
    <div className={styles.wrapper}>
      {/* Scrollable container */}
      <div className={styles.similarlContainer} ref={similarRef}>
        {products?.map((product) => (
          <div className={styles.similarItemSlide} key={product.id}>
            <ProductCard key={product.id} product={product} />
          </div>
        ))}
      </div>

      {/* Arrows & Dots */}
      <div className={styles.scrollButtons}>
        <button className={styles.arrowScrollButton} onClick={similarScrollLeft}>
          <svg
            width="34"
            height="24"
            viewBox="0 0 24 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.6663 7H1.33301M1.33301 7L9.33301 13M1.33301 7L9.33301 1"
              stroke="#160101"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={styles.dotsContainer}>
          {dotsToRender.map((dotIndex) => (
            <div
              key={dotIndex}
              className={
                dotIndex === similarIndex
                  ? `${styles.dot} ${styles.activeDot}`
                  : styles.dot
              }
            />
          ))}
        </div>

        <button className={styles.arrowScrollButton} onClick={similarScrollRight}>
          <svg
            width="34"
            height="24"
            viewBox="0 0 24 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.33301 7H22.6663M22.6663 7L14.6663 1M22.6663 7L14.6663 13"
              stroke="#160101"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SimilarProducts;
