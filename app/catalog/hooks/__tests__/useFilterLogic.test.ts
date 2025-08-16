// /app/catalog/hooks/__tests__/useFilterLogic.test.ts

import { renderHook } from '@testing-library/react';
import { useFilterLogic } from '../useFilterLogic';
import { ProductWithImages, PriceRange } from '@/app/lib/definitions';
import { FilterOptions } from '../../types';

// Mock the utility functions
jest.mock('../../utils', () => ({
  getMaterialValue: jest.fn(() => 'wood'),
  getAdditionalFeatures: jest.fn(() => 'feature1'),
  isSofaSpecs: jest.fn(() => true),
}));

describe('useFilterLogic', () => {
  const mockProducts: ProductWithImages[] = [
    {
      id: 1,
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test product description',
      category: 'Диван',
      price: 1000,
      stock: 10,
      rating: 4.5,
      reviews: 10,
      is_new: true,
      is_on_sale: false,
      is_bestseller: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      specs: {
        id: 1,
        product_id: 1,
        category: 'sofas' as const,
        construction: 'test construction',
        material: { type: 'fabric' },
        types: ['sofa'],
        dimensions: {
          length: 2200,
          depth: 900,
          height: 800,
          sleeping_area: { width: 1200, length: 2000 }
        },
        has_shelves: true,
        leg_height: 'high',
        has_lift_mechanism: true
      },
      images: [],
      colors: []
    }
  ];

  const mockFilters: FilterOptions = {
    type: ['sofa'],
    material: ['wood'],
    complectation: ['shelves'],
    status: ['new'],
    size: 'double',
    priceMin: 500,
    priceMax: 1500
  };

  const mockPriceRange: PriceRange = {
    min: 0,
    max: 2000
  };

  const mockDispatch = jest.fn();
  const mockUpdateURL = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not cause infinite re-renders with stable dependencies', () => {
    let renderCount = 0;
    
    const { rerender } = renderHook(() => {
      renderCount++;
      useFilterLogic(
        mockProducts,
        mockFilters,
        mockPriceRange,
        'rating_desc',
        mockUpdateURL,
        mockDispatch
      );
    });

    // Initial render
    expect(renderCount).toBe(1);

    // Rerender with same props - should not cause additional effect runs
    rerender();
    expect(renderCount).toBe(2);

    // Wait for debounce timeout
    return new Promise(resolve => {
      setTimeout(() => {
        // Should have called dispatch for filtering
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_IS_FILTERING', payload: true });
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'APPLY_FILTER_RESULTS',
          payload: {
            filteredProducts: expect.any(Array),
            isFiltering: false
          }
        });
        
        // Should have called updateURL
        expect(mockUpdateURL).toHaveBeenCalled();
        
        resolve(undefined);
      }, 350); // Wait for debounce + a bit extra
    });
  });

  it('should not execute effect when products array is empty', () => {
    renderHook(() => {
      useFilterLogic(
        [], // Empty products array
        mockFilters,
        mockPriceRange,
        'rating_desc',
        mockUpdateURL,
        mockDispatch
      );
    });

    // Should not dispatch any actions for empty products
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockUpdateURL).not.toHaveBeenCalled();
  });

  it('should not execute effect when price range max is 0', () => {
    renderHook(() => {
      useFilterLogic(
        mockProducts,
        mockFilters,
        { min: 0, max: 0 }, // Invalid price range
        'rating_desc',
        mockUpdateURL,
        mockDispatch
      );
    });

    // Should not dispatch any actions for invalid price range
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockUpdateURL).not.toHaveBeenCalled();
  });

  it('should properly cleanup timeout on unmount', () => {
    const dispatchSpy = jest.fn();
    const updateURLSpy = jest.fn();
    
    const { unmount } = renderHook(() => {
      useFilterLogic(
        mockProducts,
        mockFilters,
        mockPriceRange,
        'rating_desc',
        updateURLSpy,
        dispatchSpy
      );
    });

    // Unmount immediately after render but before timeout completes
    setTimeout(() => {
      unmount();
    }, 100);

    // Wait for what would have been the timeout
    return new Promise(resolve => {
      setTimeout(() => {
        // The effect should have started (SET_IS_FILTERING called)
        expect(dispatchSpy).toHaveBeenCalledWith({ type: 'SET_IS_FILTERING', payload: true });
        
        // But the final results should not be dispatched due to mount check
        expect(dispatchSpy).not.toHaveBeenCalledWith({
          type: 'APPLY_FILTER_RESULTS',
          payload: expect.any(Object)
        });
        
        // updateURL should not have been called
        expect(updateURLSpy).not.toHaveBeenCalled();
        resolve(undefined);
      }, 400);
    });
  });

  it('should use stable dependencies and not re-run effect unnecessarily', () => {
    let effectRunCount = 0;
    const originalDispatch = mockDispatch;
    const trackingDispatch = jest.fn((...args) => {
      if (args[0]?.type === 'SET_IS_FILTERING') {
        effectRunCount++;
      }
      return originalDispatch(...args);
    });

    const { rerender } = renderHook(
      ({ filters }) => {
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          mockUpdateURL,
          trackingDispatch
        );
      },
      {
        initialProps: { filters: mockFilters }
      }
    );

    // Wait for initial effect
    return new Promise(resolve => {
      setTimeout(() => {
        const initialEffectCount = effectRunCount;
        expect(initialEffectCount).toBe(1);

        // Rerender with same filter values but different object reference
        const sameFilters = {
          type: ['sofa'],
          material: ['wood'],
          complectation: ['shelves'],
          status: ['new'],
          size: 'double',
          priceMin: 500,
          priceMax: 1500
        };

        rerender({ filters: sameFilters });

        // Wait a bit more to ensure no additional effects run
        setTimeout(() => {
          // Should not have triggered additional effects due to stable dependencies
          expect(effectRunCount).toBe(initialEffectCount);
          resolve(undefined);
        }, 350);
      }, 350);
    });
  });

  it('should handle rapid filter changes without infinite loops', () => {
    let effectRunCount = 0;
    const trackingDispatch = jest.fn((...args) => {
      if (args[0]?.type === 'SET_IS_FILTERING') {
        effectRunCount++;
      }
      return mockDispatch(...args);
    });

    const { rerender } = renderHook(
      ({ filters, sortOption }) => {
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          sortOption,
          mockUpdateURL,
          trackingDispatch
        );
      },
      {
        initialProps: { 
          filters: mockFilters,
          sortOption: 'rating_desc'
        }
      }
    );

    // Make rapid changes
    const changes = [
      { filters: { ...mockFilters, type: ['chair'] }, sortOption: 'price_asc' },
      { filters: { ...mockFilters, material: ['fabric'] }, sortOption: 'price_desc' },
      { filters: { ...mockFilters, priceMin: 800 }, sortOption: 'reviews_desc' },
    ];

    changes.forEach((change, index) => {
      setTimeout(() => {
        rerender(change);
      }, index * 50); // Rapid changes
    });

    return new Promise(resolve => {
      setTimeout(() => {
        // Should have reasonable number of effect runs, not infinite
        expect(effectRunCount).toBeLessThan(10);
        expect(effectRunCount).toBeGreaterThan(0);
        resolve(undefined);
      }, 1000);
    });
  });

  it('should prevent effect execution with unstable updateURL callback', () => {
    let effectRunCount = 0;
    const trackingDispatch = jest.fn((...args) => {
      if (args[0]?.type === 'SET_IS_FILTERING') {
        effectRunCount++;
      }
      return mockDispatch(...args);
    });

    // Create an unstable updateURL that changes on every render
    const { rerender } = renderHook(
      ({ renderCount }) => {
        const unstableUpdateURL = () => {
          // This function reference changes on every render
          console.log(`Render ${renderCount}`);
        };
        
        useFilterLogic(
          mockProducts,
          mockFilters,
          mockPriceRange,
          'rating_desc',
          unstableUpdateURL,
          trackingDispatch
        );
      },
      {
        initialProps: { renderCount: 1 }
      }
    );

    // Wait for initial effect
    return new Promise(resolve => {
      setTimeout(() => {
        const initialEffectCount = effectRunCount;
        expect(initialEffectCount).toBe(1);

        // Rerender multiple times with unstable callback
        for (let i = 2; i <= 5; i++) {
          rerender({ renderCount: i });
        }

        // Wait and check that effects didn't run excessively
        setTimeout(() => {
          // The hook should use ref to store updateURL, preventing infinite loops
          expect(effectRunCount).toBe(initialEffectCount);
          resolve(undefined);
        }, 400);
      }, 350);
    });
  });

  it('should handle complex filter object changes correctly', () => {
    let effectRunCount = 0;
    const trackingDispatch = jest.fn((...args) => {
      if (args[0]?.type === 'SET_IS_FILTERING') {
        effectRunCount++;
      }
      return mockDispatch(...args);
    });

    const { rerender } = renderHook(
      ({ filters }) => {
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          mockUpdateURL,
          trackingDispatch
        );
      },
      {
        initialProps: { filters: mockFilters }
      }
    );

    return new Promise(resolve => {
      setTimeout(() => {
        const initialEffectCount = effectRunCount;
        expect(initialEffectCount).toBe(1);

        // Test with exactly the same filter content (should not trigger new effect)
        const sameFilters = {
          type: ['sofa'], // Same content as mockFilters
          material: ['wood'], // Same content as mockFilters
          complectation: ['shelves'],
          status: ['new'],
          size: 'double',
          priceMin: 500,
          priceMax: 1500
        };

        rerender({ filters: sameFilters });

        setTimeout(() => {
          // Should not trigger new effect due to same content
          expect(effectRunCount).toBe(initialEffectCount);

          // Now make actual content change
          const changedFilters = {
            ...mockFilters,
            type: ['table'] // Actually different content
          };

          rerender({ filters: changedFilters });

          setTimeout(() => {
            // Should trigger new effect due to actual change
            expect(effectRunCount).toBe(initialEffectCount + 1);
            resolve(undefined);
          }, 350);
        }, 350);
      }, 350);
    });
  }, 10000); // Increase timeout
});