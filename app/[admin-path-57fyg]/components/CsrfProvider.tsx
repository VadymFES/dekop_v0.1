'use client';

/**
 * CSRF Provider Component (Task 6)
 *
 * Provides CSRF token to all client components via React Context.
 * Handles token refresh and includes helper for fetch requests.
 * Auto-refreshes token if missing or expired.
 */

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';

// Get admin path from environment variable (Task 7)
const ADMIN_PATH = `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin'}`;

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
  const [refreshedToken, setRefreshedToken] = useState<string | null>(null);

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
    // Fall back to refreshed token from API, then initial token
    return refreshedToken || initialToken;
  }, [initialToken, refreshedToken]);

  // Auto-refresh CSRF token if missing on mount
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      // Check if token exists in cookie
      const existingToken = getCsrfTokenFromCookie();
      if (existingToken) return; // Token exists, no need to refresh

      // Token missing, fetch a new one
      try {
        const response = await fetch(`${ADMIN_PATH}/api/auth/csrf`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.csrfToken) {
            setRefreshedToken(data.csrfToken);
          }
        }
      } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
      }
    };

    checkAndRefreshToken();
  }, []);

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
