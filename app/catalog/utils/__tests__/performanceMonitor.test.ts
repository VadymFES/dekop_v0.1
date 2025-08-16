// /app/catalog/utils/__tests__/performanceMonitor.test.ts

/**
 * Tests for performance monitoring utilities
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useRenderCounter, 
  useDependencyTracker, 
  FilterPerformanceMonitor,
  useRenderPerformance
} from '../performanceMonitor';

// Mock console methods and environment
const originalConsole = { ...console };
const originalEnv = process.env.NODE_ENV;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
  
  // Set to development mode for testing
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'development',
    configurable: true
  });
});

afterEach(() => {
  Object.assign(console, originalConsole);
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: originalEnv,
    configurable: true
  });
  jest.clearAllMocks();
});

describe('useRenderCounter', () => {
  it('should count renders correctly', () => {
    const { result, rerender } = renderHook(() => 
      useRenderCounter('TestComponent', true)
    );

    expect(result.current).toBe(1);

    rerender();
    expect(result.current).toBe(2);

    rerender();
    expect(result.current).toBe(3);
  });

  it('should not count renders when disabled', () => {
    const { result, rerender } = renderHook(() => 
      useRenderCounter('TestComponent', false)
    );

    expect(result.current).toBe(0);

    rerender();
    expect(result.current).toBe(0); // Should not increment when disabled
  });

  it('should log performance warning for excessive renders', () => {
    const { rerender } = renderHook(() => 
      useRenderCounter('TestComponent', true)
    );

    // Trigger 15 renders to exceed the warning threshold
    for (let i = 0; i < 14; i++) {
      rerender();
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Component TestComponent has rendered 15 times'),
      expect.any(Object)
    );
  });
});

describe('useDependencyTracker', () => {
  it('should track dependency changes', () => {
    let deps = { count: 1, name: 'test' };
    
    const { result, rerender } = renderHook(() => 
      useDependencyTracker(deps, 'TestHook', true)
    );

    expect(result.current).toEqual(deps);

    // Change dependencies
    deps = { count: 2, name: 'test' };
    rerender();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Dependencies changed in TestHook'),
      expect.any(Object)
    );
  });

  it('should warn about unstable dependencies', () => {
    let deps = { unstableObject: {} };
    
    const { rerender } = renderHook(() => 
      useDependencyTracker(deps, 'TestHook', true)
    );

    // Trigger many changes to simulate unstable dependencies
    for (let i = 0; i < 25; i++) {
      deps = { unstableObject: {} }; // New object reference each time
      rerender();
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Hook TestHook has unstable dependencies'),
      expect.any(Object)
    );
  });

  it('should not track when disabled', () => {
    let deps = { count: 1 };
    
    const { rerender } = renderHook(() => 
      useDependencyTracker(deps, 'TestHook', false)
    );

    deps = { count: 2 };
    rerender();

    expect(console.log).not.toHaveBeenCalled();
  });
});

describe('FilterPerformanceMonitor', () => {
  beforeEach(() => {
    // Clear any existing measurements
    FilterPerformanceMonitor.getPerformanceStats();
  });

  it('should measure operation duration', () => {
    const operationId = 'test-operation';
    const operationName = 'testOperation';

    // Mock performance.now to return predictable values
    const mockPerformanceNow = jest.spyOn(performance, 'now')
      .mockReturnValueOnce(0)   // Start measurement
      .mockReturnValueOnce(0)   // Start measurement log
      .mockReturnValueOnce(10); // End measurement

    FilterPerformanceMonitor.startMeasurement(operationId, operationName);
    const duration = FilterPerformanceMonitor.endMeasurement(operationId, operationName);
    
    expect(duration).toBe(10);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Started measuring: testOperation'),
      expect.any(Object)
    );
    
    mockPerformanceNow.mockRestore();
  });

  it('should log slow operations', () => {
    const operationId = 'slow-operation';
    const operationName = 'slowOperation';

    // Mock a slow operation
    const mockPerformanceNow = jest.spyOn(performance, 'now')
      .mockReturnValueOnce(0)   // Start measurement
      .mockReturnValueOnce(0)   // Start measurement log
      .mockReturnValueOnce(150); // End measurement (150ms duration)
    
    FilterPerformanceMonitor.startMeasurement(operationId, operationName);
    FilterPerformanceMonitor.endMeasurement(operationId, operationName);
    
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('slowOperation completed in 150.00ms'),
      expect.any(Object)
    );
    
    mockPerformanceNow.mockRestore();
  });

  it('should return performance statistics', () => {
    const stats = FilterPerformanceMonitor.getPerformanceStats();
    
    expect(stats).toHaveProperty('averageDuration');
    expect(stats).toHaveProperty('maxDuration');
    expect(stats).toHaveProperty('minDuration');
    expect(stats).toHaveProperty('totalOperations');
    expect(stats).toHaveProperty('recentOperations');
    expect(Array.isArray(stats.recentOperations)).toBe(true);
  });
});

describe('useRenderPerformance', () => {
  it('should measure render performance', () => {
    // Mock a slow render
    const mockPerformanceNow = jest.spyOn(performance, 'now')
      .mockReturnValueOnce(0)   // Start time
      .mockReturnValueOnce(20); // End time (20ms duration)

    const { rerender } = renderHook(() => 
      useRenderPerformance('TestComponent', true)
    );

    rerender();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Slow render detected in TestComponent: 20.00ms'),
      expect.any(Object)
    );
    
    mockPerformanceNow.mockRestore();
  });

  it('should not measure when disabled', () => {
    const { rerender } = renderHook(() => 
      useRenderPerformance('TestComponent', false)
    );

    rerender();

    expect(console.warn).not.toHaveBeenCalled();
  });
});

