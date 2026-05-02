import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import styles from '../catalog.module.css';
import { ProductsDisplayProps } from '../types';
import { DebugLogger } from '../utils/debugLogger';
import { ProductWithImages } from '@/app/lib/definitions';
import ProductCard from '@/app/shared/components/productCard/productCard';
import ProductGridSkeleton from '../components/ui/gridSkeleton/ProductGridSkeleton';

interface IntersectionObserverEntry {
  isIntersecting: boolean;
}

interface ObserverCallback {
  (node: HTMLElement | null): void;
}

export const ProductsDisplay = memo<ProductsDisplayProps>(({
  loading,
  error,
  products
}) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [visibleProducts, setVisibleProducts] = useState<ProductWithImages[]>([]);
  const [page, setPage] = useState(1);
  const productsPerPage = 9;
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track previous products to prevent unnecessary updates
  const previousProductsRef = useRef<string>('');

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 100);
      
      // Cleanup function to prevent memory leaks and state updates on unmounted components
      return () => {
        clearTimeout(timer);
      };
    } else {
      setShowSkeleton(true);
    }
  }, [loading]);

  useEffect(() => {
    // Disconnect any active observer before resetting the list to prevent
    // the stale observer from appending products from the old sort order
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    setPage(1);
    setVisibleProducts(filteredProducts.slice(0, productsPerPage));
  }, [filteredProducts]);



  const lastProductRef: ObserverCallback = useCallback(node => {
    // Always disconnect the previous observer before creating a new one
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (loading || !node) return;

    const observer: IntersectionObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && visibleProducts.length < products.length) {
        const nextPage: number = page + 1;
        setPage(nextPage);
        setVisibleProducts((prevProducts: ProductWithImages[]) => [
          ...prevProducts,
          ...products.slice(prevProducts.length, nextPage * productsPerPage)
        ]);
      }
    }, { threshold: 0.1, rootMargin: '50px' });

    observer.observe(node);
    observerRef.current = observer;
  }, [loading, visibleProducts.length, filteredProducts.length, page]);

  return (
    <div className={styles.productGrid}>
      {showSkeleton ? (
        <ProductGridSkeleton count={9} />
      ) : error ? (
        <p style={{ color: "red" }}>Упс! Щось пішло не так. Спробуйте оновити сторінку</p>
      ) : products.length === 0 ? (
        <p>Товарів не знайдено. Спробуйте змінити фільтри або категорію.</p>
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

ProductsDisplay.displayName = 'ProductsDisplay';