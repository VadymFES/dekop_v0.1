'use client';

/**
 * CSRF Provider Component (Task 6)
 *
 * Provides CSRF token to all client components via React Context.
 * Handles token refresh and includes helper for fetch requests.
 */

import { createContext, useContext, useCallback, ReactNode } from 'react';

interface CsrfContextType {
  csrfToken: string | null;
  getCsrfHeaders: () => Record<string, string>;
  csrfFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const CsrfContext = createContext<CsrfContextType | null>(null);

interface CsrfProviderProps {
  children: ReactNode;
  initialToken: string | null;
}

export function CsrfProvider({ children, initialToken }: CsrfProviderProps) {
  // Get CSRF token from cookie (refreshes automatically after mutations)
  const getCsrfToken = useCallback((): string | null => {
    if (typeof document === 'undefined') return initialToken;

    // Read from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf_token') {
        return decodeURIComponent(value);
      }
    }
    return initialToken;
  }, [initialToken]);

  // Get headers with CSRF token
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    const token = getCsrfToken();
    if (!token) return {};
    return { 'X-CSRF-Token': token };
  }, [getCsrfToken]);

  // Fetch wrapper that automatically includes CSRF token
  const csrfFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = getCsrfToken();

    const headers = new Headers(options.headers || {});

    // Add CSRF token for mutation requests
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && token) {
      headers.set('X-CSRF-Token', token);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }, [getCsrfToken]);

  const value: CsrfContextType = {
    csrfToken: getCsrfToken(),
    getCsrfHeaders,
    csrfFetch,
  };

  return (
    <CsrfContext.Provider value={value}>
      {children}
    </CsrfContext.Provider>
  );
}

/**
 * Hook to access CSRF context
 */
export function useCsrf(): CsrfContextType {
  const context = useContext(CsrfContext);
  if (!context) {
    throw new Error('useCsrf must be used within a CsrfProvider');
  }
  return context;
}

/**
 * Standalone helper for getting CSRF token from cookie (for use outside React)
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}
