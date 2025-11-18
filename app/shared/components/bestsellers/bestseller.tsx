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
  const totalSlides = bestsellerProducts.length;

  const bestsellersScrollLeft = () => {
    const newIndex = Math.max(bestsellersIndex - 1, 0);
    setBestsellersIndex(newIndex);
    bestsellersScrollToIndex(newIndex);
  };

  const bestsellersScrollRight = () => {
    const newIndex = Math.min(bestsellersIndex + 1, totalSlides - 1);
    setBestsellersIndex(newIndex);
    bestsellersScrollToIndex(newIndex);
  };

  // Scroll to a specific product index
  const bestsellersScrollToIndex = (index: number) => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    const slide = container.children[index] as HTMLElement | null;
    if (!slide) return;
    container.scrollTo({
      left: slide.offsetLeft,
      behavior: "smooth",
    });
  };

  // Scroll event handlers
  useEffect(() => {
    const container = bestsellersRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      const children = Array.from(container.children) as HTMLElement[];
      const containerScrollLeft = container.scrollLeft + container.clientWidth / 2;
      const activeSlide = children.findIndex(
        (child) => containerScrollLeft >= child.offsetLeft &&
                 containerScrollLeft < child.offsetLeft + child.offsetWidth
      );
      if (activeSlide !== -1) setBestsellersIndex(activeSlide);
    };

    container.addEventListener("scrollend", handleScrollEnd);
    return () => container.removeEventListener("scrollend", handleScrollEnd);
  }, []);

  // Dots range
  const maxDots = 6;
  const [startDot, endDot] = getDotRange(bestsellersIndex, totalSlides, maxDots);
  const dotsToRender = Array.from({ length: totalSlides }, (_, i) => i).slice(
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
