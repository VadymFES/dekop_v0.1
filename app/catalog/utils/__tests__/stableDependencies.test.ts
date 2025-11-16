// /app/catalog/utils/__tests__/stableDependencies.test.ts

import {
  serializeFilters,
  createMemoizedFilters,
  createStableDependencies,
  areFiltersEqual,
  arePriceRangesEqual,
  serializeFilterState
} from '../stableDependencies';
import { FilterOptions, PriceRange } from '../../types';

describe('stableDependencies utilities', () => {
  const mockFilters: FilterOptions = {
    type: ['sofa', 'chair'],
    material: ['leather', 'fabric'],
    complectation: ['shelves', 'lift'],
    status: ['new', 'on_sale'],
    size: 'double',
    priceMin: 1000,
    priceMax: 5000
  };

  const mockPriceRange: PriceRange = {
    min: 500,
    max: 10000
  };

  describe('serializeFilters', () => {
    it('should create consistent serialization for same filters', () => {
      const filters1: FilterOptions = {
        type: ['sofa', 'chair'],
        material: ['leather'],
        priceMin: 1000,
        priceMax: 2000
      };

      const filters2: FilterOptions = {
        type: ['chair', 'sofa'], // Different order
        material: ['leather'],
        priceMin: 1000,
        priceMax: 2000
      };

      const serialized1 = serializeFilters(filters1);
      const serialized2 = serializeFilters(filters2);

      expect(serialized1).toBe(serialized2);
    });

    it('should handle null and undefined values', () => {
      const filters: FilterOptions = {
        type: null,
        material: undefined,
        priceMin: 1000,
        priceMax: 2000
      };

      expect(() => serializeFilters(filters)).not.toThrow();
      const result = serializeFilters(filters);
      expect(typeof result).toBe('string');
    });
  });

  describe('createMemoizedFilters', () => {
    it('should create stable string representations', () => {
      const memoized = createMemoizedFilters(mockFilters);

      expect(memoized.typeString).toBe('chair,sofa'); // Sorted
      expect(memoized.materialString).toBe('fabric,leather'); // Sorted
      expect(memoized.size).toBe('double');
      expect(memoized.priceMin).toBe(1000);
      expect(memoized.priceMax).toBe(5000);
    });

    it('should handle empty arrays', () => {
      const filters: FilterOptions = {
        type: [],
        material: null,
        priceMin: 0,
        priceMax: 1000
      };

      const memoized = createMemoizedFilters(filters);
      expect(memoized.typeString).toBe('');
      expect(memoized.materialString).toBe('');
    });
  });

  describe('createStableDependencies', () => {
    it('should create stable dependency object', () => {
      const deps = createStableDependencies(
        mockFilters,
        mockPriceRange,
        'price_asc',
        'sofas'
      );

      expect(deps).toHaveProperty('filtersHash');
      expect(deps).toHaveProperty('priceMin', 500);
      expect(deps).toHaveProperty('priceMax', 10000);
      expect(deps).toHaveProperty('sortOption', 'price_asc');
      expect(deps).toHaveProperty('slug', 'sofas');
    });
  });

  describe('areFiltersEqual', () => {
    it('should return true for equivalent filters', () => {
      const filters1: FilterOptions = {
        type: ['sofa', 'chair'],
        material: ['leather'],
        priceMin: 1000,
        priceMax: 2000
      };

      const filters2: FilterOptions = {
        type: ['chair', 'sofa'], // Different order
        material: ['leather'],
        priceMin: 1000,
        priceMax: 2000
      };

      expect(areFiltersEqual(filters1, filters2)).toBe(true);
    });

    it('should return false for different filters', () => {
      const filters1: FilterOptions = {
        type: ['sofa'],
        priceMin: 1000,
        priceMax: 2000
      };

      const filters2: FilterOptions = {
        type: ['chair'],
        priceMin: 1000,
        priceMax: 2000
      };

      expect(areFiltersEqual(filters1, filters2)).toBe(false);
    });
  });

  describe('arePriceRangesEqual', () => {
    it('should return true for equal price ranges', () => {
      const range1: PriceRange = { min: 100, max: 1000 };
      const range2: PriceRange = { min: 100, max: 1000 };

      expect(arePriceRangesEqual(range1, range2)).toBe(true);
    });

    it('should return false for different price ranges', () => {
      const range1: PriceRange = { min: 100, max: 1000 };
      const range2: PriceRange = { min: 200, max: 1000 };

      expect(arePriceRangesEqual(range1, range2)).toBe(false);
    });
  });

  describe('serializeFilterState', () => {
    it('should create complete serialized state', () => {
      const serialized = serializeFilterState(
        mockFilters,
        mockPriceRange,
        'price_desc',
        'chairs'
      );

      expect(typeof serialized).toBe('string');
      
      const parsed = JSON.parse(serialized);
      expect(parsed).toHaveProperty('filters');
      expect(parsed).toHaveProperty('priceRange');
      expect(parsed).toHaveProperty('sortOption', 'price_desc');
      expect(parsed).toHaveProperty('slug', 'chairs');
    });
  });
});