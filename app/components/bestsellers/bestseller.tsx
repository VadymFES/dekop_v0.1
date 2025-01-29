"use client";
import React, { useState, useRef, useEffect } from "react";
import ProductCard from "../productCard/productCard";
import styles from "./bestseller.module.css";
import { ProductWithImages } from "@/app/lib/definitions";

interface BestsellerProps {
  products: ProductWithImages[];
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

const Bestseller: React.FC<BestsellerProps> = ({ products }) => {
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

  // Update current slide index on scroll
  const bestsellersHandleScroll = () => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    // This determines which "page" of the carousel we’re on.
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setBestsellersIndex(index);
  };

  // Calculate how many slides fit in the container
  const bestsellersHandleResize = () => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    // The total number of "screens" or "pages" in the scroll container
    setBestsellersSlides(Math.ceil(container.scrollWidth / container.clientWidth));
    bestsellersHandleScroll();
  };

  // Add event listeners
  useEffect(() => {
    if (bestsellersRef.current) {
      bestsellersHandleResize();
      bestsellersRef.current.addEventListener("scroll", bestsellersHandleScroll);
      window.addEventListener("resize", bestsellersHandleResize);
    }

    return () => {
      if (bestsellersRef.current) {
        bestsellersRef.current.removeEventListener("scroll", bestsellersHandleScroll);
      }
      window.removeEventListener("resize", bestsellersHandleResize);
    };
  }, []);

  // Dots range
  const [startDot, endDot] = getDotRange(bestsellersIndex, bestsellersSlides, 6);
  const dotsToRender = Array.from({ length: bestsellersSlides }, (_, i) => i).slice(
    startDot,
    endDot + 1
  );

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
