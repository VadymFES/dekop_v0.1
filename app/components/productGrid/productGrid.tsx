"use client";

import React, { useRef, useEffect, useState } from "react";
import ProductCard from "../productCard/productCard";
import styles from "./productGrid.module.css";
import { ProductWithImages } from "@/app/lib/definitions";
import useSWR from "swr";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProductGrid() {
  const productGridRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // SWR data fetching
  const { data, error } = useSWR<ProductWithImages[]>("/api/products", fetcher);
  const products = data?.slice(0, 6) || [];
  const totalSlides = products.length;

  // Mobile detection and resize handler
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1088);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll event handlers
  useEffect(() => {
    const container = productGridRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      const children = Array.from(container.children) as HTMLElement[];
      const containerScrollLeft = container.scrollLeft + container.clientWidth / 2;
      const activeSlide = children.findIndex(
        (child) => containerScrollLeft >= child.offsetLeft && 
                 containerScrollLeft < child.offsetLeft + child.offsetWidth
      );
      if (activeSlide !== -1) setCurrentIndex(activeSlide);
    };

    container.addEventListener("scrollend", handleScrollEnd);
    return () => container.removeEventListener("scrollend", handleScrollEnd);
  }, []);

  // Scroll handlers
  const scrollToSlide = (index: number) => {
    if (!productGridRef.current) return;
    const container = productGridRef.current;
    const slide = container.children[index] as HTMLElement | null;
    if (!slide) return;
    container.scrollTo({
      left: slide.offsetLeft,
      behavior: "smooth",
    });
  };

  const handleScrollLeft = () => {
    const newIndex = Math.max(currentIndex - 1, 0);
    setCurrentIndex(newIndex);
    scrollToSlide(newIndex);
  };

  const handleScrollRight = () => {
    const newIndex = Math.min(currentIndex + 1, totalSlides - 1);
    setCurrentIndex(newIndex);
    scrollToSlide(newIndex);
  };

  // Dot click handler
  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    scrollToSlide(index);
  };

  // Dots logic
  const maxDots = 6;
  const [dotStart, dotEnd] = getDotRange(currentIndex, totalSlides, maxDots);
  const dotsToRender = Array.from({ length: totalSlides }, (_, i) => i)
    .slice(dotStart, dotEnd + 1);

  if (error) return <div className={styles.error}>Failed to load products</div>;

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
            className={styles.halfImageLeft}
          />
        </div>
      </div>

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