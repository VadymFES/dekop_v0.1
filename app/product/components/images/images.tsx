import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './ProductPage.module.css';

interface ProductImagesProps {
  product?: ProductWithImages; // Allow product to be optional if it might be undefined
  selectedColor?: string | null; // Color selected by user (from ProductActions)
}

const ProductImages: React.FC<ProductImagesProps> = ({ product, selectedColor }) => {
  // Filter images based on selected color
  // Show images where color matches selectedColor OR color is null (general images)
  const filteredImages = useMemo(() => {
    if (!product?.images || product.images.length === 0) return [];

    // If no color is selected, show all images
    if (!selectedColor) {
      return product.images;
    }

    // Filter images: show color-specific images + general images (color is null)
    const colorFiltered = product.images.filter(
      img => img.color === selectedColor || img.color === null || img.color === undefined
    );

    // If no images match, fall back to all images
    return colorFiltered.length > 0 ? colorFiltered : product.images;
  }, [product?.images, selectedColor]);

  // Use optional chaining to safely initialize the state.
  const [selectedImage, setSelectedImage] = useState(filteredImages[0]);

  // Sync selectedImage when filtered images change (e.g., when color changes)
  useEffect(() => {
    if (filteredImages.length > 0) {
      // Select the first primary image or first image in the filtered list
      const primaryImage = filteredImages.find(img => img.is_primary);
      setSelectedImage(primaryImage || filteredImages[0]);
    }
  }, [filteredImages]);

  // Early return if product or its images are missing.
  if (!product || !product.images || product.images.length === 0) {
    return <div className={styles.imagePlaceholder} aria-label="Зображення відсутнє" />;
  }

  // Handle thumbnail click
  const handleThumbnailClick = (image: typeof product.images[0]) => {
    setSelectedImage(image);
  };

  return (
    <div className={styles.imageSection}>
      {/* Main (selected) image */}
      <div className={styles.mainImageContainer}>
        {selectedImage ? (
          <Image
            key={selectedImage.id}
            src={selectedImage.image_url}
            alt={selectedImage.alt || product.name}
            width={500}
            height={500}
            sizes="(max-width: 768px) 100vw, 500px"
            className={styles.mainImage}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-label="Зображення відсутнє" />
        )}
      </div>

      {/* Carousel (thumbnails) - shows filtered images based on selected color */}
      <div className={styles.carouselContainer}>
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className={
              selectedImage && image.id === selectedImage.id
                ? styles.thumbnailSelected
                : styles.thumbnail
            }
            onClick={() => handleThumbnailClick(image)}
          >
            {image.image_url ? (
              <Image
                src={image.image_url}
                alt={image.alt || product.name}
                width={80}
                height={80}
                sizes="(max-width: 768px) 100vw, 80px"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
              />
            ) : (
              <div className={styles.thumbnailPlaceholder} aria-label="Зображення відсутнє" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductImages;