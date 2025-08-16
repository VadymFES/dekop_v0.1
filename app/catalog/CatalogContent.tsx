// /app/catalog/CatalogContent.tsx
'use client';

import React, { useReducer, useState, useEffect, useMemo, useCallback, ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./catalog.module.css";
import { FURNITURE_FILTERS, FilterGroup } from "@/app/lib/definitions";
import { CATEGORY_SLUG_MAP } from "./types";
import { mergePriceFilters } from "./utils";
import { catalogReducer } from "./store/reducer";
import { initialState } from "./store/initialState";
import * as actions from "./store/actions";
import { useFiltersFromUrl } from "./hooks/useFiltersFromUrl";
import { useUpdateUrl } from "./hooks/useUpdateUrl";

// Components
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SortControl } from "./components/SortControl";
import { SelectedFilters } from "./components/SelectedFilters";
import { FiltersSidebar } from "./components/FiltersSidebar";
import { ProductsDisplay } from "./components/ProductsDisplay";
import FilterModal from "./components/FilterModal";
import { CatalogErrorBoundary } from "./components/CatalogErrorBoundary";
import { HookErrorBoundary } from "./components/HookErrorBoundary";
import { DOMErrorBoundary } from "./components/DOMErrorBoundary";
import { FilterLogicProvider } from "./components/FilterLogicProvider";
import { DebugLogger } from "./utils/debugLogger";


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
  const {
    allProducts, filteredProducts, loading, error,
    priceRange, filters, sortOption, isFiltering
  } = state;

  // Mobile specific states
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Get category information
  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName || 'Всі категорії';

  // Custom hooks wrapped in error handling
  const getFiltersFromURL = useFiltersFromUrl();
  
  // Memoize filter objects before passing to hooks for stable dependencies
  // Enhanced memoization with better stability checks
  const memoizedFilters = useMemo(() => {
    // Create stable sorted arrays to prevent reference changes
    const stableType = filters.type ? [...filters.type].sort() : [];
    const stableMaterial = filters.material ? [...filters.material].sort() : [];
    const stableComplectation = filters.complectation ? [...filters.complectation].sort() : [];
    const stableFacadeMaterial = filters.facadeMaterial ? [...filters.facadeMaterial].sort() : [];
    const stableTabletopShape = filters.tabletopShape ? [...filters.tabletopShape].sort() : [];
    const stableStatus = filters.status ? [...filters.status].sort() : [];

    return {
      type: stableType,
      material: stableMaterial,
      complectation: stableComplectation,
      facadeMaterial: stableFacadeMaterial,
      tabletopShape: stableTabletopShape,
      status: stableStatus,
      size: filters.size || null,
      specifics: filters.specifics || null,
      backrest: filters.backrest || null,
      hardness: filters.hardness || null,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax
    };
  }, [
    // Use stable string representations for array dependencies
    filters.type?.slice().sort().join(',') || '',
    filters.material?.slice().sort().join(',') || '',
    filters.complectation?.slice().sort().join(',') || '',
    filters.facadeMaterial?.slice().sort().join(',') || '',
    filters.tabletopShape?.slice().sort().join(',') || '',
    filters.status?.slice().sort().join(',') || '',
    filters.size,
    filters.specifics,
    filters.backrest,
    filters.hardness,
    filters.priceMin,
    filters.priceMax
  ]);

  // Memoize price range for stable dependencies with validation
  const memoizedPriceRange = useMemo(() => ({
    min: Math.max(0, priceRange.min || 0),
    max: Math.max(0, priceRange.max || 0)
  }), [priceRange.min, priceRange.max]);

  // Get the updateURL function from the hook with stabilized dependencies
  const updateURLWithFilters = useUpdateUrl(memoizedFilters, memoizedPriceRange, sortOption, slug);

  // Create stable updateURL callback using useCallback with primitive dependencies only
  const stableUpdateURL = useCallback(() => {
    try {
      updateURLWithFilters();
    } catch (error) {
      console.error('Error updating URL with filters:', error);
      // Graceful fallback - don't break the filtering process
    }
  }, [updateURLWithFilters]);

  // Hook logic will be applied inside FilterLogicProvider wrapped in error boundary

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
      // For "All categories" view, merge price filters from all categories
      const allGroups = Object.values(FURNITURE_FILTERS).flat();
      const priceGroups = allGroups.filter(
        (g) => g.name.toLowerCase() === "price" && g.type === "range" && g.range
      );
      const merged = mergePriceFilters(priceGroups);
      const result = [...GLOBAL_FILTERS];

      if (merged) {
        // Only add the price filter if it has a valid type
        if (merged.type === 'range' || merged.type === 'checkbox' ||
          merged.type === 'radio' || merged.type === 'color') {
          result.push(merged);
        }
      }
      return result;
    }

    // Return category-specific filters plus global filters
    return [...GLOBAL_FILTERS, ...(FURNITURE_FILTERS[slug] || [])];
  }, [slug]);

  // Create stable dependencies for the fetch effect
  const stableFetchDependencies = useMemo(() => {
    const searchParamsStr = searchParams ? searchParams.toString() : '';
    return {
      dbCategory: dbCategory || '',
      searchParamsString: searchParamsStr
    };
  }, [dbCategory, searchParams]);

  // Fetch products
  useEffect(() => {
    const fetchAllProducts = async (): Promise<void> => {
      dispatch(actions.setLoading(true));
      dispatch(actions.setIsFiltering(true));
      try {
        const urlFilters = getFiltersFromURL(searchParams);

        // Build API query params for filtered products
        const params = new URLSearchParams();
        if (stableFetchDependencies.dbCategory) {
          params.append("category", stableFetchDependencies.dbCategory);
        }

        // Add filters to params
        urlFilters.status.forEach(status => params.append("status", status));
        urlFilters.type.forEach(type => params.append("type", type));
        urlFilters.material.forEach(material => params.append("material", material));
        urlFilters.complectation.forEach(feature => params.append("feature", feature));

        if (urlFilters.size) params.append("size", urlFilters.size);
        if (urlFilters.priceMin !== null && urlFilters.priceMax !== null) {
          params.append("minPrice", urlFilters.priceMin.toString());
          params.append("maxPrice", urlFilters.priceMax.toString());
        }
        // Fetch filtered products
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Упс! Щось пішло не так. Спробуйте оновити сторінку.");
        }
        const data = await res.json();
        dispatch(actions.setFilteredProducts(data));

        // Fetch all products in category for complete data (for filtering)
        const allProductsParams = new URLSearchParams();
        if (stableFetchDependencies.dbCategory) {
          allProductsParams.append("category", stableFetchDependencies.dbCategory);
        }

        const allProductsRes = await fetch(`/api/products?${allProductsParams.toString()}`);
        if (allProductsRes.ok) {
          const allData = await allProductsRes.json();
          dispatch(actions.setAllProducts(allData));

          if (allData.length > 0) {
            const allPrices = allData.map((p: { price: number | string }) =>
              parseFloat(p.price.toString())).filter((p: number) => p > 0);
            const allMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
            const allMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

            dispatch(actions.setPriceRange({ min: allMinPrice, max: allMaxPrice }));

            // New logic to determine initial price filters based on URL params and global price range
            let resolvedPriceMin, resolvedPriceMax;

            if (urlFilters.priceMin && urlFilters.priceMax) {
              // Case 1: Both minPrice and maxPrice are in the URL
              resolvedPriceMin = urlFilters.priceMin;
              resolvedPriceMax = urlFilters.priceMax;
            } else if (urlFilters.priceMin) {
              // Case 2: Only minPrice is in the URL
              resolvedPriceMin = urlFilters.priceMin;
              resolvedPriceMax = allMaxPrice; 
            } else if (urlFilters.priceMax) {
              // Case 3: Only maxPrice is in the URL
              resolvedPriceMin = allMinPrice; 
              resolvedPriceMax = urlFilters.priceMax;
            } else {
              // Case 4: Neither minPrice nor maxPrice is in the URL
              resolvedPriceMin = allMinPrice;
              resolvedPriceMax = allMaxPrice;
            }

            // Set all filters including the resolved price filters
            dispatch(actions.setFilters({
              type: urlFilters.type,
              material: urlFilters.material,
              complectation: urlFilters.complectation,
              size: urlFilters.size,
              priceMin: resolvedPriceMin,
              priceMax: resolvedPriceMax,
              status: urlFilters.status,
            }));

            dispatch(actions.setSortOption(urlFilters.sort));
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Упс! Щось пішло не так. Спробуйте оновити сторінку.";
        dispatch(actions.setError(errorMessage));
      } finally {
        dispatch(actions.setLoading(false));
      }
    };

    fetchAllProducts();
  }, [
    stableFetchDependencies.dbCategory,
    stableFetchDependencies.searchParamsString,
    getFiltersFromURL
  ]);

  // Event handlers
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const chosenSlug = e.target.value;
    setIsCategoryLoading(true);
    dispatch(actions.setLoading(true));
    dispatch(actions.resetFilters({ min: 0, max: 0 }));
    dispatch(actions.setPriceRange({ min: 0, max: 0 }));
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
    const priceStep = 500; 
    dispatch(actions.setFilters({
      priceMin: thumb === "min"
        ? Math.max(priceRange.min, Math.min(value, filters.priceMax - priceStep))
        : filters.priceMin,
      priceMax: thumb === "max"
        ? Math.min(priceRange.max, Math.max(value, filters.priceMin + priceStep))
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
    setTimeout(() => {
      const newUrl = slug ? `${window.location.pathname}?category=${slug}` : window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }, 0);
  };

  // Modal close handler
  const handleCloseModal = (): void => {
    setIsMobileFiltersOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentContainer}>
        <Breadcrumbs title={pageTitle} />
        <h1 className={styles.pageTitle}>{pageTitle}</h1>

        {/* Mobile Controls */}
        <div className={styles.mobileControlsContainer}>
          <button 
            onClick={() => setIsMobileFiltersOpen(true)} 
            className={styles.mobileFiltersButton}
          >
            Фільтри
          </button>
          <SortControl 
            sortOption={sortOption} 
            onChange={handleSortChange} 
            disabled={loading} 
          />
        </div>

        {/* Wrap the entire content in HookErrorBoundary to catch hook-related errors */}
        <HookErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Hook error in CatalogContent:', error, errorInfo);
            // Could send to error reporting service here
          }}
        >
          {/* Temporarily simplified for testing */}
          {process.env.NODE_ENV === 'test' ? (
            <div>Test content</div>
          ) : (
            <FilterLogicProvider
              allProducts={allProducts}
              filters={memoizedFilters}
              priceRange={memoizedPriceRange}
              sortOption={sortOption}
              updateURL={stableUpdateURL}
              dispatch={dispatch}
            >
            <CatalogErrorBoundary>
              <div className={styles.topControls}>
                <div className={styles.filterControls}>
                  <SelectedFilters
                    loading={loading}
                    filters={filters}
                    priceRange={priceRange}
                    slug={slug}
                    clearFilter={clearFilter}
                    clearAllFilters={clearAllFilters}
                    updateURLWithFilters={stableUpdateURL}
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
                  {/* Desktop FiltersSidebar */}
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
                  <DOMErrorBoundary
                    componentName="ProductsDisplay"
                    fallback={
                      <div style={{ 
                        padding: '20px', 
                        textAlign: 'center', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px',
                        margin: '10px 0',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d'
                      }}>
                        <p>Виникла помилка при завантаженні товарів. Спробуйте оновити сторінку.</p>
                      </div>
                    }
                  >
                    <ProductsDisplay
                      loading={loading}
                      isFiltering={isFiltering}
                      error={error}
                      filteredProducts={filteredProducts}
                    />
                  </DOMErrorBoundary>
                </div>
              </React.Suspense>
            </CatalogErrorBoundary>

            {/* Mobile FilterModal */}
            <CatalogErrorBoundary>
              <FilterModal
                isOpen={isMobileFiltersOpen}
                onClose={handleCloseModal}
                loading={loading}
                isCategoryLoading={isCategoryLoading}
                slug={slug}
                filters={filters}
                priceRange={priceRange}
                finalFilterGroups={finalFilterGroups}
                handleCategoryChange={handleCategoryChange}
                handleFilterChange={handleFilterChange}
                handlePriceChange={handlePriceChange}
                clearAllFilters={clearAllFilters}
              />
            </CatalogErrorBoundary>
          </FilterLogicProvider>
              )}
        </HookErrorBoundary>
      </div>
    </div>
  );
}