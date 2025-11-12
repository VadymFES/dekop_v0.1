import React, { useRef, useState } from 'react';
import styles from '../catalog.module.css';
import { PriceRangeFilterProps } from '../types';

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  title,
  priceRange,
  filterValues,
  onPriceChange
}) => {

  const rangeRef = useRef<HTMLDivElement>(null);

  // Track temporary drag values (only committed on mouse up)
  const [isDragging, setIsDragging] = useState(false);
  const [tempPriceMin, setTempPriceMin] = useState<number | null>(null);
  const [tempPriceMax, setTempPriceMax] = useState<number | null>(null);

  if (!priceRange || priceRange.min === undefined || priceRange.max === undefined ||
    filterValues.priceMin === undefined || filterValues.priceMax === undefined) {
    return null;
  }

  // Use temporary values during drag, otherwise use actual filter values
  const currentMinPrice = isDragging && tempPriceMin !== null ? tempPriceMin : filterValues.priceMin;
  const currentMaxPrice = isDragging && tempPriceMax !== null ? tempPriceMax : filterValues.priceMax;

  // Calculate percentage positions for slider thumbs
  const minPercentage = priceRange.max > priceRange.min ?
    ((currentMinPrice - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 0;

  const maxPercentage = priceRange.max > priceRange.min ?
    ((currentMaxPrice - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 100;

  // Enhanced price handle drag functionality
  // Only applies filter on mouse up, not during dragging
  const handlePriceThumbDrag = (thumb: "min" | "max", e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    // Start dragging state
    setIsDragging(true);

    // Get initial position
    const startX = e.clientX;
    const trackRect = rangeRef.current?.getBoundingClientRect();
    if (!trackRect) return;

    const trackWidth = trackRect.width;
    const startValue = thumb === "min" ? filterValues.priceMin : filterValues.priceMax;
    const valueRange = priceRange.max - priceRange.min;
    const priceStep = 500; // Step size for price adjustment

    // Capture current min/max at start of drag for constraints
    const dragStartMin = filterValues.priceMin;
    const dragStartMax = filterValues.priceMax;

    // Store the final value to commit on mouse up
    let finalValue = startValue;

    // Handle mouse movement - update temporary values only
    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      // Calculate delta movement as a percentage of track width
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = deltaX / trackWidth;
      const deltaValue = deltaPercent * valueRange;

      // Calculate new value based on thumb being dragged
      let newValue = startValue + deltaValue;

      newValue = Math.round(newValue / priceStep) * priceStep;

      if (thumb === "min") {
        // Constrain min value between price range min and max value at drag start
        const constrainedValue = Math.max(priceRange.min, Math.min(newValue, dragStartMax - priceStep));
        finalValue = constrainedValue;
        // Update temporary state for visual feedback
        setTempPriceMin(constrainedValue);
      } else {
        // Constrain max value between min value at drag start and price range max
        const constrainedValue = Math.min(priceRange.max, Math.max(newValue, dragStartMin + priceStep));
        finalValue = constrainedValue;
        // Update temporary state for visual feedback
        setTempPriceMax(constrainedValue);
      }
    };

    // Handle mouse up - commit the final value and remove event listeners
    const handleMouseUp = () => {
      // Stop dragging state
      setIsDragging(false);

      // Reset temporary values
      setTempPriceMin(null);
      setTempPriceMax(null);

      // Only apply filter if value actually changed
      if (thumb === "min" && finalValue !== filterValues.priceMin) {
        onPriceChange("min", finalValue);
      } else if (thumb === "max" && finalValue !== filterValues.priceMax) {
        onPriceChange("max", finalValue);
      }

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
          {/* Price indicator bubbles*/}
          <div
            className={`${styles.priceBubble} ${styles.priceBubbleMin}`}
            style={{ left: `${minPercentage}%`, cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handlePriceThumbDrag("min", e)}
          >
            {Math.round(currentMinPrice)}
          </div>
          <div
            className={`${styles.priceBubble} ${styles.priceBubbleMax}`}
            style={{ left: `${maxPercentage}%`, cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handlePriceThumbDrag("max", e)}
          >
            {Math.round(currentMaxPrice)}
          </div>

          <div
            className={styles.priceFill}
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`,
            }}
          />
          <div
            className={styles.priceThumb}
            style={{ left: `${minPercentage}%`, cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handlePriceThumbDrag("min", e)}
          />
          <div
            className={styles.priceThumb}
            style={{ left: `${maxPercentage}%`, cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handlePriceThumbDrag("max", e)}
          />
        </div>
      </div>
    </div>
  );
};