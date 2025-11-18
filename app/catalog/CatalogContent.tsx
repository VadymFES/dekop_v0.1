// /app/catalog/CatalogContent.tsx
'use client';

import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./catalog.module.css";
import { FURNITURE_FILTERS, FilterGroup } from "@/app/lib/definitions";
import { CATEGORY_SLUG_MAP } from "./types";
import { mergePriceFilters } from "./utils";
import { useProductFilters } from "./hooks/useProductFilters";

// Components
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SortControl } from "./components/SortControl";
import { SelectedFilters } from "./components/SelectedFilters";
import { FiltersSidebar } from "./components/FiltersSidebar";
import { FilterModal } from "./components/FilterModal";
import { ProductsDisplay } from "./components/ProductsDisplay";

export default function CatalogContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("category") || "";

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

  // Local state for category loading
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Local state for filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Event handler: Category change
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const chosenSlug = e.target.value;
    setIsCategoryLoading(true);
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

      updateFilter(key, newValues);
    } else if (type === "radio") {
      updateFilter(key, checked ? value : null);
    }
  };

  // Event handler: Price range change
  // Note: PriceRangeFilter component already handles constraints (min/max with step)
  // so we just need to pass the value through for the correct thumb
  const handlePriceChange = (thumb: "min" | "max", value: number): void => {
    if (thumb === "min") {
      updatePriceRange(value, filters.priceMax);
    } else {
      updatePriceRange(filters.priceMin, value);
    }
  };

  // Event handler: Sort change
  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    updateSort(e.target.value);
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
              clearAllFilters={resetFilters}
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
              isFiltering={false} // No longer needed with new architecture
              error={error}
              filteredProducts={products}
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