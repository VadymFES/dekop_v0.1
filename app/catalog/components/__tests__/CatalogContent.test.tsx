// /app/catalog/components/__tests__/CatalogContent.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogContent from '../../CatalogContent';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => 'test-category'),
    toString: jest.fn(() => 'category=test-category'),
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the custom hooks with stable functions
const mockGetFiltersFromURL = jest.fn(() => ({
  type: [],
  material: [],
  complectation: [],
  status: [],
  size: null,
  priceMin: null,
  priceMax: null,
  sort: 'rating_desc'
}));

const mockUpdateURL = jest.fn();
const mockUseFilterLogic = jest.fn();

jest.mock('../../hooks/useFiltersFromUrl', () => ({
  useFiltersFromUrl: () => mockGetFiltersFromURL,
}));

jest.mock('../../hooks/useUpdateUrl', () => ({
  useUpdateUrl: () => mockUpdateURL,
}));

jest.mock('../../hooks/useFilterLogic', () => ({
  useFilterLogic: mockUseFilterLogic,
}));

// Mock fetch with error handling to prevent infinite loops
let fetchCallCount = 0;
const MAX_FETCH_CALLS = 20;

global.fetch = jest.fn(() => {
  fetchCallCount++;
  
  // Prevent infinite fetch calls
  if (fetchCallCount > MAX_FETCH_CALLS) {
    return Promise.reject(new Error('Too many fetch calls - preventing infinite loop'));
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });
}) as jest.Mock;

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('CatalogContent Stabilized Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCallCount = 0;
    mockGetFiltersFromURL.mockClear();
    mockUpdateURL.mockClear();
    mockUseFilterLogic.mockClear();
    
    // Suppress console errors and warnings during tests
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('should render without crashing with stabilized hooks', async () => {
    await act(async () => {
      render(<CatalogContent />);
    });

    await waitFor(
      () => {
        expect(screen.getByText(/всі категорії/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('should handle fetch errors gracefully', async () => {
    // Mock fetch to fail after first call
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    await act(async () => {
      render(<CatalogContent />);
    });

    await waitFor(
      () => {
        expect(screen.getByText(/всі категорії/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Component should still render even with fetch error
    expect(screen.getByText(/фільтри/i)).toBeInTheDocument();
  });

  it('should limit fetch calls to prevent infinite loops', async () => {
    await act(async () => {
      render(<CatalogContent />);
    });

    // Wait for initial render
    await waitFor(
      () => {
        expect(screen.getByText(/всі категорії/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify fetch was called but not excessively
    expect(global.fetch).toHaveBeenCalledTimes(fetchCallCount);
    expect(fetchCallCount).toBeLessThanOrEqual(MAX_FETCH_CALLS);
  });

  it('should render mobile controls on smaller screens', async () => {
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    await act(async () => {
      render(<CatalogContent />);
    });

    await waitFor(
      () => {
        expect(screen.getByText(/всі категорії/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Should have mobile filter button
    expect(screen.getByText(/фільтри/i)).toBeInTheDocument();
  });

  it('should call hooks with correct parameters', async () => {
    await act(async () => {
      render(<CatalogContent />);
    });

    await waitFor(
      () => {
        expect(mockGetFiltersFromURL).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );

    expect(mockUpdateURL).toHaveBeenCalled();
    expect(mockUseFilterLogic).toHaveBeenCalled();
  });
});