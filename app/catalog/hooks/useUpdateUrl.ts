// /app/catalog/hooks/useUpdateUrl.ts
import { useCallback } from 'react';
import { FiltersState, PriceRange } from '@/app/lib/definitions';

export const useUpdateUrl = (
  filters: FiltersState, 
  priceRange: PriceRange, 
  sortOption: string, 
  slug: string | null // slug can be null if no category is selected
) => {
  return useCallback(() => {
    const params = new URLSearchParams();
    if (slug) {
      params.append("category", slug);
    }
    
    // Safely access optional array-based filters
    filters.type?.forEach(type => params.append("type", type));
    filters.material?.forEach(material => params.append("material", material));
    filters.complectation?.forEach(feature => params.append("feature", feature)); 
    filters.facadeMaterial?.forEach(fm => params.append("facadeMaterial", fm));
    filters.tabletopShape?.forEach(ts => params.append("tabletopShape", ts));
    filters.status?.forEach(s => params.append("status", s));
    
    // Handle optional string filters
    if (filters.size) {
      params.append("size", filters.size);
    }
    if (filters.specifics) {
      params.append("specifics", filters.specifics);
    }
    if (filters.backrest) {
      params.append("backrest", filters.backrest);
    }
    if (filters.hardness) {
      params.append("hardness", filters.hardness);
    }
    
    // Add price range filters - only if they're actually filtering (not the full range)
    const isPriceFilterActive = filters.priceMin !== null && filters.priceMax !== null && 
      priceRange.max > 0 && 
      (filters.priceMin > priceRange.min || filters.priceMax < priceRange.max);
    
    if (isPriceFilterActive) { 
      params.append("minPrice", Math.floor(filters.priceMin!).toString());
      params.append("maxPrice", Math.floor(filters.priceMax!).toString());
    }
    
    // Add sort option if not default
    if (sortOption !== "rating_desc") {
      params.append("sort", sortOption);
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }, [filters, priceRange, sortOption, slug]);
};