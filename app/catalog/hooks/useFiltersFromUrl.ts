// /app/catalog/hooks/useFiltersFromUrl.ts
import { useCallback } from 'react';
import { ReadonlyURLSearchParams } from 'next/navigation';

/**
 * Hook to extract filter values from URL search parameters
 */
export const useFiltersFromUrl = () => {
  return useCallback((params: ReadonlyURLSearchParams | null) => {
    if (!params) {
      return {
        type: [] as string[],
        material: [] as string[],
        complectation: [] as string[],
        size: null as string | null,
        priceMin: 0,
        priceMax: 0,
        sort: 'rating_desc',
        status: [] as string[],
      };
    }

    return {
      type: params.getAll('type') || [],
      material: params.getAll('material') || [],
      complectation: params.getAll('feature') || [],
      size: params.get('size') || null,
      priceMin: params.get('minPrice') ? Number(params.get('minPrice')) : 0,
      priceMax: params.get('maxPrice') ? Number(params.get('maxPrice')) : 0,
      sort: params.get('sort') || 'rating_desc',
      status: params.getAll('status') || [],
    };
  }, []);
};

