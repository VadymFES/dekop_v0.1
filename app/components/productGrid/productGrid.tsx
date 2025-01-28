"use client";

import React, { useRef, useEffect, useState } from "react";
import ProductCard from "../productCard/productCard";
import styles from "./productGrid.module.css";
import { ProductWithImages } from "@/app/lib/definitions";

export default function ProductGrid() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);

  // Scrolling UI logic
  const productGridRef = useRef<HTMLDivElement>(null); // Refer to the productGrid
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(1);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data: ProductWithImages[] = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }
    fetchData();
  }, []);

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

  // Update the dot indicator
  const handleScroll = () => {
    if (!productGridRef.current) return;
    const container = productGridRef.current;
    const newIndex = Math.round(container.scrollLeft / container.clientWidth);
    setCurrentIndex(newIndex);
  };

  // Recalculate the slides on resize
  const handleResize = () => {
    if (!productGridRef.current) return;
    const container = productGridRef.current;
    setTotalSlides(Math.ceil(container.scrollWidth / container.clientWidth));
    handleScroll();
  };

  useEffect(() => {
    if (productGridRef.current) {
      handleResize();
      productGridRef.current.addEventListener("scroll", handleScroll);
      window.addEventListener("resize", handleResize);
    }
    return () => {
      if (productGridRef.current) {
        productGridRef.current.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // Detect mobile
  useEffect(() => {
    const detectMobile = () => setIsMobile(window.innerWidth < 1024);
    detectMobile();
    window.addEventListener("resize", detectMobile);
    return () => window.removeEventListener("resize", detectMobile);
  }, []);

  return (
    <div className={styles.wrapper}>
      {/* Container that holds the grid and special showcase side by side */}
      <div className={styles.bodyContentGrid}>
        <div className={styles.productGrid} ref={productGridRef}>
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className={styles.specialProductShowcase}>
          <img
            src="https://plus.unsplash.com/premium_photo-1728657018268-0938eea1d916?q=80&w=1888&auto=format&fit=crop"
            alt="Product Variant 1"
            className={styles.halfImageLeft}
          />
        </div>
      </div>

      {/* Scroll Controls beneath the grid */}
      {isMobile && totalSlides > 1 && (
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
            {Array.from({ length: totalSlides }, (_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${
                  i === currentIndex ? styles.activeDot : ""
                }`}
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
