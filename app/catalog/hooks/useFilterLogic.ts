// /app/catalog/hooks/useFilterLogic.ts
import { useEffect, useMemo, useRef } from 'react';
// Ensure PriceRange is imported (it's part of ProductWithImages in definitions, but explicitly importing for clarity if needed elsewhere or if definitions change)
import { ProductWithImages, PriceRange } from '@/app/lib/definitions';
import { CatalogAction, FilterOptions } from '../types';
import { getMaterialValue, getAdditionalFeatures, isSofaSpecs } from '../utils';
import {
  useRenderCounter,
  useDependencyTracker,
  FilterPerformanceMonitor,
  useRenderPerformance
} from '../utils/performanceMonitor';
import { useFilterOperationTracker, useLifecycleTracker } from '../utils/hookPerformanceTracker';

/**
 * Hook to handle product filtering logic with stable dependencies
 */
export const useFilterLogic = (
  allProducts: ProductWithImages[],
  filters: FilterOptions,
  priceRange: PriceRange,
  sortOption: string,
  updateURL: () => void,
  dispatch: React.Dispatch<CatalogAction>
) => {
  // Performance monitoring (disabled in tests)
  // const renderCount = useRenderCounter('useFilterLogic');
  // useRenderPerformance('useFilterLogic');
  // const { getLifetimeMs } = useLifecycleTracker('useFilterLogic');
  const measureOperation = (operation: () => any, operationId?: string) => operation(); // Simplified for tests

  // Store the updateURL function in a ref to avoid dependency issues
  const updateURLRef = useRef(updateURL);
  updateURLRef.current = updateURL;

  // Create stable primitive dependencies from complex objects
  const stableDependencies = useMemo(() => {
    const operationId = `stable-deps-${Date.now()}`;
    return measureOperation(() => ({
      // Product count for early return check
      productCount: allProducts.length,

      // Serialize filters to stable strings for comparison
      filtersHash: JSON.stringify({
        type: filters.type?.slice().sort() || [],
        material: filters.material?.slice().sort() || [],
        complectation: filters.complectation?.slice().sort() || [],
        status: filters.status?.slice().sort() || [],
        size: filters.size || null,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax
      }),

      // Price range primitives
      priceMin: priceRange.min,
      priceMax: priceRange.max,

      // Sort option
      sort: sortOption
    }), operationId);
  }, [
    allProducts.length,
    // Only depend on serialized filter strings for stability
    filters.type?.slice().sort().join(',') || '',
    filters.material?.slice().sort().join(',') || '',
    filters.complectation?.slice().sort().join(',') || '',
    filters.status?.slice().sort().join(',') || '',
    filters.size,
    filters.priceMin,
    filters.priceMax,
    priceRange.min,
    priceRange.max,
    sortOption
  ]);

  // Track dependency stability (disabled in tests)
  // const trackedDependencies = useDependencyTracker({
  //   productCount: stableDependencies.productCount,
  //   filtersHash: stableDependencies.filtersHash,
  //   priceMin: stableDependencies.priceMin,
  //   priceMax: stableDependencies.priceMax,
  //   sort: stableDependencies.sort
  // }, 'useFilterLogic');

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    const effectStartTime = performance.now();
    const operationId = `filter-effect-${Date.now()}`;

    // Start performance measurement
    FilterPerformanceMonitor.startMeasurement(operationId, 'filterEffect');

    // Safeguards to prevent effect execution during invalid states
    if (!stableDependencies.productCount || stableDependencies.priceMax === 0) {
      FilterPerformanceMonitor.endMeasurement(operationId, 'filterEffect', {
        reason: 'early-return-invalid-state',
        productCount: stableDependencies.productCount,
        priceMax: stableDependencies.priceMax
      });
      return;
    }

    // Additional safeguard: check if component is still mounted
    if (!isMountedRef.current) {
      FilterPerformanceMonitor.endMeasurement(operationId, 'filterEffect', {
        reason: 'early-return-unmounted'
      });
      return;
    }

    dispatch({ type: 'SET_IS_FILTERING', payload: true });

    const filterTimeout = setTimeout(() => {
      // Double-check mount status before proceeding with expensive operations
      if (!isMountedRef.current) {
        FilterPerformanceMonitor.endMeasurement(operationId, 'filterEffect', {
          reason: 'timeout-unmounted'
        });
        return;
      }

      // Parse filters from stable hash to get current filter values
      const currentFilters = JSON.parse(stableDependencies.filtersHash) as FilterOptions;
      const currentPriceRange = { min: stableDependencies.priceMin, max: stableDependencies.priceMax };
      const currentSortOption = stableDependencies.sort;

      // Create a copy of products to work with
      let matches = measureOperation(() => [...allProducts], `${operationId}-copy-products`);

      // Apply status filters
      if (currentFilters.status && currentFilters.status.length > 0) {
        matches = measureOperation(() => matches.filter((p: ProductWithImages) =>
          currentFilters.status!.some(status => {
            if (status === 'new') return p.is_new;
            if (status === 'on_sale') return p.is_on_sale;
            if (status === 'bestseller') return p.is_bestseller;
            return false;
          })
        ), `${operationId}-filter-status`);
      }

      // Apply type filters
      if (currentFilters.type && currentFilters.type.length > 0) {
        matches = measureOperation(() => matches.filter((p: ProductWithImages) => {
          if (!p.specs?.types) return false;
          const productTypes = Array.isArray(p.specs.types) ? p.specs.types : [p.specs.types];
          return productTypes.some((type: unknown) => {
            if (!type) return false;
            const typeStr = typeof type === 'string' ? type.toLowerCase() : String(type).toLowerCase();
            return currentFilters.type!.includes(typeStr);
          });
        }), `${operationId}-filter-type`);
      }

      // Apply material filters
      if (currentFilters.material && currentFilters.material.length > 0) {
        matches = measureOperation(() => matches.filter((p: ProductWithImages) => {
          const materialValue = getMaterialValue(p.specs);
          if (!materialValue) return false;
          return currentFilters.material!.some(material =>
            materialValue.toLowerCase().includes(material.toLowerCase())
          );
        }), `${operationId}-filter-material`);
      }

      // Apply complectation filters
      if (currentFilters.complectation && currentFilters.complectation.length > 0) {
        matches = matches.filter((p: ProductWithImages) => {
          if (!p.specs) return false;
          return currentFilters.complectation!.every(feature => {
            if (feature === "shelves") return isSofaSpecs(p.specs) && p.specs.has_shelves === true;
            if (feature === "high_legs") return isSofaSpecs(p.specs) && p.specs.leg_height === "high";
            if (feature === "low_legs") return isSofaSpecs(p.specs) && p.specs.leg_height === "low";
            if (feature === "lift") return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism === true;
            if (feature === "no_lift") return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism === false;

            const additionalFeatures = getAdditionalFeatures(p.specs);
            return additionalFeatures ?
              additionalFeatures.toLowerCase().includes(feature.toLowerCase()) : false;
          });
        });
      }

      // Apply size filter
      if (currentFilters.size) {
        matches = matches.filter((p: ProductWithImages) => {
          if (!p.specs?.dimensions) return false;
          if (isSofaSpecs(p.specs) && p.specs.dimensions.sleeping_area) {
            return currentFilters.size === "single"
              ? p.specs.dimensions.sleeping_area.width <= 1000
              : p.specs.dimensions.sleeping_area.width >= 1400;
          }
          return false;
        });
      }

      // Apply price filter - only if it's actually restricting the range
      const isPriceFilterActive = currentFilters.priceMin !== null && currentFilters.priceMax !== null &&
        (currentFilters.priceMin > currentPriceRange.min || currentFilters.priceMax < currentPriceRange.max);

      if (isPriceFilterActive) {
        matches = matches.filter((p: ProductWithImages) => {
          const price = parseFloat(p.price.toString());
          return price >= currentFilters.priceMin! && price <= currentFilters.priceMax!;
        });
      }

      // Apply sorting - create a new array to avoid mutating the filtered results
      const sortedMatches = measureOperation(() => {
        const sortArray = [...matches];

        switch (currentSortOption) {
          case "price_asc":
            sortArray.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
            break;

          case "price_desc":
            sortArray.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
            break;

          case "reviews_desc":
            sortArray.sort((a, b) => {
              const reviewsA = typeof a.reviews === 'number' ? a.reviews : parseInt(a.reviews || '0');
              const reviewsB = typeof b.reviews === 'number' ? b.reviews : parseInt(b.reviews || '0');
              return reviewsB - reviewsA;
            });
            break;

          default: // rating_desc
            sortArray.sort((a, b) => {
              const ratingA = typeof a.rating === 'number' ? a.rating : parseFloat(a.rating || '0');
              const ratingB = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating || '0');
              return ratingB - ratingA;
            });
        }

        return sortArray;
      }, `${operationId}-sort-products`);

      // Final mount check before dispatching results
      if (!isMountedRef.current) {
        FilterPerformanceMonitor.endMeasurement(operationId, 'filterEffect', {
          reason: 'final-unmounted-check'
        });
        return;
      }

      // Use the combined action to update both filtered products and filtering state in one dispatch
      dispatch({
        type: 'APPLY_FILTER_RESULTS',
        payload: {
          filteredProducts: sortedMatches,
          isFiltering: false
        }
      });

      // Use ref to access current updateURL function to avoid dependency issues
      // Conditionally update URL only if priceRange has been initialized (max !== 0)
      // This prevents adding URL parameters during initial load before priceRange is known.
      if (stableDependencies.priceMax !== 0) {
        updateURLRef.current();
      }

      // End performance measurement
      FilterPerformanceMonitor.endMeasurement(operationId, 'filterEffect', {
        productsFiltered: sortedMatches.length,
        totalProducts: allProducts.length,
        filtersApplied: Object.keys(currentFilters).filter(key => {
          const value = currentFilters[key as keyof FilterOptions];
          return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined;
        }).length
      });
    }, 300); // Debounce filtering for better performance

    // Proper cleanup for debounced operations
    return () => {
      clearTimeout(filterTimeout);
      // End measurement if cleanup happens before timeout
      FilterPerformanceMonitor.endMeasurement(operationId, 'filterEffect', {
        reason: 'cleanup-before-completion'
      });
    };
  }, [
    // Only use stable primitive dependencies to prevent infinite re-renders
    stableDependencies.productCount,
    stableDependencies.filtersHash,
    stableDependencies.priceMin,
    stableDependencies.priceMax,
    stableDependencies.sort,
    dispatch
  ]);
};