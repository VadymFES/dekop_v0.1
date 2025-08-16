// /app/catalog/utils/safeDomAccess.ts

/**
 * Safe DOM access utilities for preventing null reference errors
 */

/**
 * Safely gets the bounding rectangle of a DOM element
 * Returns null if element is null or getBoundingClientRect fails
 */
export const safeGetBoundingRect = (element: HTMLElement | null): DOMRect | null => {
  if (!element) {
    console.warn('Element is null, cannot get bounding rect');
    return null;
  }
  
  try {
    const rect = element.getBoundingClientRect();
    
    // Validate rect has meaningful dimensions
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Element has zero dimensions:', rect);
      return null;
    }
    
    return rect;
  } catch (error) {
    console.error('Failed to get bounding rect:', error);
    return null;
  }
};

/**
 * Safely checks if an element exists and is mounted in the DOM
 */
export const isElementMounted = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  
  try {
    // Check if element is connected to the document
    return element.isConnected && document.contains(element);
  } catch (error) {
    console.error('Failed to check element mount status:', error);
    return false;
  }
};

/**
 * Safely gets element dimensions with fallback values
 */
export const safeGetElementDimensions = (
  element: HTMLElement | null
): { width: number; height: number } => {
  const rect = safeGetBoundingRect(element);
  
  if (!rect) {
    return { width: 0, height: 0 };
  }
  
  return {
    width: rect.width,
    height: rect.height
  };
};

/**
 * Safely executes a DOM operation with error handling
 */
export const safeDomOperation = <T>(
  operation: () => T,
  fallbackValue: T,
  errorMessage?: string
): T => {
  try {
    return operation();
  } catch (error) {
    console.error(errorMessage || 'DOM operation failed:', error);
    return fallbackValue;
  }
};

/**
 * Safely gets computed styles for an element
 */
export const safeGetComputedStyle = (
  element: HTMLElement | null,
  property?: string
): CSSStyleDeclaration | string | null => {
  if (!element || !isElementMounted(element)) {
    return null;
  }
  
  try {
    const computedStyle = window.getComputedStyle(element);
    return property ? computedStyle.getPropertyValue(property) : computedStyle;
  } catch (error) {
    console.error('Failed to get computed style:', error);
    return null;
  }
};

/**
 * Safely adds event listener with automatic cleanup
 */
export const safeAddEventListener = (
  element: HTMLElement | Document | Window | null,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): (() => void) | null => {
  if (!element) {
    console.warn('Cannot add event listener to null element');
    return null;
  }
  
  try {
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        console.error('Failed to remove event listener:', error);
      }
    };
  } catch (error) {
    console.error('Failed to add event listener:', error);
    return null;
  }
};

/**
 * Safely queries for a DOM element with optional parent scope
 */
export const safeQuerySelector = <T extends Element = Element>(
  selector: string,
  parent?: Document | Element | null
): T | null => {
  const context = parent || document;
  
  if (!context) {
    console.warn('Query context is null');
    return null;
  }
  
  try {
    return context.querySelector<T>(selector);
  } catch (error) {
    console.error('Failed to query selector:', selector, error);
    return null;
  }
};

/**
 * Safely queries for multiple DOM elements
 */
export const safeQuerySelectorAll = <T extends Element = Element>(
  selector: string,
  parent?: Document | Element | null
): NodeListOf<T> | null => {
  const context = parent || document;
  
  if (!context) {
    console.warn('Query context is null');
    return null;
  }
  
  try {
    return context.querySelectorAll<T>(selector);
  } catch (error) {
    console.error('Failed to query selector all:', selector, error);
    return null;
  }
};

/**
 * Type guard to check if an element is an HTMLElement
 */
export const isHTMLElement = (element: Element | null): element is HTMLElement => {
  return element instanceof HTMLElement;
};

/**
 * Safely focuses an element with error handling
 */
export const safeFocus = (element: HTMLElement | null): boolean => {
  if (!element || !isElementMounted(element)) {
    return false;
  }
  
  try {
    element.focus();
    return true;
  } catch (error) {
    console.error('Failed to focus element:', error);
    return false;
  }
};

/**
 * Safely scrolls an element into view
 */
export const safeScrollIntoView = (
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions
): boolean => {
  if (!element || !isElementMounted(element)) {
    return false;
  }
  
  try {
    element.scrollIntoView(options);
    return true;
  } catch (error) {
    console.error('Failed to scroll element into view:', error);
    return false;
  }
};