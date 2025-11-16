// /app/catalog/utils/__tests__/hookPerformanceTracker.test.ts

/**
 * Tests for hook-specific performance tracking utilities
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useTrackedEffect,
  useStabilityChecker,
  useTrackedMemo,
  useFilterOperationTracker,
  useLifecycleTracker
} from '../hookPerformanceTracker';

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  jest.clearAllMocks();
});

describe('useTrackedEffect', () => {
  it('should track effect executions', () => {
    const effectCallback = jest.fn();
    const deps = [1, 'test'];

    renderHook(() => 
      useTrackedEffect(effectCallback, deps, 'TestHook', true)
    );

    expect(effectCallback).toHaveBeenCalledTimes(1);
  });

  it('should log dependency changes', () => {
    const effectCallback = jest.fn();
    let deps = [1, 'test'];

    const { rerender } = renderHook(() => 
      useTrackedEffect(effectCallback, deps, 'TestHook', true)
    );

    // Change dependencies
    deps = [2, 'test'];
    rerender();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('useEffect in TestHook triggered by dependency changes'),
      expect.any(Object)
    );
  });

  it('should warn about frequent executions', () => {
    const effectCallback = jest.fn();
    let counter = 0;

    const { rerender } = renderHook(() => 
      useTrackedEffect(effectCallback, [counter], 'TestHook', true)
    );

    // Trigger many effect executions
    for (let i = 0; i < 55; i++) {
      counter = i;
      rerender();
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('useEffect in TestHook has executed'),
      expect.any(Object)
    );
  });

  it('should log slow effects', () => {
    const slowEffect = jest.fn(() => {
      // Mock slow effect by manipulating performance.now
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)   // Start time
        .mockReturnValueOnce(15); // End time (15ms duration)
    });

    renderHook(() => 
      useTrackedEffect(slowEffect, [], 'TestHook', true)
    );

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Slow useEffect in TestHook'),
      expect.any(Object)
    );
  });

  it('should not track when disabled', () => {
    const effectCallback = jest.fn();
    const deps = [1, 'test'];

    renderHook(() => 
      useTrackedEffect(effectCallback, deps, 'TestHook', false)
    );

    expect(console.log).not.toHaveBeenCalled();
  });
});

describe('useStabilityChecker', () => {
  it('should detect unstable object dependencies', () => {
    let value = { count: 1 };

    const { rerender } = renderHook(() => 
      useStabilityChecker(value, 'testValue', 'TestComponent', true)
    );

    // Change to new object references multiple times
    for (let i = 0; i < 10; i++) {
      value = { count: i };
      rerender();
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Potentially unstable dependency "testValue" in TestComponent'),
      expect.any(Object)
    );
  });

  it('should not warn for primitive values', () => {
    let value = 1;

    const { rerender } = renderHook(() => 
      useStabilityChecker(value, 'testValue', 'TestComponent', true)
    );

    // Change primitive value multiple times
    for (let i = 0; i < 10; i++) {
      value = i;
      rerender();
    }

    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should return the value unchanged', () => {
    const testValue = { count: 1 };

    const { result } = renderHook(() => 
      useStabilityChecker(testValue, 'testValue', 'TestComponent', true)
    );

    expect(result.current).toBe(testValue);
  });

  it('should not track when disabled', () => {
    let value = { count: 1 };

    const { rerender } = renderHook(() => 
      useStabilityChecker(value, 'testValue', 'TestComponent', false)
    );

    // Change to new object references
    for (let i = 0; i < 10; i++) {
      value = { count: i };
      rerender();
    }

    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('useTrackedMemo', () => {
  it('should track memo computations', () => {
    const factory = jest.fn(() => ({ computed: true }));
    const deps = [1];

    const { result } = renderHook(() => 
      useTrackedMemo(factory, deps, 'TestMemo', true)
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ computed: true });
  });

  it('should log expensive computations', () => {
    const expensiveFactory = jest.fn(() => {
      // Mock expensive computation
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)   // Start time
        .mockReturnValueOnce(10); // End time (10ms duration)
      return { computed: true };
    });

    renderHook(() => 
      useTrackedMemo(expensiveFactory, [1], 'TestMemo', true)
    );

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Expensive useMemo computation in TestMemo'),
      expect.any(Object)
    );
  });

  it('should warn about frequent recomputations', () => {
    const factory = jest.fn(() => ({ computed: true }));
    let counter = 0;

    const { rerender } = renderHook(() => 
      useTrackedMemo(factory, [counter], 'TestMemo', true)
    );

    // Trigger many recomputations
    for (let i = 0; i < 25; i++) {
      counter = i;
      rerender();
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('useMemo in TestMemo has recomputed'),
      expect.any(Object)
    );
  });

  it('should not track when disabled', () => {
    const factory = jest.fn(() => ({ computed: true }));

    renderHook(() => 
      useTrackedMemo(factory, [1], 'TestMemo', false)
    );

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe('useFilterOperationTracker', () => {
  it('should measure operation performance', () => {
    const { result } = renderHook(() => 
      useFilterOperationTracker('testOperation')
    );

    const operation = jest.fn(() => 'result');
    const operationResult = result.current.measureOperation(operation);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(operationResult).toBe('result');
  });

  it('should log slow operations', () => {
    const { result } = renderHook(() => 
      useFilterOperationTracker('testOperation')
    );

    const slowOperation = jest.fn(() => {
      // Mock slow operation
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)   // Start time
        .mockReturnValueOnce(100); // End time (100ms duration)
      return 'result';
    });

    result.current.measureOperation(slowOperation);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Slow filter operation "testOperation"'),
      expect.any(Object)
    );
  });

  it('should handle operation errors', () => {
    const { result } = renderHook(() => 
      useFilterOperationTracker('testOperation')
    );

    const failingOperation = jest.fn(() => {
      throw new Error('Operation failed');
    });

    expect(() => {
      result.current.measureOperation(failingOperation);
    }).toThrow('Operation failed');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Filter operation "testOperation" failed'),
      expect.any(Object)
    );
  });

  it('should not track in production', () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true
    });

    const { result } = renderHook(() => 
      useFilterOperationTracker('testOperation')
    );

    const operation = jest.fn(() => 'result');
    const operationResult = result.current.measureOperation(operation);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(operationResult).toBe('result');
    expect(console.warn).not.toHaveBeenCalled();

    // Restore environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true
    });
  });
});

describe('useLifecycleTracker', () => {
  it('should track component lifecycle', () => {
    const { result, unmount } = renderHook(() => 
      useLifecycleTracker('TestComponent', true)
    );

    expect(result.current.renderCount).toBe(1);
    expect(typeof result.current.getLifetimeMs).toBe('function');
    expect(result.current.getLifetimeMs()).toBeGreaterThanOrEqual(0);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Component TestComponent mounted'),
      expect.any(Object)
    );

    unmount();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Component TestComponent unmounted'),
      expect.any(Object)
    );
  });

  it('should track render count', () => {
    const { result, rerender } = renderHook(() => 
      useLifecycleTracker('TestComponent', true)
    );

    expect(result.current.renderCount).toBe(1);

    rerender();
    expect(result.current.renderCount).toBe(2);

    rerender();
    expect(result.current.renderCount).toBe(3);
  });

  it('should not track when disabled', () => {
    const { unmount } = renderHook(() => 
      useLifecycleTracker('TestComponent', false)
    );

    expect(console.log).not.toHaveBeenCalled();

    unmount();

    expect(console.log).not.toHaveBeenCalled();
  });
});