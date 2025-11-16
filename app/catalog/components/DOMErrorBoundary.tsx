// /app/catalog/components/DOMErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';
import { DebugLogger } from '../utils/debugLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Specialized error boundary for DOM access errors
 * Handles getBoundingClientRect, querySelector, and other DOM-related failures
 */
export class DOMErrorBoundary extends Component<Props, State> {
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

    // Log DOM-related errors with specific handling
    DebugLogger.errorBoundary(
      'DOM error caught by boundary',
      error,
      errorInfo as Record<string, unknown>,
      { component: this.props.componentName || 'Unknown' }
    );
    
    // Detect specific DOM-related errors
    const isDOMError = error.message.includes('getBoundingClientRect') || 
                      error.message.includes('Cannot read properties of null') ||
                      error.message.includes('querySelector') ||
                      error.message.includes('getElementById') ||
                      error.message.includes('addEventListener') ||
                      error.message.includes('removeEventListener');
    
    if (isDOMError) {
      DebugLogger.domError('Detected DOM access error', {
        component: this.props.componentName || 'Unknown',
        action: 'componentDidCatch',
        error,
        data: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
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

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI for DOM errors
      return (
        <div style={{ 
          padding: '15px', 
          textAlign: 'center', 
          border: '1px solid #ffc107', 
          borderRadius: '6px',
          margin: '10px 0',
          backgroundColor: '#fff3cd',
          color: '#856404'
        }}>
          <h4>⚠️ Компонент тимчасово недоступний</h4>
          <p>
            {this.props.componentName 
              ? `Виникла проблема з компонентом "${this.props.componentName}".`
              : 'Виникла проблема з відображенням компонента.'
            }
          </p>
          <p style={{ fontSize: '14px', marginBottom: '15px' }}>
            Це може бути пов'язано з доступом до DOM елементів.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '10px', 
              textAlign: 'left', 
              backgroundColor: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#495057'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Деталі помилки (розробка)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', fontSize: '10px' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          
          <button 
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            Спробувати знову
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}