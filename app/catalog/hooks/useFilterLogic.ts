// /app/catalog/hooks/useFilterLogic.ts
import { useEffect } from 'react';
import { ProductWithImages } from '@/app/lib/definitions';
import { CatalogAction, FilterOptions } from '../types';
import { getMaterialValue, getAdditionalFeatures, isSofaSpecs } from '../utils';

/**
 * Hook to handle product filtering logic
 */
export const useFilterLogic = (
  allProducts: ProductWithImages[],
  filters: FilterOptions,
  sortOption: string,
  updateURL: () => void,
  dispatch: React.Dispatch<CatalogAction>
) => {
  useEffect(() => {
    if (!allProducts.length) return;

    dispatch({ type: 'SET_IS_FILTERING', payload: true });
    
    const filterTimeout = setTimeout(() => {
      // Create a copy of products to work with
      let matches = [...allProducts];

      // Apply status filters
      if (filters.status.length > 0) {
        matches = matches.filter(p => 
          filters.status.some(status => {
            if (status === 'new') return p.is_new;
            if (status === 'on_sale') return p.is_on_sale;
            if (status === 'bestseller') return p.is_bestseller;
            return false;
          })
        );
      }

      // Apply type filters
      if (filters.type.length > 0) {
        matches = matches.filter(p => {
          if (!p.specs?.types) return false;
          const productTypes = Array.isArray(p.specs.types) ? p.specs.types : [p.specs.types];
          return productTypes.some(type => {
            if (!type) return false;
            const typeStr = typeof type === 'string' ? type.toLowerCase() : String(type).toLowerCase();
            return filters.type.includes(typeStr);
          });
        });
      }

      // Apply material filters
      if (filters.material.length > 0) {
        matches = matches.filter(p => {
          const materialValue = getMaterialValue(p.specs);
          if (!materialValue) return false;
          return filters.material.some(material =>
            materialValue.toLowerCase().includes(material.toLowerCase())
          );
        });
      }

      // Apply complectation filters
      if (filters.complectation.length > 0) {
        matches = matches.filter(p => {
          if (!p.specs) return false;
          return filters.complectation.every(feature => {
            if (feature === "shelves") return isSofaSpecs(p.specs) && p.specs.has_shelves === true;
            if (feature === "high_legs") return isSofaSpecs(p.specs) && p.specs.leg_height === "high";
            if (feature === "low_legs") return isSofaSpecs(p.specs) && p.specs.leg_height === "low";
            if (feature === "lift") return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism === true;
            if (feature === "no_lift") return isSofaSpecs(p.specs) && p.specs.has_lift_mechanism === false;
            
            const additionalFeatures = getAdditionalFeatures(p.specs);
            return additionalFeatures ? 
              additionalFeatures.toLowerCase().includes(feature.toLowerCase()) : false;
          });
        });
      }

      // Apply size filter
      if (filters.size) {
        matches = matches.filter(p => {
          if (!p.specs?.dimensions) return false;
          if (isSofaSpecs(p.specs) && p.specs.dimensions.sleeping_area) {
            return filters.size === "single"
              ? p.specs.dimensions.sleeping_area.width <= 1000
              : p.specs.dimensions.sleeping_area.width >= 1400;
          }
          return false;
        });
      }

      // Apply price filter
      if (filters.priceMin !== null && filters.priceMax !== null) {
        matches = matches.filter(p => {
          const price = parseFloat(p.price.toString());
          return price >= filters.priceMin && price <= filters.priceMax;
        });
      }

      // Apply sorting - create a new array to avoid mutating the filtered results
      const sortedMatches = [...matches];
      
      switch (sortOption) {
        case "price_asc":
          sortedMatches.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
          break;
          
        case "price_desc":
          sortedMatches.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
          break;
          
        case "reviews_desc":
          sortedMatches.sort((a, b) => {
            const reviewsA = typeof a.reviews === 'number' ? a.reviews : parseInt(a.reviews || '0');
            const reviewsB = typeof b.reviews === 'number' ? b.reviews : parseInt(b.reviews || '0');
            return reviewsB - reviewsA;
          });
          break;
          
        default: // rating_desc
          sortedMatches.sort((a, b) => {
            const ratingA = typeof a.rating === 'number' ? a.rating : parseFloat(a.rating || '0');
            const ratingB = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating || '0');
            return ratingB - ratingA;
          });
      }

      // Use the combined action to update both filtered products and filtering state in one dispatch
      dispatch({ 
        type: 'APPLY_FILTER_RESULTS', 
        payload: {
          filteredProducts: sortedMatches,
          isFiltering: false
        }
      });
      
      // Move updateURL after dispatching
      updateURL();
    }, 300); // Debounce filtering for better performance

    // Cleanup timeout on dependency changes
    return () => clearTimeout(filterTimeout);
  }, [allProducts, filters, sortOption, updateURL, dispatch]);
};