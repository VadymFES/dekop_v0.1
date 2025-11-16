// /app/catalog/components/__tests__/FilterFlowIntegration.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { useFilterLogic } from '../../hooks/useFilterLogic';
import { useUpdateUrl } from '../../hooks/useUpdateUrl';
import { ProductWithImages, PriceRange } from '@/app/lib/definitions';
import { FilterOptions } from '../../types';

// Mock window.history for URL tests
const mockPushState = jest.fn();
Object.defineProperty(window, 'history', {
  value: { pushState: mockPushState },
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: { pathname: '/catalog' },
  writable: true,
});

describe('Complete Filter Flow Integration Tests', () => {
  const mockProducts: ProductWithImages[] = [
    {
      id: 1,
      name: 'Leather Sofa',
      slug: 'leather-sofa',
      description: 'Test sofa description',
      category: 'Диван',
      price: 2500,
      stock: 10,
      rating: 4.5,
      reviews: 25,
      is_new: true,
      is_on_sale: false,
      is_bestseller: true,
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
          sleeping_area: { width: 1400, length: 2000 }
        },
        has_shelves: true,
        leg_height: 'high',
        has_lift_mechanism: false
      },
      images: [],
      colors: []
    },
    {
      id: 2,
      name: 'Fabric Chair',
      slug: 'fabric-chair',
      description: 'Test chair description',
      category: 'Стілець',
      price: 800,
      stock: 5,
      rating: 4.2,
      reviews: 15,
      is_new: false,
      is_on_sale: true,
      is_bestseller: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      specs: {
        id: 2,
        product_id: 2,
        category: 'chairs' as const,
        upholstery: 'fabric',
        material: 'wood',
        dimensions: {
          length: 1800,
          depth: 800,
          height: 750,
          width: 600
        },
        types: ['chair']
      },
      images: [],
      colors: []
    },
    {
      id: 3,
      name: 'Premium Table',
      slug: 'premium-table',
      description: 'Test table description',
      category: 'Стіл',
      price: 1200,
      stock: 8,
      rating: 4.8,
      reviews: 40,
      is_new: true,
      is_on_sale: false,
      is_bestseller: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      specs: {
        id: 3,
        product_id: 3,
        category: 'tables' as const,
        material: 'wood',
        dimensions: {
          length: 1600,
          width: 800,
          depth: 900,
          height: 750
        },
        types: ['table']
      },
      images: [],
      colors: []
    }
  ];

  const mockPriceRange: PriceRange = {
    min: 500,
    max: 3000
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Integration Without Infinite Loops', () => {
    it('should integrate useUpdateUrl and useFilterLogic without causing infinite re-renders', async () => {
      let filterLogicRenderCount = 0;
      let updateUrlRenderCount = 0;
      let effectExecutionCount = 0;

      const mockDispatch = jest.fn((action) => {
        if (action.type === 'SET_IS_FILTERING') {
          effectExecutionCount++;
        }
      });

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        updateUrlRenderCount++;
        
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        filterLogicRenderCount++;
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      const initialFilters: FilterOptions = {
        type: ['sofa'],
        material: ['leather'],
        priceMin: 1000,
        priceMax: 2000
      };

      const { rerender } = render(<TestComponent filters={initialFilters} />);

      // Wait for initial effects to complete
      await waitFor(() => {
        expect(effectExecutionCount).toBe(1);
      }, { timeout: 1000 });

      const initialFilterRenderCount = filterLogicRenderCount;
      const initialUrlRenderCount = updateUrlRenderCount;

      // Rerender with same filter values (different object reference)
      const sameFilters: FilterOptions = {
        type: ['sofa'],
        material: ['leather'],
        priceMin: 1000,
        priceMax: 2000
      };

      rerender(<TestComponent filters={sameFilters} />);

      // Wait a bit to ensure no additional effects run
      await new Promise(resolve => setTimeout(resolve, 400));

      // Should not have caused excessive re-renders or effect executions
      expect(filterLogicRenderCount).toBeLessThan(initialFilterRenderCount + 5);
      expect(updateUrlRenderCount).toBeLessThan(initialUrlRenderCount + 5);
      expect(effectExecutionCount).toBe(1); // Should still be just the initial effect
    });

    it('should handle filter changes and URL updates in correct sequence', async () => {
      const mockDispatch = jest.fn();
      const urlUpdateCalls: string[] = [];

      // Mock pushState to track URL updates
      mockPushState.mockImplementation((state, title, url) => {
        urlUpdateCalls.push(url);
      });

      const TestComponent: React.FC<{ filters: FilterOptions; sortOption: string }> = ({ 
        filters, 
        sortOption 
      }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, sortOption, 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          sortOption,
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      const initialFilters: FilterOptions = {
        type: ['sofa'],
        priceMin: 1000,
        priceMax: 2500
      };

      const { rerender } = render(
        <TestComponent filters={initialFilters} sortOption="rating_desc" />
      );

      // Wait for initial processing
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_IS_FILTERING', payload: true });
      }, { timeout: 1000 });

      // Change filters
      const newFilters: FilterOptions = {
        type: ['chair'],
        priceMin: 500,
        priceMax: 1500
      };

      rerender(<TestComponent filters={newFilters} sortOption="price_asc" />);

      // Wait for processing to complete
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'APPLY_FILTER_RESULTS',
          payload: expect.objectContaining({
            filteredProducts: expect.any(Array),
            isFiltering: false
          })
        });
      }, { timeout: 1000 });

      // Should have updated URL
      expect(urlUpdateCalls.length).toBeGreaterThan(0);
      expect(urlUpdateCalls[urlUpdateCalls.length - 1]).toContain('type=chair');
      expect(urlUpdateCalls[urlUpdateCalls.length - 1]).toContain('sort=price_asc');
    });

    it('should handle rapid filter changes without breaking', async () => {
      const mockDispatch = jest.fn();
      let finalResults: any = null;

      mockDispatch.mockImplementation((action) => {
        if (action.type === 'APPLY_FILTER_RESULTS') {
          finalResults = action.payload;
        }
      });

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      const { rerender } = render(
        <TestComponent filters={{ type: ['sofa'], priceMin: 0, priceMax: 10000 }} />
      );

      // Make rapid changes
      const filterSequence = [
        { type: ['chair'], priceMin: 0, priceMax: 10000 },
        { type: ['table'], priceMin: 0, priceMax: 10000 },
        { type: ['sofa'], priceMin: 1000, priceMax: 10000 },
        { type: ['chair'], priceMin: 0, priceMax: 2000 },
        { type: ['table'], priceMin: 800, priceMax: 1500 }
      ];

      filterSequence.forEach((filters, index) => {
        setTimeout(() => {
          rerender(<TestComponent filters={filters} />);
        }, index * 50);
      });

      // Wait for all changes to settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have final results without crashing
      expect(finalResults).toBeTruthy();
      expect(finalResults.filteredProducts).toBeInstanceOf(Array);
      expect(finalResults.isFiltering).toBe(false);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle component lifecycle without crashing', async () => {
      const mockDispatch = jest.fn();

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      // Should render without crashing
      expect(() => {
        render(<TestComponent filters={{ type: ['sofa'], priceMin: 0, priceMax: 10000 }} />);
      }).not.toThrow();

      // Component should be functional
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should handle URL update operations', async () => {
      const mockDispatch = jest.fn();
      
      // Reset pushState mock to normal behavior
      mockPushState.mockImplementation(() => {});

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      // Should render without crashing
      render(<TestComponent filters={{ type: ['sofa'], priceMin: 0, priceMax: 10000 }} />);

      // Wait for processing
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'APPLY_FILTER_RESULTS',
          payload: expect.any(Object)
        });
      }, { timeout: 1000 });

      // Component should still be functional
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should properly cleanup on unmount', async () => {
      const mockDispatch = jest.fn();
      let timeoutCleared = false;

      // Mock setTimeout and clearTimeout to track cleanup
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      
      global.clearTimeout = jest.fn((id) => {
        timeoutCleared = true;
        return originalClearTimeout(id);
      });

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      const { unmount } = render(<TestComponent filters={{ type: ['sofa'], priceMin: 0, priceMax: 10000 }} />);

      // Unmount before timeout completes
      setTimeout(() => {
        unmount();
      }, 100);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have cleared timeout
      expect(timeoutCleared).toBe(true);

      // Restore original functions
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    });

    it('should not execute effects after unmount', async () => {
      const mockDispatch = jest.fn();
      let effectsAfterUnmount = 0;

      const trackingDispatch = jest.fn((action) => {
        if (action.type === 'APPLY_FILTER_RESULTS') {
          effectsAfterUnmount++;
        }
        return mockDispatch(action);
      });

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          trackingDispatch
        );

        return <div>Test Component</div>;
      };

      const { unmount } = render(<TestComponent filters={{ type: ['sofa'], priceMin: 0, priceMax: 10000 }} />);

      // Unmount quickly
      setTimeout(() => {
        unmount();
      }, 50);

      // Wait longer than the debounce timeout
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should not have executed effects after unmount
      expect(effectsAfterUnmount).toBe(0);
    });
  });

  describe('Complex Filter Scenarios', () => {
    beforeEach(() => {
      // Reset pushState mock to normal behavior for these tests
      mockPushState.mockImplementation(() => {});
    });

    it('should handle complex multi-filter scenarios correctly', async () => {
      const mockDispatch = jest.fn();
      let finalFilteredProducts: ProductWithImages[] = [];

      mockDispatch.mockImplementation((action) => {
        if (action.type === 'APPLY_FILTER_RESULTS') {
          finalFilteredProducts = action.payload.filteredProducts;
        }
      });

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      // Complex filter combining multiple criteria
      const complexFilters: FilterOptions = {
        type: ['sofa', 'table'],
        status: ['new', 'bestseller'],
        priceMin: 1000,
        priceMax: 3000
      };

      render(<TestComponent filters={complexFilters} />);

      // Wait for processing
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'APPLY_FILTER_RESULTS',
          payload: expect.any(Object)
        });
      }, { timeout: 1000 });

      // Should have filtered correctly
      expect(finalFilteredProducts).toBeInstanceOf(Array);
      
      // All results should match the criteria
      finalFilteredProducts.forEach(product => {
        expect(['sofa', 'table']).toContain(product.specs?.types?.[0]);
        expect(product.is_new || product.is_bestseller).toBe(true);
        expect(product.price).toBeGreaterThanOrEqual(1000);
        expect(product.price).toBeLessThanOrEqual(3000);
      });
    });

    it('should handle empty filter results gracefully', async () => {
      const mockDispatch = jest.fn();
      let finalFilteredProducts: ProductWithImages[] = [];

      mockDispatch.mockImplementation((action) => {
        if (action.type === 'APPLY_FILTER_RESULTS') {
          finalFilteredProducts = action.payload.filteredProducts;
        }
      });

      const TestComponent: React.FC<{ filters: FilterOptions }> = ({ filters }) => {
        const updateURL = useUpdateUrl(filters, mockPriceRange, 'rating_desc', 'sofas');
        
        useFilterLogic(
          mockProducts,
          filters,
          mockPriceRange,
          'rating_desc',
          updateURL,
          mockDispatch
        );

        return <div>Test Component</div>;
      };

      // Filters that should return no results
      const noResultsFilters: FilterOptions = {
        type: ['nonexistent'],
        priceMin: 5000,
        priceMax: 10000
      };

      render(<TestComponent filters={noResultsFilters} />);

      // Wait for processing
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'APPLY_FILTER_RESULTS',
          payload: expect.any(Object)
        });
      }, { timeout: 1000 });

      // Should handle empty results gracefully
      expect(finalFilteredProducts).toEqual([]);
    });
  });
});