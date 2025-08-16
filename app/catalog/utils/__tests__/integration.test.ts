// /app/catalog/utils/__tests__/integration.test.ts

import { renderHook } from '@testing-library/react';
import {
  serializeFilters,
  createStableDependencies,
  safeGetBoundingRect,
  useStableFilters,
  useStableCallback
} from '../index';
import { FilterOptions, PriceRange } from '../../types';

describe('Integration tests for utility functions', () => {
  const mockFilters: FilterOptions = {
    type: ['sofa', 'chair'],
    material: ['leather', 'fabric'],
    complectation: ['shelves'],
    status: ['new'],
    size: 'double',
    priceMin: 1000,
    priceMax: 5000
  };

  const mockPriceRange: PriceRange = {
    min: 500,
    max: 10000
  };

  describe('Stable dependency management integration', () => {
    it('should create consistent dependencies across multiple calls', () => {
      const deps1 = createStableDependencies(mockFilters, mockPriceRange, 'price_asc', 'sofas');
      const deps2 = createStableDependencies(mockFilters, mockPriceRange, 'price_asc', 'sofas');

      expect(deps1.filtersHash).toBe(deps2.filtersHash);
      expect(deps1.priceMin).toBe(deps2.priceMin);
      expect(deps1.priceMax).toBe(deps2.priceMax);
      expect(deps1.sortOption).toBe(deps2.sortOption);
      expect(deps1.slug).toBe(deps2.slug);
    });

    it('should detect changes in filter dependencies', () => {
      const filters1: FilterOptions = { ...mockFilters };
      const filters2: FilterOptions = { ...mockFilters, type: ['table'] };

      const deps1 = createStableDependencies(filters1, mockPriceRange, 'price_asc', 'sofas');
      const deps2 = createStableDependencies(filters2, mockPriceRange, 'price_asc', 'sofas');

      expect(deps1.filtersHash).not.toBe(deps2.filtersHash);
    });
  });

  describe('Hook integration with stable dependencies', () => {
    it('should create stable filter representations', () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useStableFilters(filters),
        { initialProps: { filters: mockFilters } }
      );

      const firstResult = result.current;

      // Re-render with same filters
      rerender({ filters: { ...mockFilters } });

      const secondResult = result.current;

      // Results should be the same due to memoization
      expect(firstResult.typeString).toBe(secondResult.typeString);
      expect(firstResult.materialString).toBe(secondResult.materialString);
    });

    it('should create stable callbacks', () => {
      const mockCallback = jest.fn();
      const deps = [mockFilters, mockPriceRange];

      const { result, rerender } = renderHook(
        ({ callback, dependencies }) => useStableCallback(callback, dependencies),
        { initialProps: { callback: mockCallback, dependencies: deps } }
      );

      const firstCallback = result.current;

      // Re-render with same dependencies
      rerender({ callback: mockCallback, dependencies: [...deps] });

      const secondCallback = result.current;

      // Callbacks should be the same reference due to stable serialization
      expect(firstCallback).toBe(secondCallback);
    });
  });

  describe('DOM access integration with error handling', () => {
    it('should handle DOM operations safely in combination', () => {
      // Create a mock element that will fail getBoundingClientRect
      const mockElement = {
        getBoundingClientRect: jest.fn().mockImplementation(() => {
          throw new Error('DOM error');
        })
      } as unknown as HTMLElement;

      // This should not throw and should return null
      const rect = safeGetBoundingRect(mockElement);
      expect(rect).toBeNull();

      // Verify the error was handled gracefully
      expect(mockElement.getBoundingClientRect).toHaveBeenCalled();
    });

    it('should work with valid DOM elements', () => {
      const mockRect = { 
        width: 100, 
        height: 50, 
        x: 0, 
        y: 0, 
        top: 0, 
        left: 0, 
        bottom: 50, 
        right: 100 
      };

      const mockElement = {
        getBoundingClientRect: jest.fn().mockReturnValue(mockRect)
      } as unknown as HTMLElement;

      const rect = safeGetBoundingRect(mockElement);
      expect(rect).toBe(mockRect);
    });
  });

  describe('Filter serialization consistency', () => {
    it('should maintain consistency across different filter orders', () => {
      const filters1: FilterOptions = {
        type: ['sofa', 'chair', 'table'],
        material: ['leather', 'fabric'],
        priceMin: 1000,
        priceMax: 2000
      };

      const filters2: FilterOptions = {
        type: ['table', 'chair', 'sofa'], // Different order
        material: ['fabric', 'leather'], // Different order
        priceMin: 1000,
        priceMax: 2000
      };

      const serialized1 = serializeFilters(filters1);
      const serialized2 = serializeFilters(filters2);

      expect(serialized1).toBe(serialized2);
    });

    it('should handle complex filter combinations', () => {
      const complexFilters: FilterOptions = {
        type: ['sofa', 'chair'],
        material: ['leather'],
        complectation: ['shelves', 'lift'],
        facadeMaterial: ['wood', 'metal'],
        tabletopShape: ['round', 'square'],
        status: ['new', 'on_sale'],
        size: 'double',
        specifics: 'premium',
        backrest: 'high',
        hardness: 'medium',
        priceMin: 1500,
        priceMax: 8000
      };

      expect(() => serializeFilters(complexFilters)).not.toThrow();
      
      const serialized = serializeFilters(complexFilters);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });
  });
});