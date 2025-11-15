// /app/catalog/hooks/useProductFilters.ts
/**
 * Custom hook for stable product filtering
 *
 * Architecture:
 * 1. URL is the single source of truth for filter state
 * 2. All filtering happens server-side via API
 * 3. User actions → Update URL → Fetch data (unidirectional flow)
 * 4. No circular dependencies or infinite loops
 *
 * Key stability features:
 * - Memoized filter extraction from URL
 * - AbortController for request cancellation
 * - Stable callback references with useCallback
 * - Conditional state updates to prevent unnecessary re-renders
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductWithImages } from '@/app/lib/definitions';
import { FilterOptions, PriceRange } from '../types';

interface UseProductFiltersReturn {
  products: ProductWithImages[];
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  priceRange: PriceRange;
  sortOption: string;
  updateFilter: (filterType: keyof FilterOptions, value: string | string[] | number | null) => void;
  updatePriceRange: (min: number, max: number) => void;
  updateSort: (sort: string) => void;
  resetFilters: () => void;
  clearFilter: (filterType: string, value: string) => void;
}

export function useProductFilters(dbCategory: string | null): UseProductFiltersReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [allProducts, setAllProducts] = useState<ProductWithImages[]>([]); // All fetched products
  const [products, setProducts] = useState<ProductWithImages[]>([]); // Filtered products
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 0 });

  // Extract filters from URL (memoized to prevent reference changes)
  // If no price filters in URL, use the full price range from fetched products
  const filters = useMemo((): FilterOptions => {
    const urlPriceMin = searchParams?.get('minPrice');
    const urlPriceMax = searchParams?.get('maxPrice');

    return {
      type: searchParams?.getAll('type') || [],
      material: searchParams?.getAll('material') || [],
      complectation: searchParams?.getAll('feature') || [],
      facadeMaterial: [],
      specifics: null,
      tabletopShape: [],
      size: searchParams?.get('size') || null,
      backrest: null,
      hardness: null,
      // Use URL value if present, otherwise use full range (defaults to range after products load)
      priceMin: urlPriceMin ? Number(urlPriceMin) : priceRange.min,
      priceMax: urlPriceMax ? Number(urlPriceMax) : priceRange.max,
      status: searchParams?.getAll('status') || [],
    };
  }, [searchParams, priceRange]);

  // Extract sort option from URL (memoized)
  const sortOption = useMemo(() => {
    return searchParams?.get('sort') || 'rating_desc';
  }, [searchParams]);

  // Memoized non-price filter params (for fetch dependency)
  // Price changes should NOT trigger re-fetch since price is filtered client-side
  const nonPriceParams = useMemo(() => {
    if (!searchParams) return '';

    const params = new URLSearchParams();
    const category = searchParams.get('category');
    if (category) params.set('category', category);

    searchParams.getAll('status').forEach(v => params.append('status', v));
    searchParams.getAll('type').forEach(v => params.append('type', v));
    searchParams.getAll('material').forEach(v => params.append('material', v));
    searchParams.getAll('feature').forEach(v => params.append('feature', v));

    const size = searchParams.get('size');
    if (size) params.set('size', size);

    // Explicitly exclude minPrice and maxPrice

    return params.toString();
  }, [searchParams]);

  // Stable URL update function
  const updateURLParams = useCallback((newParams: Record<string, string | string[]>) => {
    const params = new URLSearchParams();

    // Always preserve category if it exists
    const category = searchParams?.get('category');
    if (category) {
      params.set('category', category);
    }

    // Add new parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (v) params.append(key, v);
        });
      } else if (value) {
        params.set(key, value);
      }
    });

    // Update URL without page reload
    const newURL = params.toString() ? `/catalog?${params.toString()}` : '/catalog';
    router.push(newURL);
  }, [router, searchParams]);

  // Fetch products when URL parameters change
  useEffect(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build API query params from URL search params directly
        const params = new URLSearchParams();
        if (dbCategory) params.append("category", dbCategory);

        // Extract filters from URL (excluding price - handled client-side)
        const statusFilters = searchParams?.getAll('status') || [];
        const typeFilters = searchParams?.getAll('type') || [];
        const materialFilters = searchParams?.getAll('material') || [];
        const featureFilters = searchParams?.getAll('feature') || [];
        const sizeFilter = searchParams?.get('size');
        // Note: Price filters NOT sent to API - applied client-side for instant filtering

        // Add filters to API params (excluding price)
        statusFilters.forEach(status => params.append("status", status));
        typeFilters.forEach(type => params.append("type", type));
        materialFilters.forEach(material => params.append("material", material));
        featureFilters.forEach(feature => params.append("feature", feature));
        if (sizeFilter) params.append("size", sizeFilter);

        // Fetch products from API
        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Упс! Щось пішло не так. Спробуйте оновити сторінку.");
        }

        const data = await response.json();

        // Only update state if request wasn't aborted
        if (!abortController.signal.aborted) {
          // Store all products (price filtering happens in separate effect)
          setAllProducts(data);

          // Calculate price range from ALL fetched products
          if (data.length > 0) {
            const prices = data
              .map((p: { price: number | string }) => parseFloat(p.price.toString()))
              .filter((p: number) => p > 0);

            if (prices.length > 0) {
              const min = Math.min(...prices);
              const max = Math.max(...prices);

              // Only update price range if it actually changed
              setPriceRange(prev => {
                if (prev.min !== min || prev.max !== max) {
                  return { min, max };
                }
                return prev;
              });
            }
          } else {
            // No products, reset price range
            setPriceRange({ min: 0, max: 0 });
            setProducts([]);
          }
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const errorMessage = err instanceof Error
          ? err.message
          : "Упс! Щось пішло не так. Спробуйте оновити сторінку.";

        if (!abortController.signal.aborted) {
          setError(errorMessage);
          setProducts([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    // Cleanup: abort request on unmount or when dependencies change
    return () => {
      abortController.abort();
    };
  }, [dbCategory, nonPriceParams]); // Only non-price params trigger re-fetch

  // Client-side price filtering and sorting
  // This runs instantly without API calls for smooth UX
  useEffect(() => {
    if (!allProducts.length) {
      setProducts([]);
      return;
    }

    // Apply price filter
    let filtered = [...allProducts];

    if (filters.priceMin > 0 || filters.priceMax > 0) {
      const minPrice = filters.priceMin || priceRange.min;
      const maxPrice = filters.priceMax || priceRange.max;

      filtered = filtered.filter(p => {
        const price = parseFloat(p.price.toString());
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply sorting
    const sorted = sortProducts(filtered, sortOption);
    setProducts(sorted);
  }, [allProducts, filters.priceMin, filters.priceMax, priceRange.min, priceRange.max, sortOption]);

  // Update a specific filter (callback for user actions)
  const updateFilter = useCallback((
    filterType: keyof FilterOptions,
    value: string | string[] | number | null
  ) => {
    const params: Record<string, string | string[]> = {};

    // Preserve existing filters
    if (filters.type.length > 0) params.type = filters.type;
    if (filters.material.length > 0) params.material = filters.material;
    if (filters.complectation.length > 0) params.feature = filters.complectation;
    if (filters.size) params.size = filters.size;
    if (filters.status.length > 0) params.status = filters.status;
    if (filters.priceMin > 0) params.minPrice = filters.priceMin.toString();
    if (filters.priceMax > 0) params.maxPrice = filters.priceMax.toString();
    if (sortOption !== 'rating_desc') params.sort = sortOption;

    // Update the specific filter
    const key = filterType === 'complectation' ? 'feature' :
                filterType === 'priceMin' ? 'minPrice' :
                filterType === 'priceMax' ? 'maxPrice' : filterType;

    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete params[key];
    } else if (Array.isArray(value)) {
      params[key] = value;
    } else {
      params[key] = value.toString();
    }

    updateURLParams(params);
  }, [filters, sortOption, updateURLParams]);

  // Update price range
  const updatePriceRange = useCallback((min: number, max: number) => {
    const params: Record<string, string | string[]> = {};

    // Preserve existing filters
    if (filters.type.length > 0) params.type = filters.type;
    if (filters.material.length > 0) params.material = filters.material;
    if (filters.complectation.length > 0) params.feature = filters.complectation;
    if (filters.size) params.size = filters.size;
    if (filters.status.length > 0) params.status = filters.status;
    if (sortOption !== 'rating_desc') params.sort = sortOption;

    // Only add price params if they differ from the full range
    if (min > priceRange.min) params.minPrice = Math.floor(min).toString();
    if (max < priceRange.max) params.maxPrice = Math.floor(max).toString();

    updateURLParams(params);
  }, [filters, sortOption, priceRange, updateURLParams]);

  // Update sort option
  const updateSort = useCallback((sort: string) => {
    const params: Record<string, string | string[]> = {};

    // Preserve existing filters
    if (filters.type.length > 0) params.type = filters.type;
    if (filters.material.length > 0) params.material = filters.material;
    if (filters.complectation.length > 0) params.feature = filters.complectation;
    if (filters.size) params.size = filters.size;
    if (filters.status.length > 0) params.status = filters.status;
    if (filters.priceMin > 0) params.minPrice = filters.priceMin.toString();
    if (filters.priceMax > 0) params.maxPrice = filters.priceMax.toString();

    // Only add sort if it's not the default
    if (sort !== 'rating_desc') {
      params.sort = sort;
    }

    updateURLParams(params);
  }, [filters, updateURLParams]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    const category = searchParams?.get('category');
    const newURL = category ? `/catalog?category=${category}` : '/catalog';
    router.push(newURL);
  }, [router, searchParams]);

  // Clear a specific filter value
  const clearFilter = useCallback((filterType: string, value: string) => {
    const key = filterType.toLowerCase() as keyof FilterOptions;

    if (filterType === "Price" && value === "range") {
      // Reset price range
      updatePriceRange(priceRange.min, priceRange.max);
      return;
    }

    if (Array.isArray(filters[key])) {
      const newValues = (filters[key] as string[]).filter(v => v !== value);
      updateFilter(key, newValues);
    } else if (filters[key] === value) {
      updateFilter(key, null);
    }
  }, [filters, priceRange, updateFilter, updatePriceRange]);

  return {
    products,
    loading,
    error,
    filters,
    priceRange,
    sortOption,
    updateFilter,
    updatePriceRange,
    updateSort,
    resetFilters,
    clearFilter,
  };
}

// Helper function to sort products
// Stock-aware sorting: in-stock products appear first, out-of-stock products last
// Maintains existing sort order within each group
function sortProducts(products: ProductWithImages[], sortOption: string): ProductWithImages[] {
  // Separate products by stock status
  const inStock = products.filter(p => (p.stock ?? 0) >= 1);
  const outOfStock = products.filter(p => (p.stock ?? 0) < 1);

  // Apply the selected sort to each group independently
  const sortByOption = (arr: ProductWithImages[]) => {
    const sorted = [...arr];

    switch (sortOption) {
      case "price_asc":
        sorted.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
        break;

      case "price_desc":
        sorted.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
        break;

      case "reviews_desc":
        sorted.sort((a, b) => {
          const reviewsA = typeof a.reviews === 'number' ? a.reviews : parseInt(a.reviews || '0');
          const reviewsB = typeof b.reviews === 'number' ? b.reviews : parseInt(b.reviews || '0');
          return reviewsB - reviewsA;
        });
        break;

      default: // rating_desc
        sorted.sort((a, b) => {
          const ratingA = typeof a.rating === 'number' ? a.rating : parseFloat(a.rating || '0');
          const ratingB = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating || '0');
          return ratingB - ratingA;
        });
    }

    return sorted;
  };

  // Sort each group and combine: in-stock first, then out-of-stock
  return [...sortByOption(inStock), ...sortByOption(outOfStock)];
}
