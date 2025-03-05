// pages/CatalogPage.tsx
"use client";

import React, { useState, useEffect, ChangeEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./catalog.module.css";
import { ProductWithImages, FilterGroup, FURNITURE_FILTERS } from "@/app/lib/definitions";
import ProductCard from "@/app/components/productCard/productCard";
import ProductGridSkeleton from "@/pages/catalog/components/ui/gridSkeleton/ProductGridSkeleton";
import FiltersSkeleton from "@/pages/catalog/components/ui/FiltersSkeleton/FiltersSkeleton";

// Category mapping with database values and Ukrainian names
const CATEGORY_SLUG_MAP: Record<string, { dbValue: string; uaName: string }> = {
  sofas:      { dbValue: "Диван", uaName: "Дивани" },
  sofaBeds:   { dbValue: "Диван-Ліжко", uaName: "Дивани-ліжка" },
  cornerSofas:{ dbValue: "Кутовий Диван", uaName: "Кутові дивани" },
  chairs:     { dbValue: "Стілець", uaName: "Стільці" },
  tables:     { dbValue: "Стіл", uaName: "Столи" },
  wardrobes:  { dbValue: "Шафа", uaName: "Шафи" },
  kitchens:   { dbValue: "Кухня", uaName: "Кухні" },
  beds:       { dbValue: "Ліжко", uaName: "Ліжка" },
  mattresses: { dbValue: "Матрац", uaName: "Матраци" },
  accessories:{ dbValue: "Аксесуар", uaName: "Аксесуари" }
};

// Merge price filter groups for consistent range across categories
function mergePriceFilters(priceGroups: FilterGroup[]): FilterGroup | null {
  if (priceGroups.length === 0) return null;
  const merged = { ...priceGroups[0] };
  merged.range = merged.range ? { ...merged.range } : undefined;
  for (let i = 1; i < priceGroups.length; i++) {
    const g = priceGroups[i];
    if (!g.range || !merged.range) continue;
    merged.range.min = Math.min(merged.range.min, g.range.min);
    merged.range.max = Math.max(merged.range.max, g.range.max);
    merged.range.step = Math.min(merged.range.step, g.range.step);
  }
  return merged;
}

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("category") || "";

  const [allProducts, setAllProducts] = useState<ProductWithImages[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  const [filterOptions, setFilterOptions] = useState<Record<string, any>>({
    type: [],
    material: [],
    complectation: [],
    facadeMaterial: [],
    specifics: null,
    tabletopShape: [],
    size: null,
    backrest: null,
    hardness: null,
    priceMin: 0, // New state for minimum price
    priceMax: 0, // Updated to reflect maximum price
  });

  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName;

  let finalFilterGroups: FilterGroup[] = [];
  if (!slug) {
    const allGroups = Object.values(FURNITURE_FILTERS).flat();
    const priceGroups = allGroups.filter(
      (g) => g.name.toLowerCase() === "price" && g.type === "range" && g.range
    );
    const merged = mergePriceFilters(priceGroups);
    if (merged) finalFilterGroups = [merged];
  } else {
    finalFilterGroups = FURNITURE_FILTERS[slug] || [];
  }

  const [sortOption, setSortOption] = useState<string>("default");

  // Use Suspense-compatible data fetching
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dbCategory) params.append("category", dbCategory);

        // Add artificial delay for loading state demonstration
        await new Promise(resolve => setTimeout(resolve, 500));

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data: ProductWithImages[] = await res.json();
        setAllProducts(data);

        if (data.length > 0) {
          const prices = data.map((p) => parseFloat(p.price.toString())).filter(p => p > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          setPriceRange({ min: minPrice, max: maxPrice });
          setFilterOptions((prev) => ({
            ...prev,
            priceMin: minPrice, // Set initial minimum price
            priceMax: maxPrice, // Set initial maximum price
          }));
        } else {
          setPriceRange({ min: 0, max: 0 });
        }
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, [dbCategory]);

  useEffect(() => {
    let matches = [...allProducts];
    if (filterOptions.type.length > 0) {
      matches = matches.filter((p) =>
        p.specs && p.specs.types.some((type: string) => 
          filterOptions.type.includes(type.toLowerCase())
        )
      );
    }
    if (filterOptions.material.length > 0) {
      matches = matches.filter((p) => {
        if (!p.specs || !p.specs.material?.type) return false;
        const materialType = p.specs.material.type.toLowerCase();
        return filterOptions.material.some((material: string) => 
          materialType === material.toLowerCase()
        );
      });
    }
    if (filterOptions.complectation.length > 0) {
      matches = matches.filter((p) => {
        if (!p.specs) return false;
        return filterOptions.complectation.every((feature: string) => {
          if (feature === "shelves") return p.specs.has_shelves === true;
          if (feature === "high_legs") return p.specs.leg_height === "high";
          if (feature === "low_legs") return p.specs.leg_height === "low";
          if (feature === "lift") return p.specs.has_lift_mechanism === true;
          if (feature === "no_lift") return p.specs.has_lift_mechanism === false;
          return p.specs.additional_features?.toLowerCase().includes(feature.toLowerCase());
        });
      });
    }
    if (filterOptions.size) {
      matches = matches.filter((p) =>
        p.specs && (
          filterOptions.size === "single"
            ? p.specs.dimensions?.sleeping_area?.width <= 1000
            : p.specs.dimensions?.sleeping_area?.width >= 1400
        )
      );
    }
    if (filterOptions.priceMin !== null && filterOptions.priceMax !== null) {
      matches = matches.filter((p) => {
        const price = parseFloat(p.price.toString());
        return price >= filterOptions.priceMin && price <= filterOptions.priceMax;
      });
    }
    if (sortOption === "price_asc") {
      matches.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
    } else if (sortOption === "price_desc") {
      matches.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
    } else if (sortOption === "rating_desc") {
      matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    setFilteredProducts(matches);
  }, [allProducts, filterOptions, sortOption]);

  const categoryKeys = Object.keys(FURNITURE_FILTERS);
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const chosenSlug = e.target.value;
    router.push(chosenSlug ? `/catalog?category=${chosenSlug}` : "/catalog");
    setFilterOptions({
      type: [],
      material: [],
      complectation: [],
      facadeMaterial: [],
      specifics: null,
      tabletopShape: [],
      size: null,
      backrest: null,
      hardness: null,
      priceMin: 0,
      priceMax: 0,
    });
    setSortOption("default");
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>, groupName: string) => {
    const { value, checked, type } = e.target;
    setFilterOptions((prev) => {
      const key = groupName.toLowerCase();
      if (type === "checkbox") {
        const currentValues = prev[key] || [];
        return {
          ...prev,
          [key]: checked
            ? [...currentValues, value]
            : currentValues.filter((v: string) => v !== value),
        };
      } else if (type === "radio") {
        return {
          ...prev,
          [key]: checked ? value : null,
        };
      }
      return prev;
    });
  };

  const handlePriceMinChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value); // Use parseFloat for precise decimal handling
    setFilterOptions((prev) => ({
      ...prev,
      priceMin: Math.max(priceRange.min, Math.min(value, prev.priceMax || priceRange.max)),
    }));
  };

  const handlePriceMaxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value); // Use parseFloat for precise decimal handling
    setFilterOptions((prev) => ({
      ...prev,
      priceMax: Math.min(priceRange.max, Math.max(value, prev.priceMin || priceRange.min)),
    }));
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  const clearFilter = (filterType: string, value: string) => {
    setFilterOptions((prev) => {
      const key = filterType.toLowerCase();
      if (prev[key] instanceof Array) {
        return {
          ...prev,
          [key]: prev[key].filter((v: string) => v !== value),
        };
      } else if (prev[key] === value) {
        return {
          ...prev,
          [key]: null,
        };
      }
      return prev;
    });
  };

  const renderSelectedFilters = () => {
    const filters: React.ReactNode[] = [];
    if (filterOptions.priceMin > priceRange.min || filterOptions.priceMax < priceRange.max) {
      filters.push(
        <div key="price" className={styles.filterChip}>
          Ціна: {filterOptions.priceMin.toFixed(2)} - {filterOptions.priceMax.toFixed(2)} грн{" "}
          <button
            onClick={() => {
              setFilterOptions((prev) => ({
                ...prev,
                priceMin: priceRange.min,
                priceMax: priceRange.max,
              }));
            }}
            className={styles.filterChipRemove}
          >
            ×
          </button>
        </div>
      );
    }
    filterOptions.type.forEach((type: string) => {
      const typeName = FURNITURE_FILTERS.sofas?.find(g => g.name.toLowerCase() === "type")?.options?.find(o => o.value === type)?.name || type;
      filters.push(
        <div key={`type-${type}`} className={styles.filterChip}>
          Тип: {typeName}{" "}
          <button
            onClick={() => clearFilter("Type", type)}
            className={styles.filterChipRemove}
          >
            ×
          </button>
        </div>
      );
    });
    filterOptions.material.forEach((material: string) => {
      const materialName = FURNITURE_FILTERS.sofas?.find(g => g.name.toLowerCase() === "material")?.options?.find(o => o.value === material)?.name || material;
      filters.push(
        <div key={`material-${material}`} className={styles.filterChip}>
          Матеріал: {materialName}{" "}
          <button
            onClick={() => clearFilter("Material", material)}
            className={styles.filterChipRemove}
          >
            ×
          </button>
        </div>
      );
    });
    filterOptions.complectation.forEach((feature: string) => {
      const featureName = FURNITURE_FILTERS.sofas?.find(g => g.name.toLowerCase() === "complectation")?.options?.find(o => o.value === feature)?.name || feature;
      filters.push(
        <div key={`complectation-${feature}`} className={styles.filterChip}>
          Комплектація: {featureName}{" "}
          <button
            onClick={() => clearFilter("Complectation", feature)}
            className={styles.filterChipRemove}
          >
            ×
          </button>
        </div>
      );
    });
    if (filterOptions.size) {
      const sizeName = FURNITURE_FILTERS.sofas?.find(g => g.name.toLowerCase() === "size")?.options?.find(o => o.value === filterOptions.size)?.name || filterOptions.size;
      filters.push(
        <div key="size" className={styles.filterChip}>
          Розмір: {sizeName}{" "}
          <button
            onClick={() => clearFilter("Size", filterOptions.size as string)}
            className={styles.filterChipRemove}
          >
            ×
          </button>
        </div>
      );
    }
    return filters.length > 0 ? (
      <div className={styles.selectedFilters}>
        {filters}
        <button
          onClick={() => setFilterOptions({
            type: [],
            material: [],
            complectation: [],
            facadeMaterial: [],
            specifics: null,
            tabletopShape: [],
            size: null,
            backrest: null,
            hardness: null,
            priceMin: priceRange.min,
            priceMax: priceRange.max,
          })}
          className={styles.clearAllFilters}
        >
          Очистити всі фільтри
        </button>
      </div>
    ) : null;
  };

  const renderFilters = () => {
    return finalFilterGroups.map((group) => {
      if (group.type === "range" && group.range) {
        return (
          <div key={group.name} className={styles.filterSection}>
            <h3 className={styles.filterTitle}>{group.name === "Price" ? "Ціна" : group.name}</h3>
            <div className={styles.priceRangeWrapper}>
              <span
                className={styles.rangeLabel}
                style={{
                  left: `${((filterOptions.priceMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                }}
              >
                {filterOptions.priceMin.toFixed(2)}
              </span>
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                value={filterOptions.priceMin}
                onChange={handlePriceMinChange}
                className={styles.rangeInput}
                style={{ zIndex: filterOptions.priceMin > filterOptions.priceMax ? 2 : 1 }}
              />
              <span
                className={styles.rangeLabel}
                style={{
                  left: `${((filterOptions.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                }}
              >
                {filterOptions.priceMax.toFixed(2)}
              </span>
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                value={filterOptions.priceMax}
                onChange={handlePriceMaxChange}
                className={styles.rangeInput}
                style={{ zIndex: filterOptions.priceMax < filterOptions.priceMin ? 2 : 1 }}
              />
            </div>
          </div>
        );
      } else if ((group.type === "checkbox" || group.type === "radio") && group.options) {
        return (
          <div key={group.name} className={styles.filterSection}>
            <h3 className={styles.filterTitle}>
              {group.name === "Type" ? "Тип" :
               group.name === "Material" ? "Матеріал" :
               group.name === "Complectation" ? "Комплектація" :
               group.name === "Size" ? "Розмір" : group.name}
            </h3>
            <ul className={styles.filterList}>
              {group.options.map((opt) => (
                <li key={opt.id} className={styles.filterItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type={group.type}
                      value={opt.value}
                      checked={
                        group.type === "checkbox"
                          ? filterOptions[group.name.toLowerCase()]?.includes(opt.value)
                          : filterOptions[group.name.toLowerCase()] === opt.value
                      }
                      onChange={(e) => handleFilterChange(e, group.name)}
                      className={styles.checkbox}
                    />
                    {opt.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      }
      return null;
    });
  };

  // Components for Suspense
  const FiltersSidebar = () => (
    <aside className={`${styles.sidebar} ${loading ? styles.loading : ""}`}>
      {loading ? (
        <FiltersSkeleton />
      ) : (
        <>
          <label htmlFor="categorySelect" className={styles.categorySelectLabel}>
            Обрати категорію:
          </label>
          <select
            id="categorySelect"
            value={slug}
            onChange={handleCategoryChange}
            className={styles.categorySelect}
          >
            <option value="">Всі категорії</option>
            {categoryKeys.map((catKey) => (
              <option key={catKey} value={catKey}>
                {CATEGORY_SLUG_MAP[catKey]?.uaName || catKey}
              </option>
            ))}
          </select>
          {renderFilters()}
        </>
      )}
    </aside>
  );

  const ProductsDisplay = () => (
    <div className={styles.productGrid}>
      {loading ? (
        <ProductGridSkeleton count={6} />
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : filteredProducts.length === 0 ? (
        <p>Товарів не знайдено.</p>
      ) : (
        filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumbs}>
        <Link href="/">На головну</Link>
        <span className={styles.breadcrumbSeparator}> / </span>
        <span className={styles.breadcrumbActive}>{pageTitle}</span>
      </div>

      <h1 className={styles.pageTitle}>{pageTitle}</h1>

      <div className={styles.topControls}>
        <div className={styles.filterControls}>
          {loading ? null : renderSelectedFilters()}
        </div>
        <div className={styles.sortAndCount}>
          <span className={styles.itemCount}>
            Показані {filteredProducts.length} з {allProducts.length} товарів
          </span>
          <select
            value={sortOption}
            onChange={handleSortChange}
            className={styles.sortSelect}
            disabled={loading}
          >
            <option value="default">Сортувати за</option>
            <option value="price_asc">Ціна: від низької до високої</option>
            <option value="price_desc">Ціна: від високої до низької</option>
            <option value="rating_desc">Рейтинг: від високого до низького</option>
          </select>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <Suspense fallback={
          <aside className={`${styles.sidebar} ${styles.loading}`}>
            <FiltersSkeleton />
          </aside>
        }>
          <FiltersSidebar />
        </Suspense>

        <Suspense fallback={
          <div className={styles.productGrid}>
            <ProductGridSkeleton count={6} />
          </div>
        }>
          <ProductsDisplay />
        </Suspense>
      </div>
    </div>
  );
}