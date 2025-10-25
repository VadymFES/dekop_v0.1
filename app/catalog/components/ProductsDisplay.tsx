import React, { memo, useEffect, useState, useCallback } from 'react';
import styles from '../catalog.module.css';
import { ProductsDisplayProps } from '../types';
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

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
    }
  }, [loading]);

  useEffect(() => {
    setPage(1);
    setVisibleProducts(products.slice(0, productsPerPage));
  }, [products]);



  const lastProductRef: ObserverCallback = useCallback(node => {
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
    return () => observer.disconnect();
  }, [loading, visibleProducts.length, products.length, page, products, productsPerPage]);

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