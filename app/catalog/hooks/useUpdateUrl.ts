// /app/catalog/hooks/useUpdateUrl.ts
import { useCallback, useMemo } from 'react';
import { PriceRange } from '@/app/lib/definitions';
import { FilterOptions } from '../types';
import { 
  useRenderCounter, 
  useDependencyTracker, 
  FilterPerformanceMonitor,
  useRenderPerformance 
} from '../utils/performanceMonitor';
import { useStabilityChecker, useLifecycleTracker } from '../utils/hookPerformanceTracker';

export const useUpdateUrl = (
  filters: FilterOptions, 
  priceRange: PriceRange, 
  sortOption: string, 
  slug: string | null // slug can be null if no category is selected
) => {
  // Performance monitoring
  const renderCount = useRenderCounter('useUpdateUrl');
  useRenderPerformance('useUpdateUrl');
  const { getLifetimeMs } = useLifecycleTracker('useUpdateUrl');
  
  // Memoize complex filter dependencies using primitive values and serialized strings
  const memoizedFilterDeps = useMemo(() => {
    const operationId = `memoize-filter-deps-${Date.now()}`;
    FilterPerformanceMonitor.startMeasurement(operationId, 'memoizeFilterDeps');
    
    const result = {
      // Convert arrays to stable strings for comparison (sorted for consistency)
      typeString: filters.type?.slice().sort().join(',') || '',
      materialString: filters.material?.slice().sort().join(',') || '',
      complectationString: filters.complectation?.slice().sort().join(',') || '',
      facadeMaterialString: filters.facadeMaterial?.slice().sort().join(',') || '',
      tabletopShapeString: filters.tabletopShape?.slice().sort().join(',') || '',
      statusString: filters.status?.slice().sort().join(',') || '',
      
      // Primitive string values
      size: filters.size || '',
      specifics: filters.specifics || '',
      backrest: filters.backrest || '',
      hardness: filters.hardness || '',
      
      // Primitive number values
      priceMin: filters.priceMin,
      priceMax: filters.priceMax
    };
    
    FilterPerformanceMonitor.endMeasurement(operationId, 'memoizeFilterDeps', {
      filterKeysCount: Object.keys(result).length
    });
    
    return result;
  }, [
    // Only depend on the actual array contents as sorted strings
    filters.type?.slice().sort().join(','),
    filters.material?.slice().sort().join(','),
    filters.complectation?.slice().sort().join(','),
    filters.facadeMaterial?.slice().sort().join(','),
    filters.tabletopShape?.slice().sort().join(','),
    filters.status?.slice().sort().join(','),
    
    // Primitive dependencies
    filters.size,
    filters.specifics,
    filters.backrest,
    filters.hardness,
    filters.priceMin,
    filters.priceMax
  ]);

  // Memoize price range primitive values
  const memoizedPriceRange = useMemo(() => ({
    min: priceRange.min,
    max: priceRange.max
  }), [priceRange.min, priceRange.max]);

  // Track dependency changes
  const trackedDependencies = useDependencyTracker({
    memoizedFilterDeps,
    memoizedPriceRange,
    sortOption,
    slug
  }, 'useUpdateUrl');

  return useCallback(() => {
    const operationId = `update-url-${Date.now()}`;
    FilterPerformanceMonitor.startMeasurement(operationId, 'updateURL');
    
    const params = new URLSearchParams();
    if (slug) {
      params.append("category", slug);
    }
    
    // Use memoized dependencies to rebuild filters object for URL generation
    // Safely access optional array-based filters
    if (memoizedFilterDeps.typeString) {
      memoizedFilterDeps.typeString.split(',').forEach(type => params.append("type", type));
    }
    if (memoizedFilterDeps.materialString) {
      memoizedFilterDeps.materialString.split(',').forEach(material => params.append("material", material));
    }
    if (memoizedFilterDeps.complectationString) {
      memoizedFilterDeps.complectationString.split(',').forEach(feature => params.append("feature", feature));
    }
    if (memoizedFilterDeps.facadeMaterialString) {
      memoizedFilterDeps.facadeMaterialString.split(',').forEach(fm => params.append("facadeMaterial", fm));
    }
    if (memoizedFilterDeps.tabletopShapeString) {
      memoizedFilterDeps.tabletopShapeString.split(',').forEach(ts => params.append("tabletopShape", ts));
    }
    if (memoizedFilterDeps.statusString) {
      memoizedFilterDeps.statusString.split(',').forEach(s => params.append("status", s));
    }
    
    // Handle optional string filters
    if (memoizedFilterDeps.size) {
      params.append("size", memoizedFilterDeps.size);
    }
    if (memoizedFilterDeps.specifics) {
      params.append("specifics", memoizedFilterDeps.specifics);
    }
    if (memoizedFilterDeps.backrest) {
      params.append("backrest", memoizedFilterDeps.backrest);
    }
    if (memoizedFilterDeps.hardness) {
      params.append("hardness", memoizedFilterDeps.hardness);
    }
    
    // Add price range filters - only if they're actually filtering (not the full range)
    const isPriceFilterActive = memoizedFilterDeps.priceMin !== null && memoizedFilterDeps.priceMax !== null && 
      memoizedPriceRange.max > 0 && 
      (memoizedFilterDeps.priceMin > memoizedPriceRange.min || memoizedFilterDeps.priceMax < memoizedPriceRange.max);
    
    if (isPriceFilterActive) { 
      params.append("minPrice", Math.floor(memoizedFilterDeps.priceMin!).toString());
      params.append("maxPrice", Math.floor(memoizedFilterDeps.priceMax!).toString());
    }
    
    // Add sort option if not default
    if (sortOption !== "rating_desc") {
      params.append("sort", sortOption);
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    
    FilterPerformanceMonitor.endMeasurement(operationId, 'updateURL', {
      urlLength: newUrl.length,
      paramCount: Array.from(params.keys()).length
    });
  }, [
    // Use stable primitive dependencies instead of complex objects
    memoizedFilterDeps.typeString,
    memoizedFilterDeps.materialString,
    memoizedFilterDeps.complectationString,
    memoizedFilterDeps.facadeMaterialString,
    memoizedFilterDeps.tabletopShapeString,
    memoizedFilterDeps.statusString,
    memoizedFilterDeps.size,
    memoizedFilterDeps.specifics,
    memoizedFilterDeps.backrest,
    memoizedFilterDeps.hardness,
    memoizedFilterDeps.priceMin,
    memoizedFilterDeps.priceMax,
    memoizedPriceRange.min,
    memoizedPriceRange.max,
    sortOption,
    slug
  ]);
};