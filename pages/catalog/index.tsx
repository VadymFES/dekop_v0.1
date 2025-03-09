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
  SofaBedSpecs
} from "@/app/lib/definitions";
import ProductCard from "@/app/components/productCard/productCard";
import ProductGridSkeleton from "@/pages/catalog/components/ui/gridSkeleton/ProductGridSkeleton";
import FiltersSkeleton from "@/pages/catalog/components/ui/FiltersSkeleton/FiltersSkeleton";

const CATEGORY_SLUG_MAP: Record<string, { dbValue: string; uaName: string }> = {
  sofas:      { dbValue: "Диван", uaName: "Дивани" },
  sofaBeds:   { dbValue: "Диван-Ліжко", uaName: "Дивани-ліжка" },
  cornerSofas:{ dbValue: "Кутовий Диван", uaName: "Кутові дивани" }, 
  chairs:     { dbValue: "Стілець", uaName: "Стільці" },
  tables:     { dbValue: "Стіл", uaName: "Столи" },
  wardrobes:  { dbValue: "Шафа", uaName: "Шафи" },
  beds:       { dbValue: "Ліжко", uaName: "Ліжка" },
  mattresses: { dbValue: "Матрац", uaName: "Матраци" },
  accessories:{ dbValue: "Аксесуар", uaName: "Аксесуари" }
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

// Type guards to check product spec types
function isSofaSpecs(specs: ProductSpecs | null): specs is SofaSpecs | CornerSofaSpecs | SofaBedSpecs {
  return specs !== null && 
    (specs.category === 'sofas' || specs.category === 'corner_sofas' || specs.category === 'sofa_beds');
}

// Helper to safely check for additional features
function hasAdditionalFeatures(specs: ProductSpecs | null): boolean {
  return (
    specs !== null &&
    isSofaSpecs(specs) && 
    typeof specs.additional_features === 'string' && 
    specs.additional_features.length > 0
  );
}

// Helper to get additional features text
function getAdditionalFeatures(specs: ProductSpecs | null): string | undefined {
  if (specs !== null && isSofaSpecs(specs)) {
    return specs.additional_features;
  }
  return undefined;
}

// Функція для перевірки, чи товар має матеріал
function hasMaterial(specs: ProductSpecs | null): boolean {
  if (!specs) return false;
  
  // Для софа, кутових софа та інших типів з матеріалом як об'єктом
  if (isSofaSpecs(specs) && specs.material && typeof specs.material === 'object' && specs.material.type) {
    return true;
  }
  
  // Для типів з матеріалом як рядком (матраци, стільці, тощо)
  if ('material' in specs && typeof specs.material === 'string') {
    return true;
  }
  
  // Для типів з type як властивістю матеріалу (MattressSpecs)
  if (specs.category === 'mattresses' && 'type' in specs) {
    return true;
  }
  
  return false;
}

// Функція для отримання значення матеріалу як рядок
function getMaterialValue(specs: ProductSpecs | null): string | null {
  if (!specs) return null;
  
  // Для софа, кутових софа та інших типів з матеріалом як об'єктом
  if (isSofaSpecs(specs) && specs.material && typeof specs.material === 'object' && specs.material.type) {
    return specs.material.type;
  }
  
  // Для типів з матеріалом як рядком
  if ('material' in specs && typeof specs.material === 'string') {
    return specs.material;
  }
  
  // Для матраців використовуємо type як матеріал
  if (specs.category === 'mattresses' && 'type' in specs) {
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
  });
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);
  const [sortOption, setSortOption] = useState<string>("default");

  const slugData = CATEGORY_SLUG_MAP[slug];
  const dbCategory = slugData?.dbValue || null;
  const categoryUaName = slugData?.uaName;
  const pageTitle = categoryUaName || 'Всі категорії';

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

  // Додаємо функцію для відлагодження API-запитів
  const logApiRequest = (params: URLSearchParams, action: string) => {
    console.log(`${action} API request:`, {
      url: `/api/products?${params.toString()}`,
      params: Object.fromEntries(params.entries())
    });
  };

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dbCategory) params.append("category", dbCategory);
        
        logApiRequest(params, "Initiating");
        console.log(`Fetching products with category: "${dbCategory}"`);

        // Зменшуємо затримку для швидшого відображення
        await new Promise(resolve => setTimeout(resolve, 200));
        const res = await fetch(`/api/products?${params.toString()}`);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`API Error (${res.status}):`, errorText);
          throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
        }
        
        const data: ProductWithImages[] = await res.json();
        setAllProducts(data);
        setFilteredProducts(data); 
        console.log(`Fetched ${data.length} products for category "${dbCategory}"`);

        if (data.length > 0) {
          const prices = data.map((p) => parseFloat(p.price.toString())).filter(p => p > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          setPriceRange({ min: minPrice, max: maxPrice });
          setFilterOptions((prev) => ({
            ...prev,
            priceMin: minPrice,
            priceMax: maxPrice,
          }));
        } else {
          setPriceRange({ min: 0, max: 0 });
          console.log(`No products found for category "${dbCategory}"`);
        }
      } catch (err: any) {
        console.error("Error fetching products:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, [dbCategory]);

  // Ця функція викликається коли змінюються фільтри або продукти
  useEffect(() => {
    // Застосовуємо фільтрацію на клієнті тільки якщо категорія не змінювалася
    let matches = [...allProducts];
    
    // Apply type filter
    if (filterOptions.type.length > 0) {
      matches = matches.filter((p) => {
        // Safe guard against undefined specs or types
        if (!p.specs || !p.specs.types) return false;
        
        // Ensure types is treated as an array
        const productTypes = Array.isArray(p.specs.types) ? p.specs.types : [p.specs.types];
        
        return productTypes.some((type) => {
          if (!type) return false;
          const typeStr = typeof type === 'string' ? type.toLowerCase() : String(type).toLowerCase();
          return filterOptions.type.includes(typeStr);
        });
      });
    }
    
    // Apply material filter
    if (filterOptions.material.length > 0) {
      matches = matches.filter((p) => {
        if (!p.specs) return false;
        
        const materialValue = getMaterialValue(p.specs);
        if (!materialValue) return false;
        
        const materialLower = materialValue.toLowerCase();
        return filterOptions.material.some((material: string) => 
          materialLower.includes(material.toLowerCase())
        );
      });
    }
    
    // Apply complectation filters
    if (filterOptions.complectation.length > 0) {
      matches = matches.filter((p) => {
        if (!p.specs) return false;
        
        return filterOptions.complectation.every((feature: string) => {
          // Handle various complectation features
          if (feature === "shelves") {
            return isSofaSpecs(p.specs) && p.specs.has_shelves === true;
          }
          if (feature === "high_legs") {
            return isSofaSpecs(p.specs) && p.specs.leg_height === "high";
          }
          if (feature === "low_legs") {
            return isSofaSpecs(p.specs) && p.specs.leg_height === "low";
          }
          if (feature === "lift") {
            return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism === true;
          }
          if (feature === "no_lift") {
            return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism === false;
          }
          
          // Check additional features text if applicable
          const additionalFeatures = getAdditionalFeatures(p.specs);
          return additionalFeatures ? 
            additionalFeatures.toLowerCase().includes(feature.toLowerCase()) : 
            false;
        });
      });
    }
    
    // Apply size filter
    if (filterOptions.size) {
      matches = matches.filter((p) => {
        if (!p.specs || !p.specs.dimensions) return false;
        
        // Make sure we have sleeping_area dimensions
        if (isSofaSpecs(p.specs) && p.specs.dimensions.sleeping_area) {
          return filterOptions.size === "single"
            ? p.specs.dimensions.sleeping_area.width <= 1000
            : p.specs.dimensions.sleeping_area.width >= 1400;
        }
        return false;
      });
    }
    
    // Apply price filter
    if (filterOptions.priceMin !== null && filterOptions.priceMax !== null) {
      matches = matches.filter((p) => {
        const price = parseFloat(p.price.toString());
        return price >= filterOptions.priceMin && price <= filterOptions.priceMax;
      });
    }
    
    // Apply sorting
    if (sortOption === "price_asc") {
      matches.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
    } else if (sortOption === "price_desc") {
      matches.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
    } else if (sortOption === "rating_desc") {
      matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    
    setFilteredProducts(matches);
  }, [allProducts, filterOptions, sortOption]);

  // Функція для побудови запиту з фільтрами
  const buildFilteredQuery = () => {
    const params = new URLSearchParams();
    
    if (dbCategory) {
      params.append("category", dbCategory);
      console.log(`Adding category filter: ${dbCategory}`);
    }
    
    if (filterOptions.type.length > 0) {
      filterOptions.type.forEach((type: string) => {
        params.append("type", type);
        console.log(`Adding type filter: ${type}`);
      });
    }

    if (filterOptions.material.length > 0) {
      filterOptions.material.forEach((material: string) => {
        params.append("material", material);
        console.log(`Adding material filter: ${material}`);
      });
    }

    if (filterOptions.complectation.length > 0) {
      filterOptions.complectation.forEach((feature: string) => {
        params.append("feature", feature);
        console.log(`Adding feature filter: ${feature}`);
      });
    }

    if (filterOptions.size) {
      params.append("size", filterOptions.size);
      console.log(`Adding size filter: ${filterOptions.size}`);
    }

    if (filterOptions.priceMax && filterOptions.priceMax < priceRange.max) {
      params.append("maxPrice", filterOptions.priceMax.toString());
      console.log(`Adding price filter: ${filterOptions.priceMax}`);
    }

    return params;
  };

  // Функція для застосування фільтрів і завантаження відфільтрованих продуктів з API
  const applyFilters = async () => {
    setLoading(true);
    try {
      const params = buildFilteredQuery();
      logApiRequest(params, "Applying filters");
      
      const res = await fetch(`/api/products?${params.toString()}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Failed to fetch filtered products: ${res.status} ${res.statusText}`);
      }
      
      const data: ProductWithImages[] = await res.json();
      setFilteredProducts(data);
      
      console.log(`Fetched ${data.length} filtered products`);
    } catch (err: any) {
      console.error("Error fetching filtered products:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const categoryKeys = Object.keys(CATEGORY_SLUG_MAP);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const chosenSlug = e.target.value;
    // Очищаємо всі фільтри при зміні категорії
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
    
    // Перенаправляємо на нову URL
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

  const handlePriceMouseDown = (thumb: "min" | "max", e: React.MouseEvent) => {
    e.preventDefault();
    setActiveThumb(thumb);

    const moveHandler = (moveEvent: MouseEvent) => {
      if (!rangeRef.current) return;
      
      const rect = rangeRef.current.getBoundingClientRect();
      const position = (moveEvent.clientX - rect.left) / rect.width;
      const newValue = priceRange.min + position * (priceRange.max - priceRange.min);
      
      setFilterOptions((prev) => ({
        ...prev,
        priceMin: thumb === "min" 
          ? Math.max(priceRange.min, Math.min(newValue, prev.priceMax))
          : prev.priceMin,
        priceMax: thumb === "max" 
          ? Math.min(priceRange.max, Math.max(newValue, prev.priceMin))
          : prev.priceMax,
      }));
    };

    const upHandler = () => {
      setActiveThumb(null);
      document.removeEventListener("mousemove", moveHandler);
      document.removeEventListener("mouseup", upHandler);
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
          Ціна: {filterOptions.priceMin.toFixed()} - {filterOptions.priceMax.toFixed()} грн{" "}
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
      // Пошук відповідного імені типу в фільтрах поточної категорії
      let typeName = type;
      const typeFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "type");
      if (typeFilter && typeFilter.options) {
        const option = typeFilter.options.find(o => o.value === type);
        if (option) typeName = option.name;
      }
      
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
      // Пошук відповідного імені матеріалу в фільтрах поточної категорії
      let materialName = material;
      const materialFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "material");
      if (materialFilter && materialFilter.options) {
        const option = materialFilter.options.find(o => o.value === material);
        if (option) materialName = option.name;
      }
      
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
      // Пошук відповідного імені комплектації в фільтрах поточної категорії
      let featureName = feature;
      const complectationFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "complectation");
      if (complectationFilter && complectationFilter.options) {
        const option = complectationFilter.options.find(o => o.value === feature);
        if (option) featureName = option.name;
      }
      
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
      // Пошук відповідного імені розміру в фільтрах поточної категорії
      let sizeName = filterOptions.size;
      const sizeFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "size");
      if (sizeFilter && sizeFilter.options) {
        const option = sizeFilter.options.find(o => o.value === filterOptions.size);
        if (option) sizeName = option.name;
      }
      
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
        <button
          onClick={applyFilters}
          className={styles.applyFiltersButton}
        >
          Застосувати фільтри
        </button>
      </div>
    ) : null;
  };

  const renderFilters = () => {
    return finalFilterGroups.map((group) => {
      if (group.type === "range" && group.range) {
        const minPercentage = priceRange.max > priceRange.min ? 
          ((filterOptions.priceMin - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 0;
        const maxPercentage = priceRange.max > priceRange.min ? 
          ((filterOptions.priceMax - priceRange.min) / (priceRange.max - priceRange.min)) * 100 : 100;

        return (
          <div key={group.name} className={styles.filterSection}>
            <h3 className={styles.filterTitle}>Ціна</h3>
            <div className={styles.priceRangeContainer} ref={rangeRef}>
              <div className={styles.priceTrack}>
                <div
                  className={styles.priceFill}
                  style={{
                    left: `${minPercentage}%`,
                    width: `${maxPercentage - minPercentage}%`,
                  }}
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
        <p>Товарів не знайдено. Спробуйте змінити фільтри або категорію.</p>
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