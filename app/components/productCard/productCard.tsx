"use client";
import React from "react";
import Link from "next/link";
import styles from "./productCard.module.css";
import { ProductWithImages } from "@/app/lib/definitions"; // Adjust path as needed
import Image from "next/image";


interface ProductCardProps {
  product: ProductWithImages;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
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
              />
            )}

            {product.is_bestseller && (
              <div className={styles.salesLeaderLabel}>Лідер продажів</div>
            )}
            {product.is_new && <div className={styles.newLabel}>Новинка</div>}
            {product.is_on_sale && <div className={styles.discountLabel}>Знижка</div>}
          </div>

          <div className={styles.productDetails}>
            <div className={styles.productInfo}>
              <p className={styles.productName}>{product.name}</p>
              <p className={styles.productType}>{product.category}</p>
            </div>
            <div className={styles.productMeta}>
              <p className={styles.productRating}>{product.rating}</p>
              <p className={styles.productPrice}>{product.price} грн</p>
            </div>
          </div>
        </div>
      </Link>

      <button
        className={styles.addToCartButton}
        onClick={() => {
          // "add to cart" logic here
          console.log("Product added to cart");
        }}
      >
        Додати в кошик
      </button>
    </div>
  );
};

export default ProductCard;
