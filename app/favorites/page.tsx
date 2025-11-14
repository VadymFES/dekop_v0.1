"use client";

import { useEffect, useState } from "react";
import { useFavorites } from "@/app/context/FavoritesContext";
import { ProductWithImages } from "@/app/lib/definitions";
import ProductCard from "@/app/shared/components/productCard/productCard";
import styles from "./favorites.module.css";

export default function FavoritesPage() {
  const { favorites, isLoading: favoritesLoading, clearFavorites } = useFavorites();
  const [favoriteProducts, setFavoriteProducts] = useState<ProductWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for favorites to load from localStorage
    if (favoritesLoading) {
      return;
    }

    // If no favorites, stop loading
    if (favorites.length === 0) {
      setFavoriteProducts([]);
      setIsLoading(false);
      return;
    }

    // Fetch all products and filter by favorites
    const fetchFavoriteProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all products
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const allProducts: ProductWithImages[] = await response.json();

        // Filter products that are in favorites
        const favProducts = allProducts.filter((product) =>
          favorites.includes(product.id)
        );

        setFavoriteProducts(favProducts);
      } catch (err) {
        console.error('Error fetching favorite products:', err);
        setError('Не вдалося завантажити обрані товари. Спробуйте пізніше.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavoriteProducts();
  }, [favorites, favoritesLoading]);

  // Handle clear all favorites
  const handleClearAll = () => {
    if (window.confirm('Ви впевнені, що хочете очистити всі обрані товари?')) {
      clearFavorites();
    }
  };

  // Loading state
  if (favoritesLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Обране</h1>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Завантаження...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Обране</h1>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (favoriteProducts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Обране</h1>
        </div>
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h2 className={styles.emptyTitle}>Ваш список обраних порожній</h2>
          <p className={styles.emptyDescription}>
            Додайте товари до обраних, натиснувши на значок серця на картці товару
          </p>
          <a href="/catalog" className={styles.shopButton}>
            Перейти до каталогу
          </a>
        </div>
      </div>
    );
  }

  // Products display
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Обране</h1>
        <div className={styles.headerActions}>
          <p className={styles.count}>
            {favoriteProducts.length} {favoriteProducts.length === 1 ? 'товар' : 'товарів'}
          </p>
          <button onClick={handleClearAll} className={styles.clearButton}>
            Очистити все
          </button>
        </div>
      </div>

      <div className={styles.productsGrid}>
        {favoriteProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
