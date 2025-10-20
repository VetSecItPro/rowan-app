// Cookie Management Utilities
// Provides actual cookie control functionality for GDPR/CCPA compliance

import { UserPrivacyPreferences } from '../types/privacy';

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

// Define all cookies used by the application
export const COOKIE_CATALOG: CookieDetails[] = [
  // Necessary cookies (cannot be disabled)
  {
    name: 'sb-access-token',
    category: 'necessary',
    purpose: 'User authentication and session management',
    duration: '1 hour',
    provider: 'Supabase',
  },
  {
    name: 'sb-refresh-token',
    category: 'necessary',
    purpose: 'Authentication token refresh',
    duration: '7 days',
    provider: 'Supabase',
  },
  {
    name: 'space-id',
    category: 'necessary',
    purpose: 'Current workspace context',
    duration: 'Session',
    provider: 'Rowan',
  },
  {
    name: 'theme-preference',
    category: 'necessary',
    purpose: 'Dark/light mode preference',
    duration: '1 year',
    provider: 'Rowan',
  },
  {
    name: 'cookie-consent',
    category: 'necessary',
    purpose: 'Cookie consent status tracking',
    duration: '1 year',
    provider: 'Rowan',
  },

  // Analytics cookies
  {
    name: '_ga',
    category: 'analytics',
    purpose: 'Google Analytics - distinguish users',
    duration: '2 years',
    provider: 'Google Analytics',
  },
  {
    name: '_ga_*',
    category: 'analytics',
    purpose: 'Google Analytics - session state',
    duration: '2 years',
    provider: 'Google Analytics',
  },
  {
    name: 'vercel-analytics',
    category: 'analytics',
    purpose: 'Vercel Analytics - page views and performance',
    duration: '1 year',
    provider: 'Vercel',
  },

  // Marketing cookies
  {
    name: '_fbp',
    category: 'marketing',
    purpose: 'Facebook Pixel - user tracking for advertising',
    duration: '3 months',
    provider: 'Facebook',
  },
  {
    name: '_fbc',
    category: 'marketing',
    purpose: 'Facebook Pixel - conversion tracking',
    duration: '1 week',
    provider: 'Facebook',
  },
  {
    name: 'google-ads',
    category: 'marketing',
    purpose: 'Google Ads - remarketing and conversion tracking',
    duration: '90 days',
    provider: 'Google Ads',
  },

  // Functional cookies
  {
    name: 'tour-completed',
    category: 'functional',
    purpose: 'Track completed product tours',
    duration: '1 year',
    provider: 'Rowan',
  },
  {
    name: 'sidebar-collapsed',
    category: 'functional',
    purpose: 'Remember sidebar state',
    duration: '30 days',
    provider: 'Rowan',
  },
  {
    name: 'notification-permission',
    category: 'functional',
    purpose: 'Browser notification permission state',
    duration: '1 year',
    provider: 'Rowan',
  },

  // Preference cookies
  {
    name: 'language',
    category: 'preferences',
    purpose: 'User language preference',
    duration: '1 year',
    provider: 'Rowan',
  },
  {
    name: 'timezone',
    category: 'preferences',
    purpose: 'User timezone for scheduling',
    duration: '1 year',
    provider: 'Rowan',
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
    console.error('Error reading cookie preferences:', error);
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

    console.log('✅ Cookie preferences updated:', preferences);
  } catch (error) {
    console.error('❌ Error updating cookie preferences:', error);
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
    console.error(`Error setting cookie ${name}:`, error);
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
    console.error(`Error getting cookie ${name}:`, error);
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
    console.error(`Error deleting cookie ${name}:`, error);
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
    console.error(`Error deleting cookies matching ${pattern}:`, error);
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

    console.log('📊 Third-party scripts updated based on cookie preferences');
  } catch (error) {
    console.error('Error toggling third-party scripts:', error);
  }
}

// Google Analytics control
function enableGoogleAnalytics(): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;

  (window as any).gtag = (window as any).gtag || function() {
    ((window as any).dataLayer = (window as any).dataLayer || []).push(arguments);
  };

  (window as any).gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
  });
}

function disableGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;

  (window as any).gtag = (window as any).gtag || function() {};
  (window as any).gtag('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
  });
}

// Facebook Pixel control
function enableFacebookPixel(): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID) return;

  const fbq = (window as any).fbq;
  if (fbq) {
    fbq('consent', 'grant');
  }
}

function disableFacebookPixel(): void {
  if (typeof window === 'undefined') return;

  const fbq = (window as any).fbq;
  if (fbq) {
    fbq('consent', 'revoke');
  }
}

// Vercel Analytics control
function enableVercelAnalytics(): void {
  if (typeof window === 'undefined') return;

  const va = (window as any).va;
  if (va) {
    va('track', 'consent-granted');
  }
}

function disableVercelAnalytics(): void {
  if (typeof window === 'undefined') return;

  const va = (window as any).va;
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
    analytics: privacy.third_party_analytics_enabled,
    marketing: privacy.share_data_with_partners && !privacy.ccpa_do_not_sell,
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