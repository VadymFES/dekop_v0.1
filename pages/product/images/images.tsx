import React, { useState } from 'react';
import Image from 'next/image';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './ProductPage.module.css'; // Adjust import path accordingly


const ProductImages: React.FC<{ product: ProductWithImages }> = ({ product }) => {
  // 1) Initialize the selected image to the first image in the array
  const [selectedImage, setSelectedImage] = useState(product.images[0]);

  // 2) Handle thumbnail click
  const handleThumbnailClick = (image: typeof product.images[0]) => {
    setSelectedImage(image);
  };

  return (
    <div className={styles.imageSection}>
      {/* Main (selected) image */}
      <div className={styles.mainImageContainer}>
        <Image
          key={selectedImage.id}
          src={selectedImage.image_url}
          alt={selectedImage.alt || product.name}
          width={500}
          height={500}
          className={styles.mainImage}
        />
      </div>

      {/* Carousel (thumbnails) */}
      <div className={styles.carouselContainer}>
        {product.images.map((image) => (
          <div
            key={image.id}
            className={
              image.id === selectedImage.id
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
