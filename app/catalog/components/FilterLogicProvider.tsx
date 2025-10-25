// /app/catalog/components/FilterLogicProvider.tsx
'use client';

import React from 'react';
import { ProductWithImages, PriceRange } from '@/app/lib/definitions';
import { CatalogAction, FilterOptions } from '../types';
import { useFilterLogic } from '../hooks/useFilterLogic';

interface FilterLogicProviderProps {
  allProducts: ProductWithImages[];
  filters: FilterOptions;
  priceRange: PriceRange;
  sortOption: string;
  updateURL: () => void;
  dispatch: React.Dispatch<CatalogAction>;
  children: React.ReactNode;
}

/**
 * Component that wraps the useFilterLogic hook to enable error boundary catching
 */
export const FilterLogicProvider: React.FC<FilterLogicProviderProps> = ({
  allProducts,
  filters,
  priceRange,
  sortOption,
  updateURL,
  dispatch,
  children
}) => {
  // Apply filtering logic with stabilized dependencies
  // This hook call is now wrapped in a component that can be caught by error boundaries
  useFilterLogic(allProducts, filters, priceRange, sortOption, updateURL, dispatch);

  // Simply render children - the hook does all the work
  return <>{children}</>;
};