// /app/catalog/components/__tests__/cleanup-error-handling.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DOMErrorBoundary } from '../DOMErrorBoundary';
import { ProductsDisplayFallback } from '../ProductsDisplayFallback';

// Mock the debug logger to avoid console output in tests
jest.mock('../../utils/debugLogger', () => ({
  DebugLogger: {
    domWarning: jest.fn(),
    domError: jest.fn(),
    hookWarning: jest.fn(),
    hookError: jest.fn(),
    cleanup: jest.fn(),
    performance: jest.fn(),
    debug: jest.fn(),
    errorBoundary: jest.fn(),
  },
  safeDOMAccess: jest.fn((operation, componentName, operationName, fallback) => {
    try {
      return operation();
    } catch (error) {
      return fallback;
    }
  }),
  safeEventListener: jest.fn((element, event, handler, options, componentName) => {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
  })
}));

// Component that throws a DOM error for testing
const ThrowingComponent: React.FC = () => {
  React.useEffect(() => {
    // Simulate a DOM error
    const element = document.getElementById('non-existent');
    element!.getBoundingClientRect(); // This will throw
  }, []);
  
  return <div>This should not render</div>;
};

// Component that uses cleanup properly
const CleanupComponent: React.FC = () => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Timer executed');
    }, 1000);
    
    // Proper cleanup
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  return <div>Component with cleanup</div>;
};

describe('Cleanup and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DOMErrorBoundary', () => {
    it('should catch DOM errors and display fallback UI', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <DOMErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </DOMErrorBoundary>
      );
      
      expect(screen.getByText(/Компонент тимчасово недоступний/)).toBeInTheDocument();
      expect(screen.getByText(/TestComponent/)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should provide retry functionality', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <DOMErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </DOMErrorBoundary>
      );
      
      const retryButton = screen.getByText('Спробувати знову');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      
      consoleSpy.mockRestore();
    });

    it('should render custom fallback when provided', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const customFallback = <div>Custom fallback UI</div>;
      
      render(
        <DOMErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </DOMErrorBoundary>
      );
      
      expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('ProductsDisplayFallback', () => {
    it('should render fallback UI with retry button', () => {
      const mockRetry = jest.fn();
      const mockError = new Error('Test error');
      
      render(
        <ProductsDisplayFallback 
          error={mockError} 
          onRetry={mockRetry} 
        />
      );
      
      expect(screen.getByText(/Не вдалося завантажити товари/)).toBeInTheDocument();
      
      const retryButton = screen.getByText('Спробувати знову');
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Use Object.defineProperty to mock NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true
      });
      
      const mockError = new Error('Test error message');
      
      render(
        <ProductsDisplayFallback error={mockError} />
      );
      
      expect(screen.getByText('Деталі помилки (розробка)')).toBeInTheDocument();
      
      // Restore original value
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup timers on unmount', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(<CleanupComponent />);
      
      unmount();
      
      // Wait a bit to ensure cleanup has run
      await waitFor(() => {
        expect(clearTimeoutSpy).toHaveBeenCalled();
      });
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle multiple nested error boundaries', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <DOMErrorBoundary componentName="Outer">
          <DOMErrorBoundary componentName="Inner">
            <ThrowingComponent />
          </DOMErrorBoundary>
        </DOMErrorBoundary>
      );
      
      // Should show the inner error boundary's fallback
      expect(screen.getByText(/Inner/)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});