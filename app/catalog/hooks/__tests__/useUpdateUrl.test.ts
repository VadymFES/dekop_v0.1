// /app/catalog/hooks/__tests__/useUpdateUrl.test.ts

import { renderHook } from '@testing-library/react';
import { useUpdateUrl } from '../useUpdateUrl';
import { FilterOptions } from '../../types';
import { PriceRange } from '@/app/lib/definitions';

// Mock window.history.pushState
const mockPushState = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/catalog',
  },
  writable: true,
});

describe('useUpdateUrl hook', () => {
  beforeEach(() => {
    mockPushState.mockClear();
  });

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

  describe('memoization effectiveness', () => {
    it('should return the same callback reference when dependencies do not change', () => {
      const { result, rerender } = renderHook(
        ({ filters, priceRange, sortOption, slug }) => 
          useUpdateUrl(filters, priceRange, sortOption, slug),
        {
          initialProps: {
            filters: mockFilters,
            priceRange: mockPriceRange,
            sortOption: 'rating_desc',
            slug: 'sofas'
          }
        }
      );

      const firstCallback = result.current;

      // Rerender with the same props
      rerender({
        filters: mockFilters,
        priceRange: mockPriceRange,
        sortOption: 'rating_desc',
        slug: 'sofas'
      });

      const secondCallback = result.current;

      // Should be the same reference due to memoization
      expect(firstCallback).toBe(secondCallback);
    });

    it('should return a new callback reference when filter arrays change', () => {
      const { result, rerender } = renderHook(
        ({ filters, priceRange, sortOption, slug }) => 
          useUpdateUrl(filters, priceRange, sortOption, slug),
        {
          initialProps: {
            filters: mockFilters,
            priceRange: mockPriceRange,
            sortOption: 'rating_desc',
            slug: 'sofas'
          }
        }
      );

      const firstCallback = result.current;

      // Change filter arrays
      const newFilters: FilterOptions = {
        ...mockFilters,
        type: ['sofa', 'chair', 'table'] // Added new item
      };

      rerender({
        filters: newFilters,
        priceRange: mockPriceRange,
        sortOption: 'rating_desc',
        slug: 'sofas'
      });

      const secondCallback = result.current;

      // Should be different reference due to dependency change
      expect(firstCallback).not.toBe(secondCallback);
    });

    it('should return the same callback reference when filter arrays have same content but different order', () => {
      const filters1: FilterOptions = {
        type: ['sofa', 'chair'],
        material: ['leather', 'fabric'],
        priceMin: 1000,
        priceMax: 5000
      };

      const filters2: FilterOptions = {
        type: ['chair', 'sofa'], // Different order
        material: ['fabric', 'leather'], // Different order
        priceMin: 1000,
        priceMax: 5000
      };

      const { result, rerender } = renderHook(
        ({ filters, priceRange, sortOption, slug }) => 
          useUpdateUrl(filters, priceRange, sortOption, slug),
        {
          initialProps: {
            filters: filters1,
            priceRange: mockPriceRange,
            sortOption: 'rating_desc',
            slug: 'sofas'
          }
        }
      );

      const firstCallback = result.current;

      rerender({
        filters: filters2,
        priceRange: mockPriceRange,
        sortOption: 'rating_desc',
        slug: 'sofas'
      });

      const secondCallback = result.current;

      // Should be the same reference because content is the same
      expect(firstCallback).toBe(secondCallback);
    });

    it('should return a new callback reference when price range changes', () => {
      const { result, rerender } = renderHook(
        ({ filters, priceRange, sortOption, slug }) => 
          useUpdateUrl(filters, priceRange, sortOption, slug),
        {
          initialProps: {
            filters: mockFilters,
            priceRange: mockPriceRange,
            sortOption: 'rating_desc',
            slug: 'sofas'
          }
        }
      );

      const firstCallback = result.current;

      const newPriceRange: PriceRange = {
        min: 600, // Changed
        max: 10000
      };

      rerender({
        filters: mockFilters,
        priceRange: newPriceRange,
        sortOption: 'rating_desc',
        slug: 'sofas'
      });

      const secondCallback = result.current;

      // Should be different reference due to price range change
      expect(firstCallback).not.toBe(secondCallback);
    });

    it('should return a new callback reference when sort option changes', () => {
      const { result, rerender } = renderHook(
        ({ filters, priceRange, sortOption, slug }) => 
          useUpdateUrl(filters, priceRange, sortOption, slug),
        {
          initialProps: {
            filters: mockFilters,
            priceRange: mockPriceRange,
            sortOption: 'rating_desc',
            slug: 'sofas'
          }
        }
      );

      const firstCallback = result.current;

      rerender({
        filters: mockFilters,
        priceRange: mockPriceRange,
        sortOption: 'price_asc', // Changed
        slug: 'sofas'
      });

      const secondCallback = result.current;

      // Should be different reference due to sort option change
      expect(firstCallback).not.toBe(secondCallback);
    });

    it('should return a new callback reference when slug changes', () => {
      const { result, rerender } = renderHook(
        ({ filters, priceRange, sortOption, slug }) => 
          useUpdateUrl(filters, priceRange, sortOption, slug),
        {
          initialProps: {
            filters: mockFilters,
            priceRange: mockPriceRange,
            sortOption: 'rating_desc',
            slug: 'sofas'
          }
        }
      );

      const firstCallback = result.current;

      rerender({
        filters: mockFilters,
        priceRange: mockPriceRange,
        sortOption: 'rating_desc',
        slug: 'chairs' // Changed
      });

      const secondCallback = result.current;

      // Should be different reference due to slug change
      expect(firstCallback).not.toBe(secondCallback);
    });
  });

  describe('URL generation functionality', () => {
    it('should generate correct URL with all filters', () => {
      const { result } = renderHook(() => 
        useUpdateUrl(mockFilters, mockPriceRange, 'price_asc', 'sofas')
      );

      const updateUrl = result.current;
      updateUrl();

      expect(mockPushState).toHaveBeenCalledWith(
        { path: expect.stringContaining('/catalog?') },
        '',
        expect.stringContaining('/catalog?')
      );

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).toContain('category=sofas');
      expect(calledUrl).toContain('type=chair');
      expect(calledUrl).toContain('type=sofa');
      expect(calledUrl).toContain('material=fabric');
      expect(calledUrl).toContain('material=leather');
      expect(calledUrl).toContain('feature=shelves');
      expect(calledUrl).toContain('status=new');
      expect(calledUrl).toContain('size=double');
      expect(calledUrl).toContain('minPrice=1000');
      expect(calledUrl).toContain('maxPrice=5000');
      expect(calledUrl).toContain('sort=price_asc');
    });

    it('should handle null and empty filters correctly', () => {
      const emptyFilters: FilterOptions = {
        type: null,
        material: [],
        priceMin: 500, // Same as range min
        priceMax: 10000 // Same as range max
      };

      const { result } = renderHook(() => 
        useUpdateUrl(emptyFilters, mockPriceRange, 'rating_desc', null)
      );

      const updateUrl = result.current;
      updateUrl();

      expect(mockPushState).toHaveBeenCalledWith(
        { path: '/catalog?' },
        '',
        '/catalog?'
      );
    });

    it('should not include price filters when they match the full range', () => {
      const fullRangeFilters: FilterOptions = {
        type: ['sofa'],
        priceMin: 500, // Same as range min
        priceMax: 10000 // Same as range max
      };

      const { result } = renderHook(() => 
        useUpdateUrl(fullRangeFilters, mockPriceRange, 'rating_desc', 'sofas')
      );

      const updateUrl = result.current;
      updateUrl();

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).not.toContain('minPrice');
      expect(calledUrl).not.toContain('maxPrice');
    });

    it('should not include sort option when it is default', () => {
      const { result } = renderHook(() => 
        useUpdateUrl(mockFilters, mockPriceRange, 'rating_desc', 'sofas')
      );

      const updateUrl = result.current;
      updateUrl();

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).not.toContain('sort=rating_desc');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined filter arrays', () => {
      const filtersWithUndefined: FilterOptions = {
        type: undefined,
        material: undefined,
        priceMin: 1000,
        priceMax: 2000
      };

      const { result } = renderHook(() => 
        useUpdateUrl(filtersWithUndefined, mockPriceRange, 'rating_desc', 'sofas')
      );

      expect(() => result.current()).not.toThrow();
    });

    it('should handle zero price range', () => {
      const zeroPriceRange: PriceRange = { min: 0, max: 0 };
      const filtersWithPrice: FilterOptions = {
        priceMin: 100,
        priceMax: 200
      };

      const { result } = renderHook(() => 
        useUpdateUrl(filtersWithPrice, zeroPriceRange, 'rating_desc', 'sofas')
      );

      const updateUrl = result.current;
      updateUrl();

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).not.toContain('minPrice');
      expect(calledUrl).not.toContain('maxPrice');
    });
  });
});