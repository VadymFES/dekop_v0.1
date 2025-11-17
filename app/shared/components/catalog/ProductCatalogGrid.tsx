import React, { memo, useEffect, useState, useCallback } from 'react';
import styles from './ProductCatalogGrid.module.css';
import { ProductWithImages } from '@/app/lib/definitions';
import ProductCard from '@/app/shared/components/productCard/productCard';
import ProductGridSkeleton from '@/app/catalog/components/ui/gridSkeleton/ProductGridSkeleton';

interface ProductCatalogGridProps {
  /** Filtered products to display */
  filteredProducts: ProductWithImages[];
  /** Loading state */
  loading: boolean;
  /** Is currently filtering */
  isFiltering: boolean;
  /** Error state */
  error: any;
}

/**
 * Product Catalog Grid Component
 * Displays filtered products in a responsive grid with infinite scroll
 * Used on catalog pages with filtering and sorting capabilities
 */
export const ProductCatalogGrid = memo<ProductCatalogGridProps>(({
  loading,
  isFiltering,
  error,
  filteredProducts
}) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [visibleProducts, setVisibleProducts] = useState<ProductWithImages[]>([]);
  const [page, setPage] = useState(1);
  const productsPerPage = 9;

  // Handle skeleton display
  useEffect(() => {
    if (!loading && !isFiltering) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
    }
  }, [loading, isFiltering]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setVisibleProducts(filteredProducts.slice(0, productsPerPage));
  }, [filteredProducts]);

  // Intersection Observer for infinite scroll
  const lastProductRef = useCallback((node: HTMLElement | null) => {
    if (loading || !node) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleProducts.length < filteredProducts.length) {
        const nextPage = page + 1;
        setPage(nextPage);
        setVisibleProducts((prevProducts) => [
          ...prevProducts,
          ...filteredProducts.slice(prevProducts.length, nextPage * productsPerPage)
        ]);
      }
    }, { threshold: 0.1, rootMargin: '50px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, visibleProducts.length, filteredProducts.length, filteredProducts, page]);

  return (
    <div className={styles.productGrid}>
      {showSkeleton ? (
        <ProductGridSkeleton count={9} />
      ) : error ? (
        <p className={styles.errorMessage}>
          Упс! Щось пішло не так. Спробуйте оновити сторінку
        </p>
      ) : filteredProducts.length === 0 ? (
        <p className={styles.emptyMessage}>
          Товарів не знайдено. Спробуйте змінити фільтри або категорію.
        </p>
      ) : (
        visibleProducts.map((product, index) => {
          const isLastItem = index === visibleProducts.length - 1;
          return (
            <div
              key={product.id}
              ref={isLastItem ? lastProductRef : null}
              className={styles.productCardWrapper}
            >
              <ProductCard product={product} />
            </div>
          );
        })
      )}
    </div>
  );
});

ProductCatalogGrid.displayName = 'ProductCatalogGrid';
