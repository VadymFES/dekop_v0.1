import React, { useState } from 'react';
import Image from 'next/image';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './ProductPage.module.css';

interface ProductImagesProps {
  product?: ProductWithImages; // Allow product to be optional if it might be undefined
}

const ProductImages: React.FC<ProductImagesProps> = ({ product }) => {
  // Use optional chaining to safely initialize the state.
  const [selectedImage, setSelectedImage] = useState(product?.images?.[0]);

  // Early return if product or its images are missing.
  if (!product || !product.images || product.images.length === 0) {
    return <div>Зображення не доступні</div>;
  }

  // Handle thumbnail click
  const handleThumbnailClick = (image: typeof product.images[0]) => {
    setSelectedImage(image);
  };

  return (
    <div className={styles.imageSection}>
      {/* Main (selected) image */}
      <div className={styles.mainImageContainer}>
        {selectedImage && (
          <Image
            key={selectedImage.id}
            src={selectedImage.image_url}
            alt={selectedImage.alt || product.name}
            width={500}
            height={500}
            className={styles.mainImage}
          />
        )}
      </div>

      {/* Carousel (thumbnails) */}
      <div className={styles.carouselContainer}>
        {product.images.map((image) => (
          <div
            key={image.id}
            className={
              selectedImage && image.id === selectedImage.id
                ? styles.thumbnailSelected
                : styles.thumbnail
            }
            onClick={() => handleThumbnailClick(image)}
          >
            <Image
              src={image.image_url}
              alt={image.alt || product.name}
              width={80}
              height={80}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductImages;
