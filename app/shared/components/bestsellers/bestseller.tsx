"use client";
import React, { useState, useRef, useEffect } from "react";
import ProductCard from "../productCard/productCard";
import CarouselSkeleton from "../carouselSkeleton/CarouselSkeleton";
import styles from "./bestseller.module.css";
import { ProductWithImages } from "@/app/lib/definitions";

interface BestsellerProps {
  products: ProductWithImages[];
  loading?: boolean;
}

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

const Bestseller: React.FC<BestsellerProps> = ({ products, loading = false }) => {
  // Filter only bestsellers
  const bestsellerProducts = products.filter((p) => p.is_bestseller);

  // Refs and state
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const [bestsellersIndex, setBestsellersIndex] = useState(0);
  const [bestsellersSlides, setBestsellersSlides] = useState(1);

  const bestsellersScrollLeft = () => {
    if (!bestsellersRef.current) return;
    bestsellersRef.current.scrollBy({
      left: -bestsellersRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const bestsellersScrollRight = () => {
    if (!bestsellersRef.current) return;
    bestsellersRef.current.scrollBy({
      left: bestsellersRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  // Scroll to a specific page index (for dot clicks)
  const bestsellersScrollToIndex = (index: number) => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    container.scrollTo({
      left: index * container.clientWidth,
      behavior: "smooth",
    });
  };

  const bestsellersHandleScroll = () => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setBestsellersIndex(index);
  };

  const bestsellersHandleResize = () => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    setBestsellersSlides(Math.ceil(container.scrollWidth / container.clientWidth));
    bestsellersHandleScroll();
  };

  useEffect(() => {
    const container = bestsellersRef.current;
    if (!container) return;

    bestsellersHandleResize();
    container.addEventListener("scroll", bestsellersHandleScroll);
    window.addEventListener("resize", bestsellersHandleResize);

    return () => {
      container.removeEventListener("scroll", bestsellersHandleScroll);
      window.removeEventListener("resize", bestsellersHandleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate when products change
  useEffect(() => {
    if (bestsellerProducts.length > 0) {
      bestsellersHandleResize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestsellerProducts.length]);

  // Dots range
  const maxDots = 6;
  const [startDot, endDot] = getDotRange(bestsellersIndex, bestsellersSlides, maxDots);
  const dotsToRender = Array.from({ length: bestsellersSlides }, (_, i) => i).slice(
    startDot,
    endDot + 1
  );

  // Show skeleton while loading
  if (loading || products.length === 0) {
    return <CarouselSkeleton count={6} />;
  }

  return (
    <div className={styles.wrapper}>
      {/* Carousel container */}
      <div className={styles.bestsellersContainer} ref={bestsellersRef}>
        {bestsellerProducts.map((product) => (
          <div className={styles.productCardSlide} key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Scroll buttons and dots */}
      <div className={styles.scrollButtons}>
        <button className={styles.arrowScrollButton} onClick={bestsellersScrollLeft}>
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
                dotIndex === bestsellersIndex
                  ? `${styles.dot} ${styles.activeDot}`
                  : styles.dot
              }
              onClick={() => bestsellersScrollToIndex(dotIndex)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>

        <button className={styles.arrowScrollButton} onClick={bestsellersScrollRight}>
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

export default Bestseller;
