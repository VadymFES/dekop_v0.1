// /app/catalog/types/index.ts
import { ProductWithImages, ProductSpecs, SofaSpecs, CornerSofaSpecs, SofaBedSpecs, FilterGroup } from "@/app/lib/definitions";

export interface CategoryMapping {
  dbValue: string;
  uaName: string;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface FilterOptions {
type?: string[] | null;
  material?: string[] | null;
  complectation?: string[] | null;
  facadeMaterial?: string[] | null;
  specifics?: string | null;
  tabletopShape?: string[] | null;
  size?: string | null;
  backrest?: string | null;
  hardness?: string | null;
  priceMin: number;
  priceMax: number;
  status?: string[] | null;
}

export interface CatalogState {
  allProducts: ProductWithImages[];
  filteredProducts: ProductWithImages[];
  loading: boolean;
  error: string | null;
  priceRange: PriceRange;
  filters: FilterOptions;
  sortOption: string;
  isFiltering: boolean;
}

export type CatalogAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ALL_PRODUCTS'; payload: ProductWithImages[] }
  | { type: 'SET_FILTERED_PRODUCTS'; payload: ProductWithImages[] }
  | { type: 'SET_PRICE_RANGE'; payload: PriceRange }
  | { type: 'SET_FILTERS'; payload: Partial<FilterOptions> }
  | { type: 'RESET_FILTERS'; payload: PriceRange }
  | { type: 'SET_SORT_OPTION'; payload: string }
  | { type: 'APPLY_FILTER_RESULTS'; payload: { filteredProducts: ProductWithImages[], isFiltering: boolean }}
  | { type: 'SET_IS_FILTERING'; payload: boolean };

export interface FilterChipProps {
  label: string;
  value: string;
  onClick: () => void;
}

export interface SortControlProps {
  sortOption: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled: boolean;
}

export interface BreadcrumbsProps {
  title: string;
}

export interface PriceRangeFilterProps {
  title: string;
  priceRange: PriceRange;
  filterValues: FilterOptions;
  onPriceChange: (thumb: "min" | "max", value: number) => void;
}

export interface FiltersSidebarProps {
  loading: boolean;
  isCategoryLoading: boolean;
  slug: string;
  filters: FilterOptions;
  priceRange: PriceRange;
  finalFilterGroups: FilterGroup[];
  handleCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement>, groupName: string) => void;
  handlePriceChange: (thumb: "min" | "max", value: number) => void;
  isMobile?: boolean;
  isMobileFiltersOpen?: boolean;
  onCloseMobileFilters?: () => void;
}

export interface ProductsDisplayProps {
  loading: boolean;
  isFiltering: boolean;
  error: string | null;
  filteredProducts: ProductWithImages[];
}

export interface SelectedFiltersProps {
  loading: boolean;
  filters: FilterOptions;
  priceRange: PriceRange;
  slug: string;
  clearFilter: (filterType: string, value: string) => void;
  clearAllFilters: () => void;
  updateURLWithFilters: () => void;
}

// Category mapping constants
export const CATEGORY_SLUG_MAP: Record<string, CategoryMapping> = {
  sofas: { dbValue: "Диван", uaName: "Дивани" },
  sofaBeds: { dbValue: "Диван-Ліжко", uaName: "Дивани-ліжка" },
  cornerSofas: { dbValue: "Кутовий Диван", uaName: "Кутові дивани" },
  chairs: { dbValue: "Стілець", uaName: "Стільці" },
  tables: { dbValue: "Стіл", uaName: "Столи" },
  wardrobes: { dbValue: "Шафа", uaName: "Шафи" },
  beds: { dbValue: "Ліжко", uaName: "Ліжка" },
  mattresses: { dbValue: "Матрац", uaName: "Матраци" },
  accessories: { dbValue: "Аксесуар", uaName: "Аксесуари" }
};