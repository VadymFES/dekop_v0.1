'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './ProductPage.module.css';

interface ProductImagesProps {
  product?: ProductWithImages;
  selectedColor?: string | null;
}

const ZOOM_SCALE = 2;
const LENS_SIZE  = 220; // px — diameter of the magnifier circle

const ProductImages: React.FC<ProductImagesProps> = ({ product, selectedColor }) => {
  const filteredImages = useMemo(() => {
    if (!product?.images || product.images.length === 0) return [];
    if (!selectedColor) return product.images;
    const colorFiltered = product.images.filter(
      img => img.color === selectedColor || img.color === null || img.color === undefined
    );
    return colorFiltered.length > 0 ? colorFiltered : product.images;
  }, [product?.images, selectedColor]);

  const [selectedImage, setSelectedImage] = useState(filteredImages[0]);
  const [isZooming, setIsZooming]         = useState(false);
  const [lensPos,   setLensPos]           = useState({ x: 0, y: 0 });
  // bgPos: pixel offset for background-image inside the lens
  const [bgPos,     setBgPos]             = useState({ x: 0, y: 0 });
  const [bgSize,    setBgSize]            = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filteredImages.length > 0) {
      const primary = filteredImages.find(img => img.is_primary);
      setSelectedImage(primary || filteredImages[0]);
    }
  }, [filteredImages]);

  // Keep container dimensions in sync
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      setBgSize({ w: el.offsetWidth * ZOOM_SCALE, h: el.offsetHeight * ZOOM_SCALE });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = e.clientX - rect.left;   // cursor x in container px
    const cy = e.clientY - rect.top;    // cursor y in container px

    setLensPos({ x: cx, y: cy });

    // Background offset: the cursor point of the SCALED image is centered in the lens
    setBgPos({
      x: -(cx * ZOOM_SCALE - LENS_SIZE / 2),
      y: -(cy * ZOOM_SCALE - LENS_SIZE / 2),
    });
  }, []);

  if (!product || !product.images || product.images.length === 0) {
    return <div className={styles.imagePlaceholder} aria-label="Зображення відсутнє" />;
  }

  return (
    <div className={styles.imageSection}>
      {/* Main image with magnifier */}
      <div
        ref={containerRef}
        className={`${styles.mainImageContainer} ${isZooming ? styles.zooming : ''}`}
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
      >
        {selectedImage ? (
          <>
            <Image
              key={selectedImage.id}
              src={selectedImage.image_url}
              alt={selectedImage.alt || product.name}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              className={styles.mainImage}
              priority
              quality={85}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
            />
            {isZooming && (
              <div
                className={styles.zoomLens}
                style={{
                  left: lensPos.x,
                  top:  lensPos.y,
                  backgroundImage:    `url(${selectedImage.image_url})`,
                  backgroundSize:     `${bgSize.w}px ${bgSize.h}px`,
                  backgroundPosition: `${bgPos.x}px ${bgPos.y}px`,
                }}
              />
            )}
          </>
        ) : (
          <div className={styles.imagePlaceholder} aria-label="Зображення відсутнє" />
        )}
      </div>

      {/* Carousel */}
      {filteredImages.length > 1 && (
        <div className={styles.carouselContainer}>
          {filteredImages.map((image) => {
            const isSelected = selectedImage && image.id === selectedImage.id;
            return (
              <button
                key={image.id}
                type="button"
                className={isSelected ? styles.thumbnailSelected : styles.thumbnail}
                onClick={() => setSelectedImage(image)}
                aria-label={image.alt || product.name}
              >
                {image.image_url ? (
                  <Image
                    src={image.image_url}
                    alt={image.alt || product.name}
                    width={80}
                    height={80}
                    sizes="80px"
                    className={styles.thumbnailImage}
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductImages;
