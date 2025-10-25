// /app/catalog/utils/hookPerformanceTracker.ts

/**
 * Specialized performance tracking utilities for React hooks
 * Provides detailed monitoring for useEffect, useMemo, and useCallback performance
 */

import React, { useRef, useEffect, DependencyList } from 'react';
import { DebugLogger } from './debugLogger';

/**
 * Enhanced useEffect with dependency tracking and performance monitoring
 */
export const useTrackedEffect = (
  effect: React.EffectCallback,
  deps: DependencyList | undefined,
  hookName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) => {
  const prevDepsRef = useRef<DependencyList | undefined>(undefined);
  const executionCountRef = useRef(0);
  const lastExecutionTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled) {
      return effect();
    }
    
    const startTime = performance.now();
    executionCountRef.current += 1;
    
    // Track dependency changes
    if (prevDepsRef.current && deps) {
      const changedDeps: number[] = [];
      deps.forEach((dep, index) => {
        if (prevDepsRef.current && prevDepsRef.current[index] !== dep) {
          changedDeps.push(index);
        }
      });
      
      if (changedDeps.length > 0) {
        DebugLogger.debug(`useEffect in ${hookName} triggered by dependency changes`, {
          component: hookName,
          action: 'effect-trigger',
          data: {
            changedDependencyIndexes: changedDeps,
            executionCount: executionCountRef.current,
            timeSinceLastExecution: startTime - lastExecutionTimeRef.current
          }
        });
      }
    }
    
    // Execute the effect and measure performance
    const cleanup = effect();
    const executionTime = performance.now() - startTime;
    lastExecutionTimeRef.current = performance.now();
    
    // Log slow effects
    if (executionTime > 10) {
      DebugLogger.performance(`Slow useEffect in ${hookName}: ${executionTime.toFixed(2)}ms`, {
        component: hookName,
        action: 'slow-effect',
        data: { executionTime, executionCount: executionCountRef.current }
      });
    }
    
    // Warn about frequent executions
    if (executionCountRef.current > 50 && executionCountRef.current % 10 === 0) {
      DebugLogger.hookWarning(`useEffect in ${hookName} has executed ${executionCountRef.current} times`, {
        component: hookName,
        action: 'frequent-effect',
        data: { executionCount: executionCountRef.current }
      });
    }
    
    prevDepsRef.current = deps;
    return cleanup;
  }, deps || []);
};

/**
 * Utility to detect and warn about unstable dependencies
 */
export const useStabilityChecker = <T>(
  value: T,
  valueName: string,
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
): T => {
  const prevValueRef = useRef<T | undefined>(undefined);
  const changeCountRef = useRef(0);
  const firstRenderRef = useRef(true);
  
  if (enabled) {
    if (!firstRenderRef.current && prevValueRef.current !== value) {
      changeCountRef.current += 1;
      
      // Check if value is an object or array (potentially unstable)
      const isComplexType = typeof value === 'object' && value !== null;
      
      if (isComplexType && changeCountRef.current > 5) {
        DebugLogger.hookWarning(
          `Potentially unstable dependency "${valueName}" in ${componentName}`,
          {
            component: componentName,
            action: 'unstable-dependency',
            data: {
              valueName,
              changeCount: changeCountRef.current,
              valueType: Array.isArray(value) ? 'array' : typeof value,
              suggestion: 'Consider using useMemo or useCallback to stabilize this dependency'
            }
          }
        );
      }
    }
    
    prevValueRef.current = value;
    firstRenderRef.current = false;
  }
  
  return value;
};

/**
 * Performance-aware useMemo wrapper with tracking
 */
export const useTrackedMemo = <T>(
  factory: () => T,
  deps: DependencyList | undefined,
  memoName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
): T => {
  const computationCountRef = useRef(0);
  const lastComputationTimeRef = useRef<number>(0);
  
  return React.useMemo(() => {
    if (!enabled) {
      return factory();
    }
    
    const startTime = performance.now();
    computationCountRef.current += 1;
    
    const result = factory();
    const computationTime = performance.now() - startTime;
    lastComputationTimeRef.current = performance.now();
    
    // Log expensive computations
    if (computationTime > 5) {
      DebugLogger.performance(`Expensive useMemo computation in ${memoName}: ${computationTime.toFixed(2)}ms`, {
        component: memoName,
        action: 'expensive-memo',
        data: { computationTime, computationCount: computationCountRef.current }
      });
    }
    
    // Log frequent recomputations (potential memoization failure)
    if (computationCountRef.current > 20 && computationCountRef.current % 5 === 0) {
      DebugLogger.hookWarning(`useMemo in ${memoName} has recomputed ${computationCountRef.current} times`, {
        component: memoName,
        action: 'frequent-recomputation',
        data: { 
          computationCount: computationCountRef.current,
          suggestion: 'Check if dependencies are properly memoized'
        }
      });
    }
    
    return result;
  }, deps || []);
};

/**
 * Utility to measure and log filter operation performance
 */
export const useFilterOperationTracker = (operationName: string) => {
  const measureOperation = <T>(operation: () => T, operationId?: string): T => {
    if (process.env.NODE_ENV !== 'development') {
      return operation();
    }
    
    const id = operationId || `${operationName}-${Date.now()}`;
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      if (duration > 50) {
        DebugLogger.performance(`Slow filter operation "${operationName}": ${duration.toFixed(2)}ms`, {
          component: 'FilterOperationTracker',
          action: 'slow-filter-operation',
          data: { operationName, duration, operationId: id }
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      DebugLogger.hookError(`Filter operation "${operationName}" failed after ${duration.toFixed(2)}ms`, {
        component: 'FilterOperationTracker',
        action: 'filter-operation-error',
        data: { operationName, duration, operationId: id },
        error: error as Error
      });
      throw error;
    }
  };
  
  return { measureOperation };
};

/**
 * Hook to track component lifecycle and detect memory leaks
 */
export const useLifecycleTracker = (componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') => {
  const mountTimeRef = useRef<number | undefined>(undefined);
  const renderCountRef = useRef(0);
  
  if (enabled) {
    renderCountRef.current += 1;
    
    // Track mount time on first render
    if (renderCountRef.current === 1) {
      mountTimeRef.current = performance.now();
      DebugLogger.debug(`Component ${componentName} mounted`, {
        component: componentName,
        action: 'mount',
        data: { mountTime: mountTimeRef.current }
      });
    }
  }
  
  useEffect(() => {
    if (!enabled) return;
    
    // Cleanup tracking
    return () => {
      const unmountTime = performance.now();
      const lifetimeMs = mountTimeRef.current ? unmountTime - mountTimeRef.current : 0;
      
      DebugLogger.cleanup(`Component ${componentName} unmounted`, {
        component: componentName,
        action: 'unmount',
        data: {
          lifetimeMs: lifetimeMs.toFixed(2),
          totalRenders: renderCountRef.current,
          averageRenderInterval: renderCountRef.current > 1 ? (lifetimeMs / renderCountRef.current).toFixed(2) : 'N/A'
        }
      });
    };
  }, [componentName, enabled]);
  
  return {
    renderCount: renderCountRef.current,
    getLifetimeMs: () => mountTimeRef.current ? performance.now() - mountTimeRef.current : 0
  };
};

// Re-export React's useMemo for convenience, but with a warning about using useTrackedMemo in development
export { useMemo } from 'react';