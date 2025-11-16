"use client";

import React, { useState, useRef, useEffect } from "react";
import ProductCard from "../productCard/productCard";
import CarouselSkeleton from "../carouselSkeleton/CarouselSkeleton";
import styles from "./sale.module.css";
import { ProductWithImages } from "@/app/lib/definitions";

interface SaleProps {
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

const Sale: React.FC<SaleProps> = ({ products, loading = false }) => {
  // Ref for the scroll container
  const saleRef = useRef<HTMLDivElement>(null);

  // Current “page” index
  const [saleIndex, setSaleIndex] = useState(0);
  // Total number of “pages” or slides
  const [saleSlides, setSaleSlides] = useState(1);

  // Scroll left by one “page” (clientWidth)
  const saleScrollLeft = () => {
    if (!saleRef.current) return;
    saleRef.current.scrollBy({
      left: -saleRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  // Scroll right by one “page”
  const saleScrollRight = () => {
    if (!saleRef.current) return;
    saleRef.current.scrollBy({
      left: saleRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  // On scroll, figure out which page we’re on
  const saleHandleScroll = () => {
    if (!saleRef.current) return;
    const container = saleRef.current;
    // current page = container.scrollLeft / container.clientWidth
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setSaleIndex(index);
  };

  // Recompute how many “pages” fit in the container
  const saleHandleResize = () => {
    if (!saleRef.current) return;
    const container = saleRef.current;
    setSaleSlides(Math.ceil(container.scrollWidth / container.clientWidth));
    saleHandleScroll();
  };

  // Set up listeners on mount
  useEffect(() => {
    const container = saleRef.current;
    if (!container) return;

    // Initial calculation
    saleHandleResize();
    container.addEventListener("scroll", saleHandleScroll);
    window.addEventListener("resize", saleHandleResize);

    return () => {
      container.removeEventListener("scroll", saleHandleScroll);
      window.removeEventListener("resize", saleHandleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If products change, re-check slides
  useEffect(() => {
    saleHandleResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Build dot range with optional max of 6
  const maxDots = 6;
  const [startDot, endDot] = getDotRange(saleIndex, saleSlides, maxDots);
  const dotsToRender = Array.from({ length: saleSlides }, (_, i) => i).slice(
    startDot,
    endDot + 1
  );

  // Filter sale products
  const saleProducts = products.filter((p) => p.is_on_sale);

  // Show skeleton while loading
  if (loading || products.length === 0) {
    return <CarouselSkeleton count={6} />;
  }

  return (
    <div className={styles.wrapper}>
      {/* Scrollable container */}
      <div className={styles.carouselContainer} ref={saleRef}>
          {saleProducts.map((product) => (
            <div className={styles.saleItemSlide} key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
      </div>

      {/* Arrows & Dots */}
      <div className={styles.scrollButtons}>
        <button className={styles.arrowScrollButton} onClick={saleScrollLeft}>
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
                dotIndex === saleIndex
                  ? `${styles.dot} ${styles.activeDot}`
                  : styles.dot
              }
            />
          ))}
        </div>

        <button className={styles.arrowScrollButton} onClick={saleScrollRight}>
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

export default Sale;
