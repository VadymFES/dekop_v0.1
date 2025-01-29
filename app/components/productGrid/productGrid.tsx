"use client";

import React, { useRef, useEffect, useState } from "react";
import ProductCard from "../productCard/productCard";
import styles from "./productGrid.module.css";
import { ProductWithImages } from "@/app/lib/definitions";

// Same helper for limiting visible dots
function getDotRange(
  currentIndex: number,
  totalSlides: number,
  maxDots: number
): [number, number] {
  if (totalSlides <= maxDots) return [0, totalSlides - 1];
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

export default function ProductGrid() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const productGridRef = useRef<HTMLDivElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Fetch products
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data: ProductWithImages[] = await response.json();
        // Only take 6 products for the grid
        const limited = data.slice(0, 6);
        setProducts(limited);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }
    fetchData();
  }, []);

  // Determine if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1088);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle scroll -> set current page index
  const handleScroll = () => {
    if (!productGridRef.current) return;
    const container = productGridRef.current;
    // Determine which 'page' of the carousel we are on
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setCurrentIndex(index);
  };

  // Recompute the total # of slides based on container width & scroll width
  const handleResize = () => {
    if (!productGridRef.current) return;
    const container = productGridRef.current;
    // # of full “screens” or “pages”
    const slides = Math.ceil(container.scrollWidth / container.clientWidth);
    setTotalSlides(slides);
    // Also update current index
    handleScroll();
  };

  // Attach scroll/resize listeners
  useEffect(() => {
    const container = productGridRef.current;
    if (!container) return;

    // Do an initial calc
    handleResize();

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If `products` changes after fetch, re-check slide count
  useEffect(() => {
    handleResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Scroll left
  const handleScrollLeft = () => {
    if (!productGridRef.current) return;
    productGridRef.current.scrollBy({
      left: -productGridRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  // Scroll right
  const handleScrollRight = () => {
    if (!productGridRef.current) return;
    productGridRef.current.scrollBy({
      left: productGridRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  // Dot click -> jump to a given "page" index
  const handleDotClick = (index: number) => {
    if (!productGridRef.current) return;
    productGridRef.current.scrollTo({
      left: productGridRef.current.clientWidth * index,
      behavior: "smooth",
    });
  };

  // Build dot range
  const maxDots = 6;
  const [dotStart, dotEnd] = getDotRange(currentIndex, totalSlides, maxDots);
  const dotsToRender = Array.from({ length: totalSlides }, (_, i) => i).slice(
    dotStart,
    dotEnd + 1
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.bodyContentGrid}>
        <div className={styles.productGrid} ref={productGridRef}>
          {products.map((product) => (
            <div className={styles.productCardSlide} key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        <div className={styles.specialProductShowcase}>
          <img
            src="https://plus.unsplash.com/premium_photo-1728657018268-0938eea1d916"
            alt="Special Product"
            className={styles.halfImageRight}
          />
        </div>
      </div>

      {/* Show arrows + dots only on mobile */}
      {isMobile && (
        <div className={styles.scrollButtons}>
          <button
            className={styles.arrowScrollButton}
            onClick={handleScrollLeft}
            aria-label="Scroll Left"
          >
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
                className={`${styles.dot} ${
                  dotIndex === currentIndex ? styles.activeDot : ""
                }`}
                onClick={() => handleDotClick(dotIndex)}
              />
            ))}
          </div>

          <button
            className={styles.arrowScrollButton}
            onClick={handleScrollRight}
            aria-label="Scroll Right"
          >
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
      )}
    </div>
  );
}
