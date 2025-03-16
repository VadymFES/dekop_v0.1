"use client";

import React, { useState, useEffect, ChangeEvent, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./catalog.module.css";
import {
  ProductWithImages,
  FilterGroup,
  FURNITURE_FILTERS,
  ProductSpecs,
  SofaSpecs,
  CornerSofaSpecs,
  SofaBedSpecs,
} from "@/app/lib/definitions";
import ProductCard from "@/app/shared/components/productCard/productCard";
import FiltersSkeleton from "./components/ui/FiltersSkeleton/FiltersSkeleton";
import ProductGridSkeleton from "./components/ui/gridSkeleton/ProductGridSkeleton";
import Xclose from "@/app/ui/icons/x-close/x-close";

const CATEGORY_SLUG_MAP: Record<string, { dbValue: string; uaName: string }> = {
  sofas: { dbValue: "Диван", uaName: "Дивани" },
  sofaBeds: { dbValue: "Диван-Ліжко", uaName: "Дивани-ліжка" },
  cornerSofas: { dbValue: "Кутовий Диван", uaName: "Кутові дивани" },
  chairs: { dbValue: "Стілець", uaName: "Стільці" },
  tables: { dbValue: "Стіл", uaName: "Столи" },
  wardrobes: { dbValue: "Шафа", uaName: "Шафи" },
  beds: { dbValue: "Ліжко", uaName: "Ліжка" },
  mattresses: { dbValue: "Матрац", uaName: "Матраци" },
  accessories: { dbValue: "Аксесуар", uaName: "Аксесуари" },
};

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

function isSofaSpecs(specs: ProductSpecs | null): specs is SofaSpecs | CornerSofaSpecs | SofaBedSpecs {
  return (
    specs !== null &&
    (specs.category === "sofas" || specs.category === "corner_sofas" || specs.category === "sofa_beds")
  );
}

function getAdditionalFeatures(specs: ProductSpecs | null): string | undefined {
  if (specs !== null && isSofaSpecs(specs)) {
    return specs.additional_features;
  }
  return undefined;
}

function getMaterialValue(specs: ProductSpecs | null): string | null {
  if (!specs) return null;
  if (isSofaSpecs(specs) && specs.material && typeof specs.material === "object" && specs.material.type) {
    return specs.material.type;
  }
  if ("material" in specs && typeof specs.material === "string") {
    return specs.material;
  }
  if (specs.category === "mattresses" && "type" in specs) {
    return specs.type;
  }
  return null;
}

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("category") || "";
  const rangeRef = useRef<HTMLDivElement>(null);

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
    priceMin: 0,
    priceMax: 0,
    status: [],
  });
  const [sortOption, setSortOption] = useState<string>("rating_desc");
  const [isFiltering, setIsFiltering] = useState(false);

  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName || "Всі категорії";

  const GLOBAL_FILTERS: FilterGroup[] = [
    {
      name: "Status",
      type: "checkbox",
      options: [
        { id: "new", name: "Новинки", value: "new" },
        { id: "on_sale", name: "Акційні", value: "on_sale" },
        { id: "bestseller", name: "Популярні", value: "bestseller" },
      ],
    },
  ];

  let finalFilterGroups: FilterGroup[] = [];
  if (!slug) {
    const allGroups = Object.values(FURNITURE_FILTERS).flat();
    const priceGroups = allGroups.filter((g) => g.name.toLowerCase() === "price" && g.type === "range" && g.range);
    const merged = mergePriceFilters(priceGroups);
    finalFilterGroups = [...GLOBAL_FILTERS];
    if (merged) finalFilterGroups.push(merged);
  } else {
    finalFilterGroups = [...GLOBAL_FILTERS, ...(FURNITURE_FILTERS[slug] || [])];
  }

  const getFiltersFromURL = () => {
    const type = searchParams.getAll("type") || [];
    const material = searchParams.getAll("material") || [];
    const complectation = searchParams.getAll("feature") || [];
    const size = searchParams.get("size") || null;
    const priceMin = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : priceRange.min;
    const priceMax = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : priceRange.max;
    const sort = searchParams.get("sort") || "rating_desc";
    const status = searchParams.getAll("status") || [];
    return { type, material, complectation, size, priceMin, priceMax, sort, status };
  };

  const updateURLWithFilters = () => {
    const params = new URLSearchParams();
    if (slug) params.append("category", slug);
    filterOptions.type.forEach((type: string) => params.append("type", type));
    filterOptions.material.forEach((material: string) => params.append("material", material));
    filterOptions.complectation.forEach((feature: string) => params.append("feature", feature));
    if (filterOptions.size) params.append("size", filterOptions.size);
    if (filterOptions.priceMin > priceRange.min) params.append("minPrice", filterOptions.priceMin.toString());
    if (filterOptions.priceMax < priceRange.max) params.append("maxPrice", filterOptions.priceMax.toString());
    if (sortOption !== "rating_desc") params.append("sort", sortOption);
    filterOptions.status.forEach((status: string) => params.append("status", status));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  // Fetch all products for the category
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dbCategory) params.append("category", dbCategory);
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data: ProductWithImages[] = await res.json();
        setAllProducts(data);

        const prices = data.map((p) => parseFloat(p.price.toString())).filter((p) => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        setPriceRange({ min: minPrice, max: maxPrice });

        // Apply initial filters from URL
        const urlFilters = getFiltersFromURL();
        setFilterOptions((prev) => ({
          ...prev,
          type: urlFilters.type,
          material: urlFilters.material,
          complectation: urlFilters.complectation,
          size: urlFilters.size,
          priceMin: urlFilters.priceMin,
          priceMax: urlFilters.priceMax,
          status: urlFilters.status,
        }));
        setSortOption(urlFilters.sort);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, [dbCategory, searchParams]);

  // Filtering logic
  useEffect(() => {
    if (!allProducts.length) return;

    setIsFiltering(true);
    const timeout = setTimeout(() => {
      let matches = [...allProducts];

      if (filterOptions.status.length > 0) {
        matches = matches.filter((p) =>
          filterOptions.status.some((status: string) => {
            if (status === "new") return p.is_new;
            if (status === "on_sale") return p.is_on_sale;
            if (status === "bestseller") return p.is_bestseller;
            return false;
          })
        );
      }

      if (filterOptions.type.length > 0) {
        matches = matches.filter((p) => {
          if (!p.specs || !p.specs.types) return false;
          const productTypes = Array.isArray(p.specs.types) ? p.specs.types : [p.specs.types];
          return productTypes.some((type) =>
            filterOptions.type.includes(typeof type === "string" ? type.toLowerCase() : String(type).toLowerCase())
          );
        });
      }

      if (filterOptions.material.length > 0) {
        matches = matches.filter((p) => {
          const materialValue = getMaterialValue(p.specs);
          return materialValue && filterOptions.material.some((m: string) => materialValue.toLowerCase().includes(m.toLowerCase()));
        });
      }

      if (filterOptions.complectation.length > 0) {
        matches = matches.filter((p) => {
          if (!p.specs) return false;
          return filterOptions.complectation.every((feature: string) => {
            if (feature === "shelves") return isSofaSpecs(p.specs) && p.specs.has_shelves;
            if (feature === "high_legs") return isSofaSpecs(p.specs) && p.specs.leg_height === "high";
            if (feature === "low_legs") return isSofaSpecs(p.specs) && p.specs.leg_height === "low";
            if (feature === "lift") return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism;
            if (feature === "no_lift") return isSofaSpecs(p.specs) && !p.specs.has_lift_mechanism;
            const additionalFeatures = getAdditionalFeatures(p.specs);
            return additionalFeatures && additionalFeatures.toLowerCase().includes(feature.toLowerCase());
          });
        });
      }

      if (filterOptions.size) {
        matches = matches.filter((p) => {
          if (!p.specs || !isSofaSpecs(p.specs) || !p.specs.dimensions.sleeping_area) return false;
          return filterOptions.size === "single"
            ? p.specs.dimensions.sleeping_area.width <= 1000
            : p.specs.dimensions.sleeping_area.width >= 1400;
        });
      }

      if (filterOptions.priceMin > priceRange.min || filterOptions.priceMax < priceRange.max) {
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
      } else if (sortOption === "reviews_desc") {
        matches.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
      }

      setFilteredProducts(matches);
      updateURLWithFilters();
      setIsFiltering(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [allProducts, filterOptions, sortOption]);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const chosenSlug = e.target.value;
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
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      status: [],
    });
    setSortOption("rating_desc");
    router.push(chosenSlug ? `/catalog?category=${chosenSlug}` : "/catalog");
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>, groupName: string) => {
    const { value, checked, type } = e.target;
    setFilterOptions((prev) => {
      const key = groupName.toLowerCase();
      if (type === "checkbox") {
        const currentValues = prev[key] || [];
        return {
          ...prev,
          [key]: checked ? [...currentValues, value] : currentValues.filter((v: string) => v !== value),
        };
      } else if (type === "radio") {
        return { ...prev, [key]: checked ? value : null };
      }
      return prev;
    });
  };

  const handlePriceMouseDown = (thumb: "min" | "max", e: React.MouseEvent) => {
    e.preventDefault();
    const moveHandler = (moveEvent: MouseEvent) => {
      if (!rangeRef.current) return;
      const rect = rangeRef.current.getBoundingClientRect();
      const position = (moveEvent.clientX - rect.left) / rect.width;
      const newValue = priceRange.min + position * (priceRange.max - priceRange.min);
      setFilterOptions((prev) => ({
        ...prev,
        priceMin: thumb === "min" ? Math.max(priceRange.min, Math.min(newValue, prev.priceMax)) : prev.priceMin,
        priceMax: thumb === "max" ? Math.min(priceRange.max, Math.max(newValue, prev.priceMin)) : prev.priceMax,
      }));
    };
    const upHandler = () => {
      document.removeEventListener("mousemove", moveHandler);
      document.removeEventListener("mouseup", upHandler);
      updateURLWithFilters();
    };
    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mouseup", upHandler);
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  const clearFilter = (filterType: string, value: string) => {
    setFilterOptions((prev) => {
      const key = filterType.toLowerCase();
      if (prev[key] instanceof Array) {
        return { ...prev, [key]: prev[key].filter((v: string) => v !== value) };
      } else if (prev[key] === value) {
        return { ...prev, [key]: null };
      }
      return prev;
    });
  };

  // Rest of your render functions (renderSelectedFilters, renderFilters, FiltersSidebar, ProductsDisplay) remain unchanged
  // I'll include a simplified version here for brevity, but use your original implementations

  const renderSelectedFilters = () => {
    const filters: React.ReactNode[] = [];
    filterOptions.status.forEach((status: string) => {
      const statusName = status === "new" ? "Новинки" : status === "on_sale" ? "Акційні" : "Популярні";
      filters.push(
        <div key={`status-${status}`} className={styles.filterChip} onClick={() => clearFilter("Status", status)}>
          <Xclose /> Популярні фільтри: {statusName}
        </div>
      );
    });
    if (filterOptions.priceMin > priceRange.min || filterOptions.priceMax < priceRange.max) {
      filters.push(
        <div
          key="price"
          className={styles.filterChip}
          onClick={() =>
            setFilterOptions((prev) => ({ ...prev, priceMin: priceRange.min, priceMax: priceRange.max }))
          }
        >
          <Xclose /> Ціна: {filterOptions.priceMin.toFixed()} - {filterOptions.priceMax.toFixed()} грн
        </div>
      );
    }
    filterOptions.type.forEach((type: string) => {
      filters.push(
        <div key={`type-${type}`} className={styles.filterChip} onClick={() => clearFilter("Type", type)}>
          <Xclose /> Тип: {type}
        </div>
      );
    });
    filterOptions.material.forEach((material: string) => {
      filters.push(
        <div key={`material-${material}`} className={styles.filterChip} onClick={() => clearFilter("Material", material)}>
          <Xclose /> Матеріал: {material}
        </div>
      );
    });
    filterOptions.complectation.forEach((feature: string) => {
      filters.push(
        <div key={`feature-${feature}`} className={styles.filterChip} onClick={() => clearFilter("Complectation", feature)}>
          <Xclose /> Комплектація: {feature}
        </div>
      );
    });
    if (filterOptions.size) {
      filters.push(
        <div key="size" className={styles.filterChip} onClick={() => clearFilter("Size", filterOptions.size as string)}>
          <Xclose /> Розмір: {filterOptions.size}
        </div>
      );
    }
    return filters.length > 0 ? (
      <div className={styles.selectedFilters}>
        {filters}
        <button
          onClick={() => {
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
              priceMin: priceRange.min,
              priceMax: priceRange.max,
              status: [],
            });
            router.push(slug ? `/catalog?category=${slug}` : "/catalog");
          }}
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
        const minPercentage =
          priceRange.max > priceRange.min
            ? ((filterOptions.priceMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100
            : 0;
        const maxPercentage =
          priceRange.max > priceRange.min
            ? ((filterOptions.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100
            : 100;
        return (
          <div key={group.name} className={styles.filterSection}>
            <h3 className={styles.filterTitle}>Ціна</h3>
            <div className={styles.priceRangeContainer} ref={rangeRef}>
              <div className={styles.priceTrack}>
                <div
                  className={styles.priceFill}
                  style={{ left: `${minPercentage}%`, width: `${maxPercentage - minPercentage}%` }}
                />
                <div
                  className={styles.priceThumb}
                  style={{ left: `${minPercentage}%` }}
                  onMouseDown={(e) => handlePriceMouseDown("min", e)}
                />
                <div
                  className={styles.priceThumb}
                  style={{ left: `${maxPercentage}%` }}
                  onMouseDown={(e) => handlePriceMouseDown("max", e)}
                />
              </div>
              <div className={styles.priceLabels}>
                <span>{filterOptions.priceMin.toFixed()} грн</span>
                <span>{filterOptions.priceMax.toFixed()} грн</span>
              </div>
            </div>
          </div>
        );
      } else if ((group.type === "checkbox" || group.type === "radio") && group.options) {
        return (
          <div key={group.name} className={styles.filterSection}>
            <h3 className={styles.filterTitle}>
              {group.name === "Status"
                ? "Популярні фільтри"
                : group.name === "Type"
                ? "Тип"
                : group.name === "Material"
                ? "Матеріал"
                : group.name === "Complectation"
                ? "Комплектація"
                : group.name === "Size"
                ? "Розмір"
                : group.name}
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
            {Object.keys(CATEGORY_SLUG_MAP).map((catKey) => (
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
      {loading || isFiltering ? (
        <ProductGridSkeleton count={6} />
      ) : error ? (
        <p style={{ color: "red" }}>Упс! Щось пішло не так. Спробуйте оновити сторінку</p>
      ) : filteredProducts.length === 0 ? (
        <p>Товарів не знайдено. Спробуйте змінити фільтри або категорію.</p>
      ) : (
        filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
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
        <div className={styles.filterControls}>{loading ? null : renderSelectedFilters()}</div>
        <div className={styles.sortAndCount}>
          <span className={styles.itemCount}>
            {loading || isFiltering
              ? "Завантаження товарів..."
              : `Показані ${filteredProducts.length} з ${allProducts.length} товарів`}
          </span>
          <label htmlFor="sortSelect" className={styles.sortLabel}>
            Сортувати за:
          </label>
          <select
            value={sortOption}
            onChange={handleSortChange}
            className={styles.sortSelect}
            disabled={loading}
          >
            <option value="rating_desc">Популярністю</option>
            <option value="price_asc">Ціною: від низької до високої</option>
            <option value="price_desc">Ціною: від високої до низької</option>
            <option value="reviews_desc">Відгуками</option>
          </select>
        </div>
      </div>
      <div className={styles.contentWrapper}>
        <Suspense fallback={<aside className={`${styles.sidebar} ${styles.loading}`}><FiltersSkeleton /></aside>}>
          <FiltersSidebar />
        </Suspense>
        <Suspense fallback={<div className={styles.productGrid}><ProductGridSkeleton count={6} /></div>}>
          <ProductsDisplay />
        </Suspense>
      </div>
    </div>
  );
}