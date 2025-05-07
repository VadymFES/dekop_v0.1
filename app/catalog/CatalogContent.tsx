// /app/catalog/CatalogContent.tsx
'use client';

import React, { useReducer, useEffect, useMemo, ChangeEvent } from "react";
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
import { useFilterLogic } from "./hooks/useFilterLogic";

// Components
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SortControl } from "./components/SortControl";
import { SelectedFilters } from "./components/SelectedFilters";
import { FiltersSidebar } from "./components/FiltersSidebar";
import { ProductsDisplay } from "./components/ProductsDisplay";

export default function CatalogContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("category") || "";
  
  // State management with reducer
  const [state, dispatch] = useReducer(catalogReducer, initialState);
  const { 
    allProducts, filteredProducts, loading, error, 
    priceRange, filters, sortOption, isFiltering 
  } = state;

  // Get category information
  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName || 'Всі категорії';

  // Custom hooks
  const getFiltersFromURL = useFiltersFromUrl();
  const updateURLWithFilters = useUpdateUrl(filters, priceRange, sortOption, slug);
  
  // Apply filtering logic
  useFilterLogic(allProducts, filters, sortOption, updateURLWithFilters, dispatch);

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
      
      // Fixed type issue - ensure merged is a proper FilterGroup with specific type
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

  // Fetch products
  useEffect(() => {
    const fetchAllProducts = async (): Promise<void> => {
      dispatch(actions.setLoading(true));
      try {
        const urlFilters = getFiltersFromURL(searchParams);
        
        // Build API query params for filtered products
        const params = new URLSearchParams();
        if (dbCategory) params.append("category", dbCategory);
        
        // Add filters to params
        urlFilters.status.forEach(status => params.append("status", status));
        urlFilters.type.forEach(type => params.append("type", type));
        urlFilters.material.forEach(material => params.append("material", material));
        urlFilters.complectation.forEach(feature => params.append("feature", feature));
        
        if (urlFilters.size) params.append("size", urlFilters.size);
        if (urlFilters.priceMin) params.append("minPrice", urlFilters.priceMin.toString());
        if (urlFilters.priceMax) params.append("maxPrice", urlFilters.priceMax.toString());

        // Fetch filtered products
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Упс! Щось пішло не так. Спробуйте оновити сторінку.");
        }
        const data = await res.json();
        dispatch(actions.setFilteredProducts(data));

        // Handle price range and filters setup from filtered results
        if (data.length > 0) {
          const prices = data.map((p: { price: number | string }) => 
            parseFloat(p.price.toString())).filter((p: number) => p > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          
          dispatch(actions.setFilters({
            type: urlFilters.type,
            material: urlFilters.material,
            complectation: urlFilters.complectation,
            size: urlFilters.size,
            priceMin: urlFilters.priceMin || minPrice,
            priceMax: urlFilters.priceMax || maxPrice,
            status: urlFilters.status,
          }));
          
          dispatch(actions.setSortOption(urlFilters.sort));
        }

        // Fetch all products in category for complete data (for filtering)
        const allProductsParams = new URLSearchParams();
        if (dbCategory) allProductsParams.append("category", dbCategory);
        
        const allProductsRes = await fetch(`/api/products?${allProductsParams.toString()}`);
        if (allProductsRes.ok) {
          const allData = await allProductsRes.json();
          dispatch(actions.setAllProducts(allData));

          if (allData.length > 0) {
            // Calculate price range from all products
            const allPrices = allData.map((p: { price: number | string }) => 
              parseFloat(p.price.toString())).filter((p: number) => p > 0);
            const allMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
            const allMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
            
            dispatch(actions.setPriceRange({ min: allMinPrice, max: allMaxPrice }));
            
            // Only update price filters if they weren't set from URL
            if (!urlFilters.priceMin && !urlFilters.priceMax) {
              dispatch(actions.setFilters({
                priceMin: allMinPrice,
                priceMax: allMaxPrice
              }));
            }
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
  }, [dbCategory, searchParams, getFiltersFromURL]);

  // Event handlers
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const chosenSlug = e.target.value;
    dispatch(actions.setLoading(true));
    dispatch(actions.resetFilters({ min: 0, max: 0 }));
    dispatch(actions.setPriceRange({ min: 0, max: 0 }));
    router.push(chosenSlug ? `/catalog?category=${chosenSlug}` : "/catalog");
  };

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
        ? Math.max(priceRange.min, Math.min(value, filters.priceMax - 100))
        : filters.priceMin,
      priceMax: thumb === "max"
        ? Math.min(priceRange.max, Math.max(value, filters.priceMin + 100))
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
    setTimeout(() => {
      const newUrl = slug ? `${window.location.pathname}?category=${slug}` : window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }, 0);
  };

  return (
    <div className={styles.container}>
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
            updateURLWithFilters={updateURLWithFilters}
          />
        </div>
        <SortControl 
          sortOption={sortOption} 
          onChange={handleSortChange} 
          disabled={loading} 
        />
      </div>

      <div className={styles.contentWrapper}>
        <React.Suspense fallback={<div className={`${styles.sidebar} ${styles.loading}`}>Loading filters...</div>}>
          <FiltersSidebar 
            loading={loading}
            slug={slug}
            filters={filters}
            priceRange={priceRange}
            finalFilterGroups={finalFilterGroups}
            handleCategoryChange={handleCategoryChange}
            handleFilterChange={handleFilterChange}
            handlePriceChange={handlePriceChange}
          />
        </React.Suspense>
        <React.Suspense fallback={<div className={styles.productGrid}>Loading products...</div>}>
          <ProductsDisplay 
            loading={loading}
            isFiltering={isFiltering}
            error={error}
            filteredProducts={filteredProducts}
          />
        </React.Suspense>
      </div>
    </div>
  );
}