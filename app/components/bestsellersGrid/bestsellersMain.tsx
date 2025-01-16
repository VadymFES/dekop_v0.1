import React from 'react';
import ProductCard from '../productCard/productCard'; // Adjust path as necessary
import styles from './bestsellersMain.module.css'; // Assuming there's a CSS module for styling

// Define the Product interface
interface Product {
    id: number;
    image: string;
    name: string;
    price: number;
    rating: number;
    type: string;
    isBestseller?: boolean; // Optional
    isNew?: boolean; // Optional
}

// Update the BestsellersProps interface to expect an array of Product objects
interface BestsellersProps {
    products: Product[]; // Change this to an array of Products
}

// Updated Bestsellers component
const Bestsellers: React.FC<BestsellersProps> = ({ products }) => {
    return (
        <div className={styles.bestsellersGrid}>
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
};

export default Bestsellers;