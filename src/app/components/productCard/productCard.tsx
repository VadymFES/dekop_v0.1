import React from 'react';
import Link from 'next/link'; // Assuming you're using Next.js
import styles from './productCard.module.css'; // Adjust path based on your project structure

// Define the props for ProductCard
interface ProductCardProps {
  product: {
    id: number;
    image: string;
    name: string;
    type: string;
    rating: number;
    price: number;
    isBestseller?: boolean; // New prop to indicate bestseller status
    isNew?: boolean; // New prop to indicate new product status
    isdiscount?: boolean; // New prop to indicate discount percentage
  };
}


const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className={styles.productCard}>
      <Link href={`/product/${product.id}`}>
        <div>
          <div className={styles.imageWrapper}>
            <img src={product.image} alt={product.name} className={styles.productImage} />

            {product.isBestseller && (
              <div className={styles.salesLeaderLabel}>Sales Leader</div>
            )}
            {product.isNew && (
              <div className={styles.newLabel}>New</div>
            )}
            {product.isdiscount && (
              <div className={styles.discountLabel}>Discount</div>
            )}

          </div>

          <div className={styles.productDetails}>
            <div className={styles.productInfo}>
              <p className={styles.productName}>{product.name}</p>
              <p className={styles.productType}>{product.type}</p>
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
          console.log('Product added to cart');
        }}
      >
        Додати в кошик
      </button>
    </div>
  );
};

export default ProductCard;
