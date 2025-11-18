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
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Calculate pages based on container and item widths
  const calculatePages = () => {
    if (!bestsellersRef.current || bestsellerProducts.length === 0) return;

    const container = bestsellersRef.current;
    const firstChild = container.children[0] as HTMLElement;
    if (!firstChild) return;

    const containerWidth = container.clientWidth;
    const itemWidth = firstChild.offsetWidth;
    const gap = parseFloat(getComputedStyle(container).gap || '0');

    // Calculate how many items fit in one view
    const itemsVisible = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
    setItemsPerPage(itemsVisible);

    // Calculate total pages
    const pages = Math.ceil(bestsellerProducts.length / itemsVisible);
    setTotalPages(pages);
  };

  // Scroll by page
  const bestsellersScrollLeft = () => {
    const newPage = Math.max(currentPage - 1, 0);
    setCurrentPage(newPage);
    scrollToPage(newPage);
  };

  const bestsellersScrollRight = () => {
    const newPage = Math.min(currentPage + 1, totalPages - 1);
    setCurrentPage(newPage);
    scrollToPage(newPage);
  };

  // Scroll to a specific page
  const scrollToPage = (pageIndex: number) => {
    if (!bestsellersRef.current) return;
    const container = bestsellersRef.current;
    const itemIndex = pageIndex * itemsPerPage;
    const slide = container.children[itemIndex] as HTMLElement | null;
    if (!slide) return;
    container.scrollTo({
      left: slide.offsetLeft,
      behavior: "smooth",
    });
  };

  // Handle scroll to update current page
  useEffect(() => {
    const container = bestsellersRef.current;
    if (!container) return;

    const handleScrollEnd = () => {
      if (itemsPerPage === 0) return;

      const children = Array.from(container.children) as HTMLElement[];
      const containerScrollLeft = container.scrollLeft + container.clientWidth / 2;

      const activeItemIndex = children.findIndex(
        (child) => containerScrollLeft >= child.offsetLeft &&
                 containerScrollLeft < child.offsetLeft + child.offsetWidth
      );

      if (activeItemIndex !== -1) {
        const page = Math.floor(activeItemIndex / itemsPerPage);
        setCurrentPage(page);
      }
    };

    container.addEventListener("scrollend", handleScrollEnd);
    return () => container.removeEventListener("scrollend", handleScrollEnd);
  }, [itemsPerPage]);

  // Calculate pages on mount and resize
  useEffect(() => {
    // Defer calculation to ensure DOM is ready
    const timer = setTimeout(() => {
      calculatePages();
    }, 0);

    window.addEventListener("resize", calculatePages);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculatePages);
    };
  }, []);

  // Recalculate when products change
  useEffect(() => {
    if (bestsellerProducts.length > 0) {
      // Defer to ensure DOM has updated
      const timer = setTimeout(() => {
        calculatePages();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [bestsellerProducts.length]);

  // Dots range
  const maxDots = 6;
  const [startDot, endDot] = getDotRange(currentPage, totalPages, maxDots);
  const dotsToRender = Array.from({ length: totalPages }, (_, i) => i).slice(
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
                dotIndex === currentPage
                  ? `${styles.dot} ${styles.activeDot}`
                  : styles.dot
              }
              onClick={() => {
                setCurrentPage(dotIndex);
                scrollToPage(dotIndex);
              }}
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
