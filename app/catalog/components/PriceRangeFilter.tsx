// /app/catalog/components/PriceRangeFilter.tsx
import React, { useRef } from 'react';
import styles from '../catalog.module.css';
import { PriceRangeFilterProps } from '../types';

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({ 
  title, 
  priceRange, 
  filterValues, 
  onPriceChange 
}) => {

  const rangeRef = useRef<HTMLDivElement>(null);

  if (!priceRange || priceRange.min === undefined || priceRange.max === undefined ||
    filterValues.priceMin === undefined || filterValues.priceMax === undefined) {
  return null;
}
  
  // Calculate percentage positions for slider thumbs
  const minPercentage = priceRange.max > priceRange.min ?
    ((filterValues.priceMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 0;
  
  const maxPercentage = priceRange.max > priceRange.min ?
    ((filterValues.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 100;

  // Enhanced price handle drag functionality
  const handlePriceThumbDrag = (thumb: "min" | "max", e: React.MouseEvent): void => {
    e.preventDefault();
    
    // Get initial position
    const startX = e.clientX;
    const trackRect = rangeRef.current?.getBoundingClientRect();
    if (!trackRect) return;
    
    const trackWidth = trackRect.width;
    const startValue = thumb === "min" ? filterValues.priceMin : filterValues.priceMax;
    const valueRange = priceRange.max - priceRange.min;
    const priceStep = 500; // Step size for price adjustment
    
    // Handle mouse movement
    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      // Calculate delta movement as a percentage of track width
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = deltaX / trackWidth;
      const deltaValue = deltaPercent * valueRange;
      
      // Calculate new value based on thumb being dragged
      let newValue = startValue + deltaValue;

      newValue = Math.round(newValue / priceStep) * priceStep;
      
      if (thumb === "min") {
        // Constrain min value between price range min and current max value
        newValue = Math.max(priceRange.min, Math.min(newValue, filterValues.priceMax - priceStep));
        onPriceChange("min", newValue);
      } else {
        // Constrain max value between current min value and price range max
        newValue = Math.min(priceRange.max, Math.max(newValue, filterValues.priceMin + priceStep));
        onPriceChange("max", newValue);
      }
    };
    
    // Handle mouse up - remove event listeners
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    // Add event listeners for drag operation
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  
  return (
    <div className={styles.filterSection}>
      <h3 className={styles.filterTitle}>{title}</h3>
      <div className={styles.priceRangeContainer} ref={rangeRef}>
        <div className={styles.priceTrack}>
          <div
            className={styles.priceFill}
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`,
            }}
          />
          <div
            className={styles.priceThumb}
            style={{ left: `${minPercentage}%` }}
            onMouseDown={(e) => handlePriceThumbDrag("min", e)}
          />
          <div
            className={styles.priceThumb}
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={(e) => handlePriceThumbDrag("max", e)}
          />
        </div>
        <div className={styles.priceLabels}>
          <span>{Math.round(filterValues.priceMin)} грн</span>
          <span>{Math.round(filterValues.priceMax)} грн</span>
        </div>
      </div>
    </div>
  );
};