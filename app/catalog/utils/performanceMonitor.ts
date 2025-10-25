// /app/catalog/utils/performanceMonitor.ts

/**
 * Performance monitoring utilities for catalog components
 * Provides render counting, dependency tracking, and performance measurement tools
 */

import { useRef, useEffect, useMemo } from 'react';
import { DebugLogger } from './debugLogger';

// Global performance tracking store (development only)
const performanceStore = {
  renderCounts: new Map<string, number>(),
  dependencyChanges: new Map<string, Array<{ timestamp: number; changes: Record<string, { from: unknown; to: unknown }> }>>(),
  filterOperationTimes: new Array<{ timestamp: number; duration: number; operation: string }>(),
  unstableDependencyWarnings: new Map<string, number>()
};

/**
 * Hook to count component renders in development
 */
export const useRenderCounter = (componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') => {
  const renderCountRef = useRef(0);
  
  if (enabled) {
    renderCountRef.current += 1;
    
    // Update global store
    const currentCount = performanceStore.renderCounts.get(componentName) || 0;
    performanceStore.renderCounts.set(componentName, currentCount + 1);
    
    // Log excessive renders
    if (renderCountRef.current > 10 && renderCountRef.current % 5 === 0) {
      DebugLogger.performance(`Component ${componentName} has rendered ${renderCountRef.current} times`, {
        component: componentName,
        action: 'render-count',
        data: { renderCount: renderCountRef.current }
      });
    }
  }
  
  return renderCountRef.current;
};

/**
 * Hook to track dependency changes and detect unstable dependencies
 */
export const useDependencyTracker = <T extends Record<string, any>>(
  dependencies: T,
  hookName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) => {
  const prevDepsRef = useRef<T | undefined>(undefined);
  const changeCountRef = useRef(0);
  
  const stableDependencies = useMemo(() => {
    if (!enabled) return dependencies;
    
    const currentDeps = dependencies;
    const prevDeps = prevDepsRef.current;
    
    if (prevDeps) {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      let hasChanges = false;
      
      // Check for changes in each dependency
      Object.keys(currentDeps).forEach(key => {
        if (currentDeps[key] !== prevDeps[key]) {
          changes[key] = {
            from: prevDeps[key],
            to: currentDeps[key]
          };
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        changeCountRef.current += 1;
        
        // Store dependency changes
        const hookChanges = performanceStore.dependencyChanges.get(hookName) || [];
        hookChanges.push({
          timestamp: Date.now(),
          changes
        });
        performanceStore.dependencyChanges.set(hookName, hookChanges.slice(-20)); // Keep last 20 changes
        
        // Log dependency changes
        DebugLogger.debug(`Dependencies changed in ${hookName}`, {
          component: hookName,
          action: 'dependency-change',
          data: { changes, changeCount: changeCountRef.current }
        });
        
        // Warn about frequent changes (potential unstable dependencies)
        if (changeCountRef.current > 20) {
          const warningCount = performanceStore.unstableDependencyWarnings.get(hookName) || 0;
          if (warningCount < 3) { // Limit warnings to avoid spam
            DebugLogger.hookWarning(
              `Hook ${hookName} has unstable dependencies (${changeCountRef.current} changes). Consider memoizing dependencies.`,
              {
                component: hookName,
                action: 'unstable-dependencies',
                data: { changeCount: changeCountRef.current, recentChanges: changes }
              }
            );
            performanceStore.unstableDependencyWarnings.set(hookName, warningCount + 1);
          }
        }
      }
    }
    
    prevDepsRef.current = currentDeps;
    return currentDeps;
  }, [dependencies, hookName, enabled]);
  
  return stableDependencies;
};

/**
 * Performance measurement utility for filter operations
 */
export class FilterPerformanceMonitor {
  private static startTimes = new Map<string, number>();
  
  /**
   * Start measuring a filter operation
   */
  static startMeasurement(operationId: string, operationName: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.startTimes.set(operationId, performance.now());
      DebugLogger.debug(`Started measuring: ${operationName}`, {
        component: 'FilterPerformanceMonitor',
        action: 'start-measurement',
        data: { operationId, operationName }
      });
    }
  }
  
  /**
   * End measuring a filter operation and log results
   */
  static endMeasurement(operationId: string, operationName: string, additionalData?: Record<string, unknown>): number {
    if (process.env.NODE_ENV === 'development') {
      const startTime = this.startTimes.get(operationId);
      if (startTime) {
        const duration = performance.now() - startTime;
        this.startTimes.delete(operationId);
        
        // Store in global performance store
        performanceStore.filterOperationTimes.push({
          timestamp: Date.now(),
          duration,
          operation: operationName
        });
        
        // Keep only last 100 measurements
        if (performanceStore.filterOperationTimes.length > 100) {
          performanceStore.filterOperationTimes = performanceStore.filterOperationTimes.slice(-100);
        }
        
        // Log performance
        const logLevel = duration > 100 ? 'performance' : 'debug';
        DebugLogger[logLevel](`${operationName} completed in ${duration.toFixed(2)}ms`, {
          component: 'FilterPerformanceMonitor',
          action: 'end-measurement',
          data: { operationId, operationName, duration, ...additionalData }
        });
        
        return duration;
      }
    }
    return 0;
  }
  
  /**
   * Get performance statistics for filter operations
   */
  static getPerformanceStats(): {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalOperations: number;
    recentOperations: Array<{ timestamp: number; duration: number; operation: string }>;
  } {
    const operations = performanceStore.filterOperationTimes;
    
    if (operations.length === 0) {
      return {
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        totalOperations: 0,
        recentOperations: []
      };
    }
    
    const durations = operations.map(op => op.duration);
    const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    return {
      averageDuration,
      maxDuration,
      minDuration,
      totalOperations: operations.length,
      recentOperations: operations.slice(-10) // Last 10 operations
    };
  }
}

/**
 * Hook to measure component render performance
 */
export const useRenderPerformance = (componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') => {
  const renderStartRef = useRef<number | undefined>(undefined);
  
  // Start measurement at beginning of render
  if (enabled) {
    renderStartRef.current = performance.now();
  }
  
  useEffect(() => {
    if (enabled && renderStartRef.current) {
      const renderDuration = performance.now() - renderStartRef.current;
      
      if (renderDuration > 16) { // Warn if render takes longer than one frame (16ms)
        DebugLogger.performance(`Slow render detected in ${componentName}: ${renderDuration.toFixed(2)}ms`, {
          component: componentName,
          action: 'slow-render',
          data: { renderDuration }
        });
      }
    }
  }, []); // Empty dependency array to run only once per render cycle
};

