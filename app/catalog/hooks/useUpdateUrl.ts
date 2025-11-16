// // /app/catalog/hooks/useUpdateUrl.ts
// import { useCallback } from 'react';
// import { FilterOptions, PriceRange } from '../types';

// /**
//  * Hook to update URL with current filter values
//  */
// export const useUpdateUrl = (
//   filters: FilterOptions, 
//   priceRange: PriceRange, 
//   sortOption: string, 
//   slug: string
// ) => {
//   return useCallback(() => {
//     const params = new URLSearchParams();
//     if (slug) params.append("category", slug);
    
//     // Add type filters
//     filters.type.forEach(type => params.append("type", type));
    
//     // Add material filters
//     filters.material.forEach(material => params.append("material", material));
    
//     // Add feature/complectation filters
//     filters.complectation.forEach(feature => params.append("feature", feature));
    
//     // Add size filter
//     if (filters.size) params.append("size", filters.size);
    
//     // Add price range filters
//     if (filters.priceMin > priceRange.min) {
//       params.append("minPrice", Math.floor(filters.priceMin).toString());
//     }
    
//     if (filters.priceMax < priceRange.max) {
//       params.append("maxPrice", Math.floor(filters.priceMax).toString());
//     }
    
//     // Add sort option
//     if (sortOption !== "rating_desc") params.append("sort", sortOption);
    
//     // Add status filters
//     filters.status.forEach(status => params.append("status", status));
    
//     // Update URL without page reload
//     const newUrl = `${window.location.pathname}?${params.toString()}`;
//     window.history.pushState({ path: newUrl }, '', newUrl);
//   }, [filters, priceRange, sortOption, slug]);
// };

