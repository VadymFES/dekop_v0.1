// /app/catalog/CatalogContent.tsx
'use client';

import React, { useReducer, useState, useEffect, useMemo, ChangeEvent, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import styles from "./catalog.module.css";
import { FURNITURE_FILTERS, FilterGroup, ProductWithImages } from "@/app/lib/definitions";
import { CATEGORY_SLUG_MAP } from "./types";
import { mergePriceFilters } from "./utils";
import { catalogReducer } from "./store/reducer";
import { initialState } from "./store/initialState";
import * as actions from "./store/actions";
import { useFiltersFromUrl } from "./hooks/useFiltersFromUrl";

// Components
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SortControl } from "./components/SortControl";
import { SelectedFilters } from "./components/SelectedFilters";
import { FiltersSidebar } from "./components/FiltersSidebar";
import { ProductsDisplay } from "./components/ProductsDisplay";

/**
 * Fetch products from API with filters
 */
const fetchProducts = async (params: URLSearchParams): Promise<ProductWithImages[]> => {
  const res = await fetch(`/api/products?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
};

/**
 * Build URL search params from filters
 */
function buildSearchParams(
  dbCategory: string | null,
  filters: any,
  sortOption: string
): URLSearchParams {
  const params = new URLSearchParams();

  if (dbCategory) params.append("category", dbCategory);

  // Add filters
  filters.status.forEach((status: string) => params.append("status", status));
  filters.type.forEach((type: string) => params.append("type", type));
  filters.material.forEach((material: string) => params.append("material", material));
  filters.complectation.forEach((feature: string) => params.append("feature", feature));

  if (filters.size) params.append("size", filters.size);
  if (filters.priceMin > 0) params.append("minPrice", filters.priceMin.toString());
  if (filters.priceMax > 0 && filters.priceMax < 1000000) {
    params.append("maxPrice", filters.priceMax.toString());
  }

  // Add sort
  if (sortOption && sortOption !== "rating_desc") {
    params.append("sort", sortOption);
  }

  return params;
}

export default function CatalogContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("category") || "";

  // State management with reducer
  const [state, dispatch] = useReducer(catalogReducer, initialState);
  const { products, loading, error, priceRange, filters, sortOption } = state;

  // Get category information
  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName || 'Всі категорії';

  // Custom hook to parse URL filters
  const getFiltersFromURL = useFiltersFromUrl();

  // Track if price filters have been initialized to prevent infinite loop
  const priceFiltersInitialized = useRef(false);

  // Track if we're updating URL to prevent reading it back
  const isUpdatingURL = useRef(false);

  // Track previous search params to detect external changes
  const previousSearchParams = useRef<string>('');

  // Track previous products to avoid unnecessary dispatches
  const previousProductsKey = useRef<string>('');

  // Initialize filters from URL on mount or when URL changes externally
  useEffect(() => {
    const currentParams = searchParams?.toString() || '';

    // Skip if we just updated the URL ourselves
    if (isUpdatingURL.current) {
      isUpdatingURL.current = false;
      previousSearchParams.current = currentParams;
      return;
    }

    // Skip if params haven't actually changed
    if (previousSearchParams.current === currentParams) {
      return;
    }

    previousSearchParams.current = currentParams;

    const urlFilters = getFiltersFromURL(searchParams);
    dispatch(actions.setFilters(urlFilters));
    dispatch(actions.setSortOption(urlFilters.sort));

    // If URL has price filters, mark as initialized
    if (urlFilters.priceMin > 0 || urlFilters.priceMax > 0) {
      priceFiltersInitialized.current = true;
    }
  }, [searchParams, getFiltersFromURL]);

  // Build query params for TanStack Query
  const queryParams = useMemo(() => {
    return buildSearchParams(dbCategory, filters, sortOption);
  }, [dbCategory, filters, sortOption]);

  // Fetch products with TanStack Query (automatic deduplication and caching)
  const { data: fetchedProducts = [], isLoading, error: queryError } = useQuery<ProductWithImages[]>({
    queryKey: ['products', queryParams.toString()],
    queryFn: () => fetchProducts(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: true,
  });

  // Update products in state when query completes
  useEffect(() => {
    // Create a stable key to identify the current products
    const currentProductsKey = fetchedProducts?.map(p => p.id).join(',') || 'EMPTY';

    // Only process if products actually changed
    if (previousProductsKey.current === currentProductsKey) {
      return; // Products haven't changed, skip
    }

    previousProductsKey.current = currentProductsKey;

    if (fetchedProducts && fetchedProducts.length > 0) {
      dispatch(actions.setProducts(fetchedProducts));

      // Calculate price range from fetched products
      const prices = fetchedProducts
        .map(p => parseFloat(p.price.toString()))
        .filter(p => p > 0);

      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        dispatch(actions.setPriceRange({ min: minPrice, max: maxPrice }));

        // Set initial price filters ONLY ONCE (if not already initialized)
        if (!priceFiltersInitialized.current) {
          dispatch(actions.setFilters({
            priceMin: minPrice,
            priceMax: maxPrice
          }));
          priceFiltersInitialized.current = true;
        }
      }
    } else if (fetchedProducts && fetchedProducts.length === 0) {
      // Handle empty results - dispatch once
      dispatch(actions.setProducts([]));
      dispatch(actions.setPriceRange({ min: 0, max: 0 }));
    }
  }, [fetchedProducts]);

  // Update loading state
  useEffect(() => {
    dispatch(actions.setLoading(isLoading));
  }, [isLoading]);

  // Update error state
  useEffect(() => {
    if (queryError) {
      dispatch(actions.setError(queryError.message));
    }
  }, [queryError]);

  // Memoized filter groups
  const finalFilterGroups = useMemo(() => {
    const GLOBAL_FILTERS: FilterGroup[] = [{
      name: 'Status',
      type: 'checkbox',
      options: [
        { id: 'new', name: 'Новинки', value: 'new' },
        { id: 'on_sale', name: 'Акційні', value: 'on_sale' },
        { id: 'bestseller', name: 'Популярні', value: 'bestseller' },
      ],
    }];

    if (!slug) {
      const allGroups = Object.values(FURNITURE_FILTERS).flat();
      const priceGroups = allGroups.filter(
        (g) => g.name.toLowerCase() === "price" && g.type === "range" && g.range
      );
      const merged = mergePriceFilters(priceGroups);
      const result = [...GLOBAL_FILTERS];

      if (merged && (merged.type === 'range' || merged.type === 'checkbox' ||
          merged.type === 'radio' || merged.type === 'color')) {
        result.push(merged);
      }
      return result;
    }

    return [...GLOBAL_FILTERS, ...(FURNITURE_FILTERS[slug] || [])];
  }, [slug]);

  // Debounced URL update - update URL after user stops changing filters
  useEffect(() => {
    // Don't update URL if we're still loading initial data
    if (loading && products.length === 0) {
      return;
    }

    // Don't update URL if filters haven't been initialized yet
    if (!priceFiltersInitialized.current && filters.priceMin === 0 && filters.priceMax === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (slug) params.append("category", slug);

      filters.type.forEach(type => params.append("type", type));
      filters.material.forEach(material => params.append("material", material));
      filters.complectation.forEach(feature => params.append("feature", feature));

      if (filters.size) params.append("size", filters.size);

      if (filters.priceMin > priceRange.min) {
        params.append("minPrice", Math.floor(filters.priceMin).toString());
      }

      if (filters.priceMax < priceRange.max) {
        params.append("maxPrice", Math.floor(filters.priceMax).toString());
      }

      if (sortOption !== "rating_desc") params.append("sort", sortOption);

      filters.status.forEach(status => params.append("status", status));

      const newUrl = `${window.location.pathname}?${params.toString()}`;

      // Mark that we're updating the URL so we don't read it back
      isUpdatingURL.current = true;
      router.push(newUrl, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, priceRange, sortOption, slug, router, loading, products.length]);

  // Event handlers
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const chosenSlug = e.target.value;
    setIsCategoryLoading(true);
    dispatch(actions.setLoading(true));
    dispatch(actions.resetFilters({ min: 0, max: 0 }));
    dispatch(actions.setPriceRange({ min: 0, max: 0 }));
    // Reset price filters initialization when category changes
    priceFiltersInitialized.current = false;
    router.push(chosenSlug ? `/catalog?category=${chosenSlug}` : "/catalog");
  };

  useEffect(() => {
    if (!loading) {
      setIsCategoryLoading(false);
    }
  }, [loading]);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>, groupName: string): void => {
    const { value, checked, type } = e.target;
    const key = groupName.toLowerCase() as keyof typeof filters;

    if (type === "checkbox" && Array.isArray(filters[key])) {
      const currentValues = Array.isArray(filters[key]) ? [...(filters[key] as string[])] : [];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      dispatch(actions.setFilters({ [key]: newValues }));
    } else if (type === "radio") {
      dispatch(actions.setFilters({ [key]: checked ? value : null }));
    }
  };

  const handlePriceChange = (thumb: "min" | "max", value: number): void => {
    dispatch(actions.setFilters({
      priceMin: thumb === "min"
        ? Math.max(priceRange.min, Math.min(value, filters.priceMax - 1200))
        : filters.priceMin,
      priceMax: thumb === "max"
        ? Math.min(priceRange.max, Math.max(value, filters.priceMin + 1200))
        : filters.priceMax,
    }));
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    dispatch(actions.setSortOption(e.target.value));
  };

  const clearFilter = (filterType: string, value: string): void => {
    const key = filterType.toLowerCase() as keyof typeof filters;

    if (filterType === "Price" && value === "range") {
      dispatch(actions.setFilters({
        priceMin: priceRange.min,
        priceMax: priceRange.max
      }));
      return;
    }

    if (Array.isArray(filters[key])) {
      dispatch(actions.setFilters({
        [key]: (filters[key] as string[]).filter(v => v !== value)
      }));
    } else if (filters[key] === value) {
      dispatch(actions.setFilters({ [key]: null }));
    }
  };

  const clearAllFilters = (): void => {
    dispatch(actions.resetFilters(priceRange));
    // Reset price filters initialization when clearing all filters
    priceFiltersInitialized.current = false;
    router.push(slug ? `/catalog?category=${slug}` : "/catalog", { scroll: false });
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentContainer}>
        <Breadcrumbs title={pageTitle} />
        <h1 className={styles.pageTitle}>{pageTitle}</h1>

        <div className={styles.topControls}>
          <div className={styles.filterControls}>
            <SelectedFilters
              loading={loading}
              filters={filters}
              priceRange={priceRange}
              slug={slug}
              clearFilter={clearFilter}
              clearAllFilters={clearAllFilters}
            />
          </div>
          <SortControl
            sortOption={sortOption}
            onChange={handleSortChange}
            disabled={loading}
          />
        </div>

        <React.Suspense>
          <div className={styles.contentWrapper}>
            <FiltersSidebar
              loading={loading}
              isCategoryLoading={isCategoryLoading}
              slug={slug}
              filters={filters}
              priceRange={priceRange}
              finalFilterGroups={finalFilterGroups}
              handleCategoryChange={handleCategoryChange}
              handleFilterChange={handleFilterChange}
              handlePriceChange={handlePriceChange}
            />
            <ProductsDisplay
              loading={loading}
              error={error}
              products={products}
            />
          </div>
        </React.Suspense>
      </div>
    </div>
  );
}
