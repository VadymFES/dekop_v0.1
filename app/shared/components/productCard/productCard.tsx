"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./productCard.module.css";
import { ProductWithImages } from "@/app/lib/definitions";
import { useCart } from "@/app/context/CartContext";

interface ProductCardProps {
  product: ProductWithImages;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isLoading, addToCart } = useCart();

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

  const firstImage = product.images.length > 0 ? product.images[0] : null;

  return (
    <div className={styles.productCard}>
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
        disabled={product.stock < 1 || isLoading}
      >
        {isLoading ? "Завантаження..." : "Додати в кошик"}
      </button>
    </div>
  );
};

export default ProductCard;