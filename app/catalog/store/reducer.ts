

// /app/catalog/store/reducer.ts
import { CatalogState, CatalogAction } from "../types";
import { initialState } from "./initialState";

/**
 * Reducer function for catalog state management
 */
export function catalogReducer(state: CatalogState, action: CatalogAction): CatalogState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_ALL_PRODUCTS':
      return { ...state, allProducts: action.payload };
      
    case 'SET_FILTERED_PRODUCTS':
      return { ...state, filteredProducts: action.payload };
      
    case 'SET_PRICE_RANGE':
      return { ...state, priceRange: action.payload };
      
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
      
    case 'RESET_FILTERS':
      return { 
        ...state, 
        filters: { 
          ...initialState.filters, 
          priceMin: action.payload.min, 
          priceMax: action.payload.max 
        } 
      };
      
    case 'SET_SORT_OPTION':
      return { ...state, sortOption: action.payload };
      
    case 'SET_IS_FILTERING':
      return { ...state, isFiltering: action.payload };
      
    default:
      return state;
  }
}