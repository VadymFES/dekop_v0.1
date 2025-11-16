// /app/catalog/components/CatalogErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CatalogErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log hook-related errors for debugging
    console.error('Catalog hook error caught by boundary:', error, errorInfo);
    
    // You can also log the error to an error reporting service here
    if (error.message.includes('Maximum update depth exceeded') || 
        error.message.includes('Cannot read properties of null')) {
      console.warn('Detected React hook-related error in catalog:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          margin: '20px 0',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>Упс! Щось пішло не так з фільтрами</h3>
          <p>Спробуйте оновити сторінку або очистити фільтри.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Оновити сторінку
          </button>
          <button 
            onClick={() => {
              // Clear URL parameters and reload
              const newUrl = window.location.pathname;
              window.history.pushState({ path: newUrl }, '', newUrl);
              window.location.reload();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Очистити фільтри
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}