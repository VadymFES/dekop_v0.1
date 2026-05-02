// /app/catalog/utils/memoizationHelpers.ts

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { FilterOptions, PriceRange } from '../types';
import { serializeFilters, createStableDependencies } from './stableDependencies';

/**
 * Utilities for memoization and dependency stabilization
 */

/**
 * Custom hook for creating stable callback with serialized dependencies
 * Prevents unnecessary re-renders by using serialized dependency comparison
 */
export const useStableCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T => {
  const serializedDeps = JSON.stringify(deps);
  
  return useCallback(callback, [serializedDeps]) as T;
};

/**
 * Custom hook for creating stable memoized value with serialized dependencies
 */
export const useStableMemo = <T>(
  factory: () => T,
  deps: unknown[]
): T => {
  const serializedDeps = JSON.stringify(deps);
  
  return useMemo(factory, [serializedDeps]);
};

/**
 * Hook for creating stable filter dependencies
 * Returns memoized filter values that only change when filters actually change
 */
export const useStableFilters = (filters: FilterOptions) => {
  return useMemo(() => ({
    typeString: filters.type?.slice().sort().join(',') || '',
    materialString: filters.material?.slice().sort().join(',') || '',
    complectationString: filters.complectation?.slice().sort().join(',') || '',
    statusString: filters.status?.slice().sort().join(',') || '',
    facadeMaterialString: filters.facadeMaterial?.slice().sort().join(',') || '',
    tabletopShapeString: filters.tabletopShape?.slice().sort().join(',') || '',
    size: filters.size,
    specifics: filters.specifics,
    backrest: filters.backrest,
    hardness: filters.hardness,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax
  }), [
    filters.type?.slice().sort().join(',') || '',
    filters.material?.slice().sort().join(',') || '',
    filters.complectation?.slice().sort().join(',') || '',
    filters.status?.slice().sort().join(',') || '',
    filters.facadeMaterial?.slice().sort().join(',') || '',
    filters.tabletopShape?.slice().sort().join(',') || '',
    filters.size,
    filters.specifics,
    filters.backrest,
    filters.hardness,
    filters.priceMin,
    filters.priceMax
  ]);
};

/**
 * Hook for creating stable URL update callback
 * Prevents infinite re-renders by stabilizing the updateURL function dependencies
 */
export const useStableUpdateUrl = (
  updateUrlFn: () => void,
  filters: FilterOptions,
  priceRange: PriceRange,
  sortOption: string,
  slug: string | null
) => {
  const stableDeps = createStableDependencies(filters, priceRange, sortOption, slug);
  
  return useCallback(updateUrlFn, [
    stableDeps.filtersHash,
    stableDeps.priceMin,
    stableDeps.priceMax,
    stableDeps.sortOption,
    stableDeps.slug
  ]);
};

/**
 * Hook for debounced value with cleanup
 * Useful for preventing excessive API calls or state updates
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Hook for creating stable effect dependencies
 * Prevents effects from running unnecessarily by stabilizing complex dependencies
 */
export const useStableEffectDeps = (deps: unknown[]) => {
  const serializedDeps = useMemo(() => JSON.stringify(deps), deps);
  return useMemo(() => deps, [serializedDeps]);
};

/**
 * Hook for previous value tracking
 * Useful for comparing current vs previous values to prevent unnecessary updates
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

/**
 * Hook for deep comparison memoization
 * Only updates when the deep structure of the value actually changes
 */
export const useDeepMemo = <T>(factory: () => T, deps: unknown[]): T => {
  const ref = useRef<{ deps: unknown[]; value: T } | undefined>(undefined);
  
  const hasChanged = !ref.current || 
    deps.length !== ref.current.deps.length ||
    deps.some((dep, index) => {
      const prevDep = ref.current!.deps[index];
      return JSON.stringify(dep) !== JSON.stringify(prevDep);
    });
  
  if (hasChanged) {
    ref.current = {
      deps: [...deps],
      value: factory()
    };
  }
  
  return ref.current!.value;
};

/**
 * Hook for stable object reference
 * Prevents object recreation when properties haven't changed
 */
export const useStableObject = <T extends Record<string, any>>(obj: T): T => {
  return useMemo(() => obj, [JSON.stringify(obj)]);
};

/**
 * Hook for cleanup function management
 * Ensures cleanup functions are called when dependencies change or component unmounts
 */
export const useCleanupEffect = (
  effect: () => (() => void) | void,
  deps: unknown[]
) => {
  const cleanupRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Call previous cleanup if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    // Run effect and store cleanup function
    const cleanup = effect();
    if (typeof cleanup === 'function') {
      cleanupRef.current = cleanup;
    }
    
    // Return cleanup for useEffect
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, deps);
};