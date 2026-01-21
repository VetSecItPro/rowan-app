// Cookie Management Utilities
// Provides actual cookie control functionality for GDPR/CCPA compliance

import { UserPrivacyPreferences } from '../types/privacy';
import { logger } from '@/lib/logger';

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
  va?: (...args: unknown[]) => void;
};

export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  preferences: boolean;
}

export interface CookieDetails {
  name: string;
  category: keyof CookiePreferences;
  purpose: string;
  duration: string;
  provider?: string;
}

// Define cookie categories (generic descriptions without revealing tech stack)
export const COOKIE_CATALOG: CookieDetails[] = [
  // Necessary cookies (cannot be disabled)
  {
    name: 'Authentication cookies',
    category: 'necessary',
    purpose: 'Keep you logged in and maintain your session',
    duration: 'Session to 7 days',
  },
  {
    name: 'Security tokens',
    category: 'necessary',
    purpose: 'Protect against security threats and unauthorized access',
    duration: 'Session',
  },
  {
    name: 'Theme settings',
    category: 'necessary',
    purpose: 'Remember your dark/light mode preference',
    duration: '1 year',
  },
  {
    name: 'Cookie consent',
    category: 'necessary',
    purpose: 'Remember your cookie choices',
    duration: '1 year',
  },

  // Analytics cookies
  {
    name: 'Usage analytics',
    category: 'analytics',
    purpose: 'Help us understand how you use the app to improve performance',
    duration: 'Up to 2 years',
  },
  {
    name: 'Performance tracking',
    category: 'analytics',
    purpose: 'Monitor app performance and identify issues',
    duration: 'Up to 1 year',
  },

  // Marketing cookies
  {
    name: 'Advertising tracking',
    category: 'marketing',
    purpose: 'Show you relevant ads and measure campaign effectiveness',
    duration: 'Up to 3 months',
  },
  {
    name: 'Conversion tracking',
    category: 'marketing',
    purpose: 'Track conversions and improve our marketing',
    duration: 'Up to 90 days',
  },

  // Functional cookies
  {
    name: 'Feature preferences',
    category: 'functional',
    purpose: 'Remember your app preferences and settings',
    duration: 'Up to 1 year',
  },
  {
    name: 'UI state',
    category: 'functional',
    purpose: 'Remember interface settings like sidebar state',
    duration: 'Up to 30 days',
  },

  // Preference cookies
  {
    name: 'Personalization',
    category: 'preferences',
    purpose: 'Remember your language, timezone, and personalization settings',
    duration: 'Up to 1 year',
  },
];

// Get current cookie preferences from browser
export function getCookiePreferences(): CookiePreferences {
  if (typeof window === 'undefined') {
    return getDefaultCookiePreferences();
  }

  try {
    const stored = localStorage.getItem('cookie-preferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        necessary: true, // Always true
        analytics: parsed.analytics ?? false,
        marketing: parsed.marketing ?? false,
        functional: parsed.functional ?? true,
        preferences: parsed.preferences ?? true,
      };
    }
  } catch (error) {
    logger.error('Error reading cookie preferences:', error, { component: 'lib-cookies', action: 'service_call' });
  }

  return getDefaultCookiePreferences();
}

// Get default cookie preferences (minimal set)
export function getDefaultCookiePreferences(): CookiePreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    functional: true,
    preferences: true,
  };
}

// Update cookie preferences and apply changes
export function updateCookiePreferences(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return;

  try {
    // Store preferences
    localStorage.setItem('cookie-preferences', JSON.stringify(preferences));

    // Apply cookie changes immediately
    applyCookiePreferences(preferences);

    // Set consent timestamp
    setCookie('cookie-consent', new Date().toISOString(), 365);

    logger.info('✅ Cookie preferences updated:', { component: 'lib-cookies', data: preferences });
  } catch (error) {
    logger.error('❌ Error updating cookie preferences:', error, { component: 'lib-cookies', action: 'service_call' });
  }
}

// Apply cookie preferences by removing disallowed cookies
export function applyCookiePreferences(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return;

  const categories: (keyof CookiePreferences)[] = ['analytics', 'marketing', 'functional', 'preferences'];

  categories.forEach(category => {
    if (!preferences[category]) {
      // Remove all cookies in this category
      const categoryServices = COOKIE_CATALOG.filter(cookie => cookie.category === category);
      categoryServices.forEach(service => {
        deleteCookie(service.name);

        // Handle wildcard patterns
        if (service.name.includes('*')) {
          const pattern = service.name.replace('*', '');
          deleteMatchingCookies(pattern);
        }
      });
    }
  });

  // Disable/enable third-party scripts based on preferences
  toggleThirdPartyScripts(preferences);
}

// Set a cookie
export function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;

  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  } catch (error) {
    logger.error('Error setting cookie ${name}:', error, { component: 'lib-cookies', action: 'service_call' });
  }
}

// Get a cookie value
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  try {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (error) {
    logger.error('Error getting cookie ${name}:', error, { component: 'lib-cookies', action: 'service_call' });
  }

  return null;
}

// Delete a specific cookie
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;

  try {
    // Delete with different path and domain combinations
    const domains = ['', window.location.hostname, `.${window.location.hostname}`];
    const paths = ['/', ''];

    domains.forEach(domain => {
      paths.forEach(path => {
        const domainStr = domain ? `; domain=${domain}` : '';
        const pathStr = path ? `; path=${path}` : '';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${domainStr}${pathStr}`;
      });
    });
  } catch (error) {
    logger.error('Error deleting cookie ${name}:', error, { component: 'lib-cookies', action: 'service_call' });
  }
}

// Delete cookies matching a pattern (for wildcard entries)
export function deleteMatchingCookies(pattern: string): void {
  if (typeof document === 'undefined') return;

  try {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.startsWith(pattern)) {
        deleteCookie(name);
      }
    });
  } catch (error) {
    logger.error('Error deleting cookies matching ${pattern}:', error, { component: 'lib-cookies', action: 'service_call' });
  }
}

// Toggle third-party scripts based on preferences
export function toggleThirdPartyScripts(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return;

  try {
    // Google Analytics
    if (preferences.analytics) {
      enableGoogleAnalytics();
    } else {
      disableGoogleAnalytics();
    }

    // Facebook Pixel
    if (preferences.marketing) {
      enableFacebookPixel();
    } else {
      disableFacebookPixel();
    }

    // Vercel Analytics
    if (preferences.analytics) {
      enableVercelAnalytics();
    } else {
      disableVercelAnalytics();
    }

    logger.info('📊 Third-party scripts updated based on cookie preferences', { component: 'lib-cookies' });
  } catch (error) {
    logger.error('Error toggling third-party scripts:', error, { component: 'lib-cookies', action: 'service_call' });
  }
}

// Google Analytics control
function enableGoogleAnalytics(): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.gtag = analyticsWindow.gtag || ((...args: unknown[]) => {
    const dataLayer = analyticsWindow.dataLayer || [];
    dataLayer.push(args);
    analyticsWindow.dataLayer = dataLayer;
  });

  analyticsWindow.gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
  });
}

function disableGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.gtag = analyticsWindow.gtag || (() => {});
  analyticsWindow.gtag('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
  });
}

// Facebook Pixel control
function enableFacebookPixel(): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID) return;

  const fbq = (window as AnalyticsWindow).fbq;
  if (fbq) {
    fbq('consent', 'grant');
  }
}

function disableFacebookPixel(): void {
  if (typeof window === 'undefined') return;

  const fbq = (window as AnalyticsWindow).fbq;
  if (fbq) {
    fbq('consent', 'revoke');
  }
}

// Vercel Analytics control
function enableVercelAnalytics(): void {
  if (typeof window === 'undefined') return;

  const va = (window as AnalyticsWindow).va;
  if (va) {
    va('track', 'consent-granted');
  }
}

function disableVercelAnalytics(): void {
  if (typeof window === 'undefined') return;

  const va = (window as AnalyticsWindow).va;
  if (va) {
    va('track', 'consent-revoked');
  }
}

// Check if user has given consent
export function hasUserConsented(): boolean {
  const consent = getCookie('cookie-consent');
  return consent !== null;
}

// Check if user has made a choice about cookie preferences
export function hasUserMadeCookieChoice(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const stored = localStorage.getItem('cookie-preferences');
    return stored !== null;
  } catch {
    return false;
  }
}

// Get cookie consent timestamp
export function getCookieConsentTimestamp(): Date | null {
  const consent = getCookie('cookie-consent');
  if (!consent) return null;

  try {
    return new Date(consent);
  } catch {
    return null;
  }
}

// Convert privacy preferences to cookie preferences
export function privacyToCookiePreferences(privacy: UserPrivacyPreferences): CookiePreferences {
  return {
    necessary: true,
    analytics: !!privacy.third_party_analytics_enabled,
    marketing: !!(privacy.share_data_with_partners && !privacy.ccpa_do_not_sell),
    functional: true, // Always enabled for core functionality
    preferences: true, // Always enabled for user experience
  };
}

// Convert cookie preferences to privacy updates
export function cookieToPrivacyUpdates(cookies: CookiePreferences): Partial<UserPrivacyPreferences> {
  return {
    third_party_analytics_enabled: cookies.analytics,
    share_data_with_partners: cookies.marketing,
    ccpa_do_not_sell: !cookies.marketing,
  };
}
