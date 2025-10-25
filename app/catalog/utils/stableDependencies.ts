// /app/catalog/utils/stableDependencies.ts

import { FilterOptions, PriceRange } from '../types';

/**
 * TypeScript interfaces for stable dependency structures
 */
export interface StableDependencies {
  // Primitive values for stable comparison
  filtersHash: string;        // JSON.stringify(filters)
  priceMin: number;
  priceMax: number;
  sortOption: string;
  slug: string | null;
}

export interface MemoizedFilters {
  // Serialized arrays for stable comparison
  typeString: string;         // filters.type?.join(',') || ''
  materialString: string;     // filters.material?.join(',') || ''
  complectationString: string; // filters.complectation?.join(',') || ''
  statusString: string;       // filters.status?.join(',') || ''
  facadeMaterialString: string; // filters.facadeMaterial?.join(',') || ''
  tabletopShapeString: string; // filters.tabletopShape?.join(',') || ''
  // Primitive values
  size: string | null;
  specifics: string | null;
  backrest: string | null;
  hardness: string | null;
  priceMin: number | null;
  priceMax: number | null;
}

export interface SerializedFilterState {
  filters: MemoizedFilters;
  priceRange: PriceRange;
  sortOption: string;
  slug: string | null;
}

/**
 * Helper functions for serializing filter objects
 */

/**
 * Serializes filter objects into stable string representations
 * This prevents unnecessary re-renders by creating consistent hash values
 */
export const serializeFilters = (filters: FilterOptions): string => {
  // Create a stable object with sorted arrays to ensure consistent serialization
  const stableFilters = {
    type: filters.type?.slice().sort() || null,
    material: filters.material?.slice().sort() || null,
    complectation: filters.complectation?.slice().sort() || null,
    facadeMaterial: filters.facadeMaterial?.slice().sort() || null,
    tabletopShape: filters.tabletopShape?.slice().sort() || null,
    status: filters.status?.slice().sort() || null,
    size: filters.size || null,
    specifics: filters.specifics || null,
    backrest: filters.backrest || null,
    hardness: filters.hardness || null,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax
  };
  
  return JSON.stringify(stableFilters);
};

/**
 * Creates memoized filter structure with stable string representations
 */
export const createMemoizedFilters = (filters: FilterOptions): MemoizedFilters => {
  return {
    typeString: filters.type?.slice().sort().join(',') || '',
    materialString: filters.material?.slice().sort().join(',') || '',
    complectationString: filters.complectation?.slice().sort().join(',') || '',
    statusString: filters.status?.slice().sort().join(',') || '',
    facadeMaterialString: filters.facadeMaterial?.slice().sort().join(',') || '',
    tabletopShapeString: filters.tabletopShape?.slice().sort().join(',') || '',
    size: filters.size || null,
    specifics: filters.specifics || null,
    backrest: filters.backrest || null,
    hardness: filters.hardness || null,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax
  };
};

/**
 * Creates stable dependency object for useCallback/useMemo dependencies
 */
export const createStableDependencies = (
  filters: FilterOptions,
  priceRange: PriceRange,
  sortOption: string,
  slug: string | null
): StableDependencies => {
  return {
    filtersHash: serializeFilters(filters),
    priceMin: priceRange.min,
    priceMax: priceRange.max,
    sortOption,
    slug
  };
};

/**
 * Compares two filter objects for deep equality
 * Useful for preventing unnecessary updates when filters haven't actually changed
 */
export const areFiltersEqual = (filters1: FilterOptions, filters2: FilterOptions): boolean => {
  return serializeFilters(filters1) === serializeFilters(filters2);
};

/**
 * Compares two price ranges for equality
 */
export const arePriceRangesEqual = (range1: PriceRange, range2: PriceRange): boolean => {
  return range1.min === range2.min && range1.max === range2.max;
};

/**
 * Creates a stable serialized state for complex dependency tracking
 */
export const serializeFilterState = (
  filters: FilterOptions,
  priceRange: PriceRange,
  sortOption: string,
  slug: string | null
): string => {
  const state: SerializedFilterState = {
    filters: createMemoizedFilters(filters),
    priceRange,
    sortOption,
    slug
  };
  
  return JSON.stringify(state);
};