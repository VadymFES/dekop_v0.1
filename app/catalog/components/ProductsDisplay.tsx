// /app/catalog/components/ProductsDisplay.tsx
import React, { memo } from 'react';
import styles from '../catalog.module.css';
import { ProductsDisplayProps } from '../types';
import ProductCard from '@/app/shared/components/productCard/productCard';
import ProductGridSkeleton from '../components/ui/gridSkeleton/ProductGridSkeleton';

// Using memo to prevent unnecessary re-renders
export const ProductsDisplay = memo<ProductsDisplayProps>(({
  loading,
  isFiltering,
  error,
  filteredProducts
}) => (
  <div className={styles.productGrid}>
    {loading || isFiltering ? (
      <ProductGridSkeleton count={9} />
    ) : error ? (
      <p style={{ color: "red" }}>Упс! Щось пішло не так. Спробуйте оновити сторінку</p>
    ) : filteredProducts.length === 0 ? (
      <p>Товарів не знайдено. Спробуйте змінити фільтри або категорію.</p>
    ) : (
      filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))
    )}
  </div>
));

ProductsDisplay.displayName = 'ProductsDisplay';