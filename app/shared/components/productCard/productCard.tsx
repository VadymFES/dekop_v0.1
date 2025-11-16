"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./productCard.module.css";
import { ProductWithImages } from "@/app/lib/definitions";
import { useCart } from "@/app/context/CartContext";
import { useFavorites } from "@/app/context/FavoritesContext";

interface ProductCardProps {
  product: ProductWithImages;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isLoading, addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent triggering the parent link navigation
    e.stopPropagation();
    e.preventDefault();

    // If the product is out of stock, do nothing
    if (product.stock < 1) return;

    // Add the product to the cart with a default quantity of 1.
    // If the product has color options, default to the first one (or an empty string if not available)
    addToCart({
      productId: product.id.toString(),
      quantity: 1,
      color: product.colors?.[0]?.color || "",
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent triggering the parent link navigation
    e.stopPropagation();
    e.preventDefault();

    // Toggle favorite status (optimistic UI update)
    toggleFavorite(product.id);
  };

  const firstImage = product.images.length > 0 ? product.images[0] : null;
  const isFavorited = isFavorite(product.id);
  const isOutOfStock = product.stock < 1;

  return (
    <div className={`${styles.productCard} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <Link href={`/product/${encodeURIComponent(product.slug)}`} prefetch={false}>
        <div>
          <div className={styles.imageWrapper}>
            {firstImage && (
              <Image
                src={firstImage.image_url}
                alt={product.name}
                className={styles.productImage}
                width={260}
                height={260}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
              />
            )}

            {/* Favorite heart icon button */}
            <button
              className={`${styles.favoriteButton} ${isFavorited ? styles.favorited : ''}`}
              onClick={handleToggleFavorite}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              title={isFavorited ? "Видалити з обраного" : "Додати до обраного"}
            >
              <svg
                className={styles.heartIcon}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={isFavorited ? "#ff3939" : "none"}
                stroke={isFavorited ? "#ff3939" : "#160101"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {(product.is_bestseller || product.is_new || product.is_on_sale) && (
              <div className={styles.labelsContainer}>
                {product.is_bestseller && (
                  <div className={styles.salesLeaderLabel}>Лідер продажів</div>
                )}
                {product.is_new && (
                  <div className={styles.newLabel}>Новинка</div>
                )}
                {product.is_on_sale && (
                  <div className={styles.discountLabel}>Знижка</div>
                )}
              </div>
            )}
          </div>

          <div className={styles.productDetails}>
            <div className={styles.productInfo}>
              <p className={styles.productName}>{product.name}</p>
              <p className={styles.productType}>{product.category}</p>
            </div>
            <div className={styles.productMeta}>
              <p className={styles.productRating}>{product.rating}</p>
                <p className={styles.productPrice}>{Math.round(product.price)} грн</p>
            </div>
          </div>
        </div>
      </Link>

      <button
        className={styles.addToCartButton}
        onClick={handleAddToCart}
        disabled={isOutOfStock || isLoading}
      >
        {isLoading ? "Завантаження..." : isOutOfStock ? "Немає в наявності" : "Додати в кошик"}
      </button>
    </div>
  );
};

export default ProductCard;