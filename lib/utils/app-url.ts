/**
 * Get the canonical app URL for production use
 *
 * IMPORTANT: This function ensures we always use rowanapp.com for production,
 * regardless of what NEXT_PUBLIC_APP_URL is set to. Vercel preview deployments
 * should NOT use preview URLs in user-facing emails.
 *
 * @returns The canonical app URL (https://rowanapp.com in production)
 */
export function getAppUrl(): string {
  // In production, ALWAYS use the canonical domain
  // This prevents emails from containing vercel.app preview URLs
  if (process.env.NODE_ENV === 'production') {
    return 'https://rowanapp.com';
  }

  // In development, use the env var or localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Build a full URL for the app
 *
 * @param path - The path to append (e.g., '/signup', '/dashboard')
 * @param params - Optional query parameters
 * @returns Full URL string
 */
export function buildAppUrl(path: string, params?: Record<string, string>): string {
  const baseUrl = getAppUrl();
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
  }

  return url.toString();
}
