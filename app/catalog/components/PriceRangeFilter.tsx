// /app/catalog/components/PriceRangeFilter.tsx
import React, { useRef } from 'react';
import styles from '../catalog.module.css';
import { PriceRangeFilterProps } from '../types';
import { DebugLogger, safeDOMAccess, safeEventListener } from '../utils/debugLogger';

// Constants for price range configuration
const PRICE_STEP = 500;
const MIN_PRICE_GAP = 500;

// Safe DOM access utility function using centralized logger
const safeGetBoundingRect = (element: HTMLElement | null): DOMRect | null => {
  const result = safeDOMAccess(
    () => {
      if (!element) {
        throw new Error('DOM element not available');
      }

      const rect = element.getBoundingClientRect();

      // Validate rect has meaningful dimensions
      if (rect.width === 0 || rect.height === 0) {
        DebugLogger.domWarning('DOM element has invalid dimensions', {
          component: 'PriceRangeFilter',
          action: 'getBoundingClientRect',
          data: { width: rect.width, height: rect.height }
        });
        return null;
      }

      return rect;
    },
    'PriceRangeFilter',
    'getBoundingClientRect',
    null
  );

  return result || null;
};

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  title,
  priceRange,
  filterValues,
  onPriceChange
}) => {

  const rangeRef = useRef<HTMLDivElement>(null);

  // Comprehensive validation of required props
  if (!priceRange || priceRange.min === undefined || priceRange.max === undefined ||
    !filterValues || filterValues.priceMin === undefined || filterValues.priceMax === undefined) {
    DebugLogger.domWarning('Missing required price range or filter values', {
      component: 'PriceRangeFilter',
      action: 'validation',
      data: { priceRange, filterValues }
    });
    return null;
  }

  // Validate price range values are finite numbers
  if (!isFinite(priceRange.min) || !isFinite(priceRange.max) ||
      !isFinite(filterValues.priceMin) || !isFinite(filterValues.priceMax)) {
    DebugLogger.domWarning('Invalid price values detected', {
      component: 'PriceRangeFilter',
      action: 'validation',
      data: {
        priceRange: { min: priceRange.min, max: priceRange.max },
        filterValues: { priceMin: filterValues.priceMin, priceMax: filterValues.priceMax }
      }
    });
    return null;
  }

  // Don't render if price range is 0,0 (no valid products)
  if (priceRange.min === 0 && priceRange.max === 0) {
    return null;
  }

  // Don't render if filter values are both 0 (not initialized)
  if (filterValues.priceMin === 0 && filterValues.priceMax === 0) {
    return null;
  }

  // Validate price range makes sense
  if (priceRange.max <= priceRange.min) {
    DebugLogger.domWarning('Invalid price range - max must be greater than min', {
      component: 'PriceRangeFilter',
      action: 'validation',
      data: { min: priceRange.min, max: priceRange.max }
    });
    return null;
  }

  // Calculate percentage positions for slider thumbs with safe math and bounds
  const priceRangeSpan = priceRange.max - priceRange.min;
  const minPercentage = priceRangeSpan > 0 ?
    Math.max(0, Math.min(100, ((filterValues.priceMin - priceRange.min) / priceRangeSpan) * 100)) : 0;

  const maxPercentage = priceRangeSpan > 0 ?
    Math.max(0, Math.min(100, ((filterValues.priceMax - priceRange.min) / priceRangeSpan) * 100)) : 100;

  // Enhanced price handle drag functionality with defensive DOM access
  const handlePriceThumbDrag = (thumb: "min" | "max", e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    // Comprehensive null checks and safe DOM access
    const trackElement = rangeRef.current;
    if (!trackElement) {
      DebugLogger.domWarning('Track element not available for drag operation', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag'
      });
      return;
    }

    // Use safe DOM access utility
    const trackRect = safeGetBoundingRect(trackElement);
    if (!trackRect) {
      DebugLogger.domWarning('Unable to get track dimensions for drag operation', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag'
      });
      return;
    }

    // Validate track dimensions are meaningful for calculations
    const trackWidth = trackRect.width;
    if (trackWidth <= 0) {
      DebugLogger.domWarning('Invalid track width for drag calculations', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag',
        data: { trackWidth }
      });
      return;
    }

    // Get initial position and validate event data
    const startX = e.clientX;
    if (typeof startX !== 'number' || !isFinite(startX)) {
      DebugLogger.domWarning('Invalid mouse position data', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag',
        data: { startX }
      });
      return;
    }

    const startValue = thumb === "min" ? filterValues.priceMin : filterValues.priceMax;
    const valueRange = priceRange.max - priceRange.min;

    // Validate price range data
    if (valueRange <= 0) {
      DebugLogger.domWarning('Invalid price range for calculations', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag',
        data: { valueRange, priceRange }
      });
      return;
    }

    // Handle mouse movement with error handling
    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      try {
        // Validate mouse event data
        if (typeof moveEvent.clientX !== 'number' || !isFinite(moveEvent.clientX)) {
          DebugLogger.domWarning('Invalid mouse position in move event', {
            component: 'PriceRangeFilter',
            action: 'handleMouseMove',
            data: { clientX: moveEvent.clientX }
          });
          return;
        }

        // Calculate delta movement as a percentage of track width
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = deltaX / trackWidth;
        const deltaValue = deltaPercent * valueRange;

        // Calculate new value based on thumb being dragged
        let newValue = startValue + deltaValue;

        // Validate calculated value
        if (!isFinite(newValue)) {
          DebugLogger.domWarning('Invalid calculated price value', {
            component: 'PriceRangeFilter',
            action: 'handleMouseMove',
            data: { newValue, deltaValue, startValue }
          });
          return;
        }

        // Round to nearest step
        newValue = Math.round(newValue / PRICE_STEP) * PRICE_STEP;

        if (thumb === "min") {
          // Constrain min value between price range min and current max value minus minimum gap
          newValue = Math.max(priceRange.min, Math.min(newValue, filterValues.priceMax - MIN_PRICE_GAP));
          onPriceChange("min", newValue);
        } else {
          // Constrain max value between current min value plus minimum gap and price range max
          newValue = Math.min(priceRange.max, Math.max(newValue, filterValues.priceMin + MIN_PRICE_GAP));
          onPriceChange("max", newValue);
        }
      } catch (error) {
        DebugLogger.domError('Error in mouse move handler', {
          component: 'PriceRangeFilter',
          action: 'handleMouseMove',
          error: error as Error
        });
      }
    };

    // Handle mouse up - remove event listeners with error handling
    const handleMouseUp = () => {
      try {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        DebugLogger.cleanup('Removed drag event listeners', {
          component: 'PriceRangeFilter',
          action: 'handleMouseUp'
        });
      } catch (error) {
        DebugLogger.domError('Error removing event listeners', {
          component: 'PriceRangeFilter',
          action: 'handleMouseUp',
          error: error as Error
        });
      }
    };

    // Add event listeners for drag operation with error handling
    try {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      DebugLogger.debug('Added drag event listeners', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag'
      });
    } catch (error) {
      DebugLogger.domError('Error adding event listeners', {
        component: 'PriceRangeFilter',
        action: 'handlePriceThumbDrag',
        error: error as Error
      });
      return;
    }
  };

  return (
    <div className={styles.filterSection}>
      <h3 className={styles.filterTitle}>{title}</h3>
      <div className={styles.priceRangeContainer} ref={rangeRef}>
        <div className={styles.priceTrack}>
          {/* Price indicator bubbles with error-safe event handlers */}
          <div
            className={`${styles.priceBubble} ${styles.priceBubbleMin}`}
            style={{ left: `${minPercentage}%`, cursor: 'grab' }}
            onMouseDown={(e) => {
              try {
                handlePriceThumbDrag("min", e);
              } catch (error) {
                DebugLogger.domError('Error in min bubble drag handler', {
                  component: 'PriceRangeFilter',
                  action: 'onMouseDown (min bubble)',
                  error: error as Error
                });
              }
            }}
          >
            {Math.round(filterValues.priceMin)}
          </div>
          <div
            className={`${styles.priceBubble} ${styles.priceBubbleMax}`}
            style={{ left: `${maxPercentage}%`, cursor: 'grab' }}
            onMouseDown={(e) => {
              try {
                handlePriceThumbDrag("max", e);
              } catch (error) {
                DebugLogger.domError('Error in max bubble drag handler', {
                  component: 'PriceRangeFilter',
                  action: 'onMouseDown (max bubble)',
                  error: error as Error
                });
              }
            }}
          >
            {Math.round(filterValues.priceMax)}
          </div>

          <div
            className={styles.priceFill}
            style={{
              left: `${minPercentage}%`,
              width: `${Math.max(0, maxPercentage - minPercentage)}%`,
            }}
          />
          <div
            className={styles.priceThumb}
            style={{ left: `${minPercentage}%` }}
            onMouseDown={(e) => {
              try {
                handlePriceThumbDrag("min", e);
              } catch (error) {
                DebugLogger.domError('Error in min thumb drag handler', {
                  component: 'PriceRangeFilter',
                  action: 'onMouseDown (min thumb)',
                  error: error as Error
                });
              }
            }}
          />
          <div
            className={styles.priceThumb}
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={(e) => {
              try {
                handlePriceThumbDrag("max", e);
              } catch (error) {
                DebugLogger.domError('Error in max thumb drag handler', {
                  component: 'PriceRangeFilter',
                  action: 'onMouseDown (max thumb)',
                  error: error as Error
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
