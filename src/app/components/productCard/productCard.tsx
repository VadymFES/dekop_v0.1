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
  };
}


const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className={styles.productCard}>
      <Link href={`/product/${product.id}`}>
        <div>
          <img src={product.image} alt={product.name} className={styles.productImage} />

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
          //"add to cart" logic here
          console.log('Product added to cart');
        }}
      >
        Додати в кошик
      </button>
    </div>
  );
};

export default ProductCard;
