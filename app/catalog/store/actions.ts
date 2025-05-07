// /app/catalog/store/actions.ts
import { CatalogAction } from '../types';
import { PriceRange, FilterOptions } from '../types';
import { ProductWithImages } from '@/app/lib/definitions';

/**
 * Set loading state
 */
export const setLoading = (isLoading: boolean): CatalogAction => ({
  type: 'SET_LOADING',
  payload: isLoading
});

/**
 * Set error state
 */
export const setError = (error: string | null): CatalogAction => ({
  type: 'SET_ERROR',
  payload: error
});

/**
 * Set all products
 */
export const setAllProducts = (products: ProductWithImages[]): CatalogAction => ({
  type: 'SET_ALL_PRODUCTS',
  payload: products
});

/**
 * Set filtered products
 */
export const setFilteredProducts = (products: ProductWithImages[]): CatalogAction => ({
  type: 'SET_FILTERED_PRODUCTS',
  payload: products
});

/**
 * Set price range
 */
export const setPriceRange = (range: PriceRange): CatalogAction => ({
  type: 'SET_PRICE_RANGE',
  payload: range
});

/**
 * Update filters
 */
export const setFilters = (filterUpdates: Partial<FilterOptions>): CatalogAction => ({
  type: 'SET_FILTERS',
  payload: filterUpdates
});

/**
 * Reset all filters
 */
export const resetFilters = (priceRange: PriceRange): CatalogAction => ({
  type: 'RESET_FILTERS',
  payload: priceRange
});

/**
 * Set sort option
 */
export const setSortOption = (sortOption: string): CatalogAction => ({
  type: 'SET_SORT_OPTION',
  payload: sortOption
});

/**
 * Set filtering state
 */
export const setIsFiltering = (isFiltering: boolean): CatalogAction => ({
  type: 'SET_IS_FILTERING',
  payload: isFiltering
});