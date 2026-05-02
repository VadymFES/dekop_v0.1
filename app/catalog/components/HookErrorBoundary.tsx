// /app/catalog/components/HookErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Specialized error boundary for React hook-related errors
 * Specifically handles infinite re-render loops and hook dependency issues
 */
export class HookErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store error info for debugging
    this.setState({ errorInfo });

    // Log hook-related errors with specific handling
    console.error('Hook error caught by boundary:', error, errorInfo);
    
    // Detect specific hook-related errors
    const isHookError = error.message.includes('Maximum update depth exceeded') || 
                       error.message.includes('Cannot read properties of null') ||
                       error.message.includes('useEffect') ||
                       error.message.includes('useCallback') ||
                       error.message.includes('useMemo');
    
    if (isHookError) {
      console.warn('Detected React hook-related error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    // Full page reload as last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI for hook errors
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          border: '2px solid #ff6b6b', 
          borderRadius: '8px',
          margin: '20px 0',
          backgroundColor: '#fff5f5',
          color: '#d63031'
        }}>
          <h3>⚠️ Помилка в роботі фільтрів</h3>
          <p>Виникла проблема з обробкою фільтрів. Це може бути пов'язано з нестабільними залежностями React hooks.</p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '15px', 
              textAlign: 'left', 
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#495057'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Деталі помилки (тільки для розробки)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                {this.state.error.message}
                {this.state.error.stack && `\n\nStack trace:\n${this.state.error.stack}`}
                {this.state.errorInfo?.componentStack && 
                  `\n\nComponent stack:${this.state.errorInfo.componentStack}`}
              </pre>
            </details>
          )}
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={this.handleRetry}
              style={{
                padding: '10px 20px',
                backgroundColor: '#00b894',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px',
                fontSize: '14px'
              }}
            >
              Спробувати знову
            </button>
            <button 
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Перезавантажити сторінку
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}