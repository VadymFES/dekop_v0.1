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
import { FilterModal } from "./components/FilterModal";
import { ProductsDisplay } from "./components/ProductsDisplay";
import FilterModal from "./components/FilterModal";
import { CatalogErrorBoundary } from "./components/CatalogErrorBoundary";
import { HookErrorBoundary } from "./components/HookErrorBoundary";
import { DOMErrorBoundary } from "./components/DOMErrorBoundary";
import { FilterLogicProvider } from "./components/FilterLogicProvider";
import { DebugLogger } from "./utils/debugLogger";


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
  // Only send price filters if they are valid (greater than 0)
  if (filters.priceMin > 0) params.append("minPrice", filters.priceMin.toString());
  if (filters.priceMax > 0) params.append("maxPrice", filters.priceMax.toString());

  // Add sort
  if (sortOption && sortOption !== "rating_desc") {
    params.append("sort", sortOption);
  }

  return params;
}

export default function CatalogContent(): React.ReactElement {
  // Performance monitoring (disabled in tests)
  // const renderCount = useRenderCounter('CatalogContent');
  // useRenderPerformance('CatalogContent');
  // const { getLifetimeMs } = useLifecycleTracker('CatalogContent');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("category") || "";

  // State management with reducer
  const [state, dispatch] = useReducer(catalogReducer, initialState);
  const { products, loading, error, priceRange, filters, sortOption } = state;

  // Mobile specific states
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Get category information
  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName || 'Всі категорії';

  // Use the new stable filtering hook
  const {
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
    applyFilters,
  } = useProductFilters(dbCategory);

  // Memoized filter groups to avoid recalculations
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

      // Only add price filters if they're valid (not 0) and different from range
      if (filters.priceMin > 0 && filters.priceMin > priceRange.min) {
        params.append("minPrice", Math.floor(filters.priceMin).toString());
      }

      if (filters.priceMax > 0 && filters.priceMax < priceRange.max) {
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

  // Local state for filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Detect mobile to skip rendering the auto-apply sidebar on small screens
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1023);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Event handler: Category change
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

  // Reset category loading state when loading completes
  useEffect(() => {
    if (!loading) {
      setIsCategoryLoading(false);
    }
  }, [loading]);

  // Event handler: Filter change (checkbox/radio)
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>, groupName: string): void => {
    const { value, checked, type } = e.target;
    const key = groupName.toLowerCase() as keyof typeof filters;

    if (type === "checkbox" && Array.isArray(filters[key])) {
      const currentValues = [...(filters[key] as string[])];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      dispatch(actions.setFilters({ [key]: newValues }));
    } else if (type === "radio") {
      updateFilter(key, checked ? value : null);
    }
  };

  // Event handler: Price range change
  // Note: PriceRangeFilter component already handles constraints (min/max with step)
  // so we just need to pass the value through for the correct thumb
  const handlePriceChange = (thumb: "min" | "max", value: number): void => {
    dispatch(actions.setFilters({
      priceMin: thumb === "min"
        ? Math.max(priceRange.min, Math.min(value, filters.priceMax))
        : filters.priceMin,
      priceMax: thumb === "max"
        ? Math.min(priceRange.max, Math.max(value, filters.priceMin))
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

  // Effect to detect mobile screen with proper cleanup
  useEffect(() => {
    const checkMobile = () => {
      try {
        setIsMobile(window.innerWidth < 768);
      } catch (error) {
        DebugLogger.domWarning('Error checking mobile screen size', {
          component: 'CatalogContent',
          action: 'checkMobile',
          error: error as Error
        });
        // Fallback to desktop view if window is not available
        setIsMobile(false);
      }
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener with error handling
    try {
      window.addEventListener('resize', checkMobile);
      DebugLogger.debug('Added resize event listener', {
        component: 'CatalogContent',
        action: 'useEffect (mobile detection)'
      });
    } catch (error) {
      DebugLogger.domError('Error adding resize event listener', {
        component: 'CatalogContent',
        action: 'useEffect (mobile detection)',
        error: error as Error
      });
    }
    
    // Cleanup function to remove event listener
    return () => {
      try {
        window.removeEventListener('resize', checkMobile);
        DebugLogger.cleanup('Removed resize event listener', {
          component: 'CatalogContent',
          action: 'useEffect cleanup'
        });
      } catch (error) {
        DebugLogger.domError('Error removing resize event listener', {
          component: 'CatalogContent',
          action: 'useEffect cleanup',
          error: error as Error
        });
      }
    };
  }, []);

  const clearAllFilters = (): void => {
    dispatch(actions.resetFilters(priceRange));
    // Reset price filters initialization when clearing all filters
    priceFiltersInitialized.current = false;
    router.push(slug ? `/catalog?category=${slug}` : "/catalog", { scroll: false });
  };

  // Modal close handler
  const handleCloseModal = (): void => {
    setIsMobileFiltersOpen(false);
  };

  // Event handler: Open filter modal
  const handleOpenFilterModal = (): void => {
    setIsFilterModalOpen(true);
  };

  // Event handler: Close filter modal
  const handleCloseFilterModal = (): void => {
    setIsFilterModalOpen(false);
  };

  // Event handler: Apply filters (modal)
  const handleApplyFilters = (): void => {
    // Filters are already applied in real-time via URL params
    // This just closes the modal
    setIsFilterModalOpen(false);
  };

  // Event handler: Reset filters (modal)
  const handleResetFilters = (): void => {
    resetFilters();
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
          <div className={styles.controlButtons}>
            <button
              className={styles.filtersButton}
              onClick={handleOpenFilterModal}
              aria-label="Відкрити фільтри"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Фільтри
            </button>
            <SortControl
              sortOption={sortOption}
              onChange={handleSortChange}
              disabled={loading}
            />
          </div>
        </div>

        <React.Suspense>
          <div className={styles.contentWrapper}>
            {!isMobile && (
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
            )}
            <ProductsDisplay
              loading={loading}
              error={error}
              products={products}
            />
          </div>
        </React.Suspense>

        {/* Filter Modal for mobile/tablet */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={handleCloseFilterModal}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
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
      </div>
    </div>
  );
}
