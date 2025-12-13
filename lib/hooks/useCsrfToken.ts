'use client';

import { useState, useEffect, useCallback } from 'react';
import { CSRF_HEADER_NAME } from '@/lib/security/csrf';

/**
 * Hook for managing CSRF tokens on the client side
 *
 * Usage:
 * ```tsx
 * const { token, headers, isLoading, refreshToken } = useCsrfToken();
 *
 * // Use with fetch:
 * fetch('/api/sensitive-action', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...headers, // Includes X-CSRF-Token
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/csrf/token', {
        method: 'GET',
        credentials: 'include', // Important: include cookies
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();

      if (data.success && data.token) {
        setToken(data.token);
        // Also store in sessionStorage for persistence across page loads
        sessionStorage.setItem('csrf_token', data.token);
      } else {
        throw new Error(data.error || 'Invalid response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch CSRF token');
      // Try to recover from sessionStorage
      const storedToken = sessionStorage.getItem('csrf_token');
      if (storedToken) {
        setToken(storedToken);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch token on mount
  useEffect(() => {
    // Try sessionStorage first for immediate availability
    const storedToken = sessionStorage.getItem('csrf_token');
    if (storedToken) {
      setToken(storedToken);
      setIsLoading(false);
      // Still fetch to ensure cookie is set and token is valid
      fetchToken();
    } else {
      fetchToken();
    }
  }, [fetchToken]);

  // Headers object for convenience
  const headers: Record<string, string> = token
    ? { [CSRF_HEADER_NAME]: token }
    : {};

  return {
    token,
    headers,
    isLoading,
    error,
    refreshToken: fetchToken,
  };
}

/**
 * Utility to create a fetch wrapper with CSRF token
 *
 * Usage:
 * ```tsx
 * const csrfFetch = createCsrfFetch(token);
 * await csrfFetch('/api/action', { method: 'POST', body: ... });
 * ```
 */
export function createCsrfFetch(token: string | null) {
  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always include credentials for CSRF
    });
  };
}

/**
 * Higher-order function to wrap any fetch call with CSRF protection
 *
 * Usage:
 * ```tsx
 * const { token } = useCsrfToken();
 * const result = await withCsrf(token, () =>
 *   fetch('/api/action', { method: 'POST', body: ... })
 * );
 * ```
 */
export async function withCsrf<T>(
  token: string | null,
  fetchFn: (headers: Record<string, string>) => Promise<T>
): Promise<T> {
  const csrfHeaders: Record<string, string> = token ? { [CSRF_HEADER_NAME]: token } : {};
  return fetchFn(csrfHeaders);
}
