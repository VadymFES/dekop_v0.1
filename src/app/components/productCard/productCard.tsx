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
  };
}

const products = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Беатріс",
    price: 12000,
    rating: 4,
    type: "Кутові дивани",
    isBestseller: true,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Ріо 2",
    price: 200,
    rating: 3,
    type: "Дивани",
    isBestseller: true,
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 3",
    price: 300,
    rating: 2.3,
    type: "sofa",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 4",
    price: 400,
    rating: 4.5,
    type: "wardrobe",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 5",
    price: 500,
    rating: 3.7,
    type: "sofa",
    isBestseller: true,
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 6",
    price: 600,
    rating: 4.2,
    type: "kitchen",
    isBestseller: true,
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 6",
    price: 600,
    rating: 4.2,
    type: "kitchen",
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 8",
    price: 600,
    rating: 4.2,
    type: "kitchen",
  },
  {
    id: 9,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 9",
    price: 600,
    rating: 4.2,
    type: "kitchen",
  },
  {
    id: 10,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 10",
    price: 600,
    rating: 4.2,
    type: "kitchen",
  },
  {
    id: 11,
    image: "https://images.unsplash.com/photo-1728664550581-e5fa836e720a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Product 11",
    price: 600,
    rating: 4.2,
    type: "kitchen",
  },
];

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className={styles.productCard}>
      <Link href={`/product/${product.id}`}>
        <div>
          <div className={styles.imageWrapper}>
            <img src={product.image} alt={product.name} className={styles.productImage} />
            {product.isBestseller && <div className={styles.salesLeaderLabel}>Sales Leader</div>}
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
