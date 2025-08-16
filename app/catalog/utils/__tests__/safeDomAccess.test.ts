// /app/catalog/utils/__tests__/safeDomAccess.test.ts

import {
  safeGetBoundingRect,
  isElementMounted,
  safeGetElementDimensions,
  safeDomOperation,
  isHTMLElement,
  safeFocus,
  safeScrollIntoView
} from '../safeDomAccess';

// Mock DOM methods for testing
const mockGetBoundingClientRect = jest.fn();
const mockFocus = jest.fn();
const mockScrollIntoView = jest.fn();

describe('safeDomAccess utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('safeGetBoundingRect', () => {
    it('should return null for null element', () => {
      const result = safeGetBoundingRect(null);
      expect(result).toBeNull();
    });

    it('should return DOMRect for valid element', () => {
      const mockRect = { width: 100, height: 50, x: 0, y: 0, top: 0, left: 0, bottom: 50, right: 100 };
      mockGetBoundingClientRect.mockReturnValue(mockRect);

      const mockElement = {
        getBoundingClientRect: mockGetBoundingClientRect
      } as unknown as HTMLElement;

      const result = safeGetBoundingRect(mockElement);
      expect(result).toBe(mockRect);
      expect(mockGetBoundingClientRect).toHaveBeenCalled();
    });

    it('should return null for element with zero dimensions', () => {
      const mockRect = { width: 0, height: 0, x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0 };
      mockGetBoundingClientRect.mockReturnValue(mockRect);

      const mockElement = {
        getBoundingClientRect: mockGetBoundingClientRect
      } as unknown as HTMLElement;

      const result = safeGetBoundingRect(mockElement);
      expect(result).toBeNull();
    });

    it('should handle getBoundingClientRect errors', () => {
      mockGetBoundingClientRect.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const mockElement = {
        getBoundingClientRect: mockGetBoundingClientRect
      } as unknown as HTMLElement;

      const result = safeGetBoundingRect(mockElement);
      expect(result).toBeNull();
    });
  });

  describe('isElementMounted', () => {
    it('should return false for null element', () => {
      expect(isElementMounted(null)).toBe(false);
    });

    it('should return true for mounted element', () => {
      const mockElement = {
        isConnected: true
      } as HTMLElement;

      // Mock document.contains
      const originalContains = document.contains;
      document.contains = jest.fn().mockReturnValue(true);

      const result = isElementMounted(mockElement);
      expect(result).toBe(true);

      // Restore original method
      document.contains = originalContains;
    });

    it('should handle errors gracefully', () => {
      const mockElement = {
        get isConnected() {
          throw new Error('DOM error');
        }
      } as unknown as HTMLElement;

      const result = isElementMounted(mockElement);
      expect(result).toBe(false);
    });
  });

  describe('safeGetElementDimensions', () => {
    it('should return zero dimensions for null element', () => {
      const result = safeGetElementDimensions(null);
      expect(result).toEqual({ width: 0, height: 0 });
    });

    it('should return actual dimensions for valid element', () => {
      const mockRect = { width: 200, height: 100, x: 0, y: 0, top: 0, left: 0, bottom: 100, right: 200 };
      mockGetBoundingClientRect.mockReturnValue(mockRect);

      const mockElement = {
        getBoundingClientRect: mockGetBoundingClientRect
      } as unknown as HTMLElement;

      const result = safeGetElementDimensions(mockElement);
      expect(result).toEqual({ width: 200, height: 100 });
    });
  });

  describe('safeDomOperation', () => {
    it('should return operation result on success', () => {
      const operation = jest.fn().mockReturnValue('success');
      const result = safeDomOperation(operation, 'fallback');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should return fallback value on error', () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Operation failed');
      });
      const result = safeDomOperation(operation, 'fallback');

      expect(result).toBe('fallback');
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('isHTMLElement', () => {
    it('should return true for HTMLElement', () => {
      const div = document.createElement('div');
      expect(isHTMLElement(div)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isHTMLElement(null)).toBe(false);
    });
  });

  describe('safeFocus', () => {
    it('should return false for null element', () => {
      expect(safeFocus(null)).toBe(false);
    });

    it('should focus element and return true on success', () => {
      const mockElement = {
        focus: mockFocus,
        isConnected: true
      } as unknown as HTMLElement;

      // Mock document.contains
      const originalContains = document.contains;
      document.contains = jest.fn().mockReturnValue(true);

      const result = safeFocus(mockElement);
      expect(result).toBe(true);
      expect(mockFocus).toHaveBeenCalled();

      // Restore original method
      document.contains = originalContains;
    });
  });

  describe('safeScrollIntoView', () => {
    it('should return false for null element', () => {
      expect(safeScrollIntoView(null)).toBe(false);
    });

    it('should scroll element and return true on success', () => {
      const mockElement = {
        scrollIntoView: mockScrollIntoView,
        isConnected: true
      } as unknown as HTMLElement;

      // Mock document.contains
      const originalContains = document.contains;
      document.contains = jest.fn().mockReturnValue(true);

      const result = safeScrollIntoView(mockElement, { behavior: 'smooth' });
      expect(result).toBe(true);
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Restore original method
      document.contains = originalContains;
    });
  });
});