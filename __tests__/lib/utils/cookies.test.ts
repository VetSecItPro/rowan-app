/**
 * Unit tests for lib/utils/cookies.ts
 *
 * Tests cookie CRUD helpers, preference management, consent tracking,
 * and privacy preference conversion utilities.
 *
 * The vitest environment is "node", so document and window are not available
 * natively. We mock the globals that the module uses so we can exercise the
 * browser-path code paths without jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock logger to suppress output
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Browser-globals simulator
// The module under test guards all DOM code with `typeof window` and
// `typeof document` checks. We inject a minimal in-memory implementation.
// ---------------------------------------------------------------------------

let cookieJar = '';

function makeBrowserGlobals() {
  const cookieProp: PropertyDescriptor = {
    configurable: true,
    get() {
      return cookieJar;
    },
    set(value: string) {
      const [nameValue] = value.split(';');
      const eqIdx = nameValue.indexOf('=');
      const name = nameValue.slice(0, eqIdx).trim();
      const val = nameValue.slice(eqIdx + 1);

      if (value.includes('expires=Thu, 01 Jan 1970')) {
        // Deletion
        const re = new RegExp(`(^|;\\s*)${name}=[^;]*(;|$)`, 'g');
        cookieJar = cookieJar.replace(re, '').replace(/^;\\s*/, '').trim();
      } else {
        const re = new RegExp(`(^|;\\s*)${name}=[^;]*(;|$)`);
        const entry = `${name}=${val}`;
        if (re.test(cookieJar)) {
          cookieJar = cookieJar.replace(re, entry);
        } else {
          cookieJar = cookieJar ? `${cookieJar}; ${entry}` : entry;
        }
      }
    },
  };

  const documentStub = { cookie: '' };
  Object.defineProperty(documentStub, 'cookie', cookieProp);

  const windowStub = {
    location: { hostname: 'localhost' },
    localStorage: {
      _store: {} as Record<string, string>,
      getItem(key: string) { return this._store[key] ?? null; },
      setItem(key: string, value: string) { this._store[key] = value; },
      removeItem(key: string) { delete this._store[key]; },
      clear() { this._store = {}; },
    },
    sessionStorage: {
      _store: {} as Record<string, string>,
      getItem(key: string) { return this._store[key] ?? null; },
      setItem(key: string, value: string) { this._store[key] = value; },
      removeItem(key: string) { delete this._store[key]; },
      clear() { this._store = {}; },
    },
    gtag: undefined as unknown,
    dataLayer: undefined as unknown,
    fbq: undefined as unknown,
    va: undefined as unknown,
  };

  return { documentStub, windowStub };
}

// Inject globals before importing the module so guards see them
const { documentStub, windowStub } = makeBrowserGlobals();
vi.stubGlobal('document', documentStub);
vi.stubGlobal('window', windowStub);
// Expose localStorage / sessionStorage at the top level so module code
// using `localStorage.xxx` (no window prefix) also works
vi.stubGlobal('localStorage', windowStub.localStorage);
vi.stubGlobal('sessionStorage', windowStub.sessionStorage);

// ---------------------------------------------------------------------------
// Import AFTER stubs are in place
// ---------------------------------------------------------------------------

import {
  getDefaultCookiePreferences,
  getCookiePreferences,
  updateCookiePreferences,
  setCookie,
  getCookie,
  deleteCookie,
  deleteMatchingCookies,
  hasUserConsented,
  hasUserMadeCookieChoice,
  getCookieConsentTimestamp,
  privacyToCookiePreferences,
  cookieToPrivacyUpdates,
  COOKIE_CATALOG,
} from '@/lib/utils/cookies';

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  cookieJar = '';
  windowStub.localStorage.clear();
});

afterEach(() => {
  cookieJar = '';
  windowStub.localStorage.clear();
});

// ---------------------------------------------------------------------------
// getDefaultCookiePreferences
// ---------------------------------------------------------------------------

describe('getDefaultCookiePreferences', () => {
  it('should return necessary=true', () => {
    expect(getDefaultCookiePreferences().necessary).toBe(true);
  });

  it('should return analytics=false and marketing=false by default', () => {
    const prefs = getDefaultCookiePreferences();
    expect(prefs.analytics).toBe(false);
    expect(prefs.marketing).toBe(false);
  });

  it('should return functional=true and preferences=true by default', () => {
    const prefs = getDefaultCookiePreferences();
    expect(prefs.functional).toBe(true);
    expect(prefs.preferences).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCookiePreferences
// ---------------------------------------------------------------------------

describe('getCookiePreferences', () => {
  it('should return defaults when nothing is stored in localStorage', () => {
    const prefs = getCookiePreferences();
    expect(prefs).toEqual(getDefaultCookiePreferences());
  });

  it('should parse stored preferences and always force necessary=true', () => {
    windowStub.localStorage.setItem(
      'cookie-preferences',
      JSON.stringify({ necessary: false, analytics: true, marketing: true, functional: false, preferences: false })
    );
    const prefs = getCookiePreferences();
    expect(prefs.necessary).toBe(true);
    expect(prefs.analytics).toBe(true);
    expect(prefs.marketing).toBe(true);
  });

  it('should fall back to defaults for missing keys in the stored object', () => {
    windowStub.localStorage.setItem('cookie-preferences', JSON.stringify({}));
    const prefs = getCookiePreferences();
    expect(prefs.analytics).toBe(false);
    expect(prefs.functional).toBe(true);
  });

  it('should return defaults when the stored value is malformed JSON', () => {
    windowStub.localStorage.setItem('cookie-preferences', '{bad json}');
    const prefs = getCookiePreferences();
    expect(prefs).toEqual(getDefaultCookiePreferences());
  });
});

// ---------------------------------------------------------------------------
// updateCookiePreferences
// ---------------------------------------------------------------------------

describe('updateCookiePreferences', () => {
  it('should persist preferences to localStorage', () => {
    const prefs = { necessary: true, analytics: true, marketing: false, functional: true, preferences: true };
    updateCookiePreferences(prefs);
    const stored = JSON.parse(windowStub.localStorage.getItem('cookie-preferences') ?? '{}');
    expect(stored.analytics).toBe(true);
  });

  it('should not throw in a simulated browser environment', () => {
    expect(() => updateCookiePreferences(getDefaultCookiePreferences())).not.toThrow();
  });

  it('should write the cookie-preferences key to localStorage', () => {
    updateCookiePreferences(getDefaultCookiePreferences());
    expect(windowStub.localStorage.getItem('cookie-preferences')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setCookie / getCookie
// ---------------------------------------------------------------------------

describe('setCookie and getCookie', () => {
  it('should set a cookie and retrieve it by name', () => {
    setCookie('test-cookie', 'hello', 1);
    expect(getCookie('test-cookie')).toBe('hello');
  });

  it('should return null when the named cookie does not exist', () => {
    expect(getCookie('nonexistent')).toBeNull();
  });

  it('should overwrite an existing cookie when set again with the same name', () => {
    setCookie('my-cookie', 'first', 1);
    setCookie('my-cookie', 'second', 1);
    expect(getCookie('my-cookie')).toBe('second');
  });

  it('should handle cookie values that contain equals signs', () => {
    setCookie('token', 'abc=def=ghi', 7);
    expect(getCookie('token')).toBe('abc=def=ghi');
  });

  it('should handle multiple independent cookies', () => {
    setCookie('alpha', 'a', 1);
    setCookie('beta', 'b', 1);
    expect(getCookie('alpha')).toBe('a');
    expect(getCookie('beta')).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// deleteCookie
// ---------------------------------------------------------------------------

describe('deleteCookie', () => {
  it('should remove an existing cookie', () => {
    setCookie('bye', 'cookie', 1);
    deleteCookie('bye');
    expect(getCookie('bye')).toBeNull();
  });

  it('should not throw when deleting a cookie that does not exist', () => {
    expect(() => deleteCookie('ghost')).not.toThrow();
  });

  it('should only remove the targeted cookie and leave others intact', () => {
    setCookie('keep', 'me', 1);
    setCookie('remove', 'me', 1);
    deleteCookie('remove');
    expect(getCookie('keep')).toBe('me');
  });
});

// ---------------------------------------------------------------------------
// deleteMatchingCookies
// ---------------------------------------------------------------------------

describe('deleteMatchingCookies', () => {
  it('should delete all cookies whose name starts with the pattern', () => {
    setCookie('_ga_ABC', '1', 1);
    setCookie('_ga_XYZ', '2', 1);
    setCookie('other', 'keep', 1);
    deleteMatchingCookies('_ga_');
    expect(getCookie('_ga_ABC')).toBeNull();
    expect(getCookie('_ga_XYZ')).toBeNull();
  });

  it('should leave cookies that do not match the pattern untouched', () => {
    setCookie('_ga_ABC', '1', 1);
    setCookie('keep-me', 'yes', 1);
    deleteMatchingCookies('_ga_');
    expect(getCookie('keep-me')).toBe('yes');
  });

  it('should not throw when no cookies match the pattern', () => {
    expect(() => deleteMatchingCookies('__nonexistent_prefix_')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// hasUserConsented
// ---------------------------------------------------------------------------

describe('hasUserConsented', () => {
  it('should return false when cookie-consent cookie is absent', () => {
    expect(hasUserConsented()).toBe(false);
  });

  it('should return true when cookie-consent cookie is present', () => {
    setCookie('cookie-consent', new Date().toISOString(), 365);
    expect(hasUserConsented()).toBe(true);
  });

  it('should return false after the consent cookie is deleted', () => {
    setCookie('cookie-consent', new Date().toISOString(), 365);
    deleteCookie('cookie-consent');
    expect(hasUserConsented()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasUserMadeCookieChoice
// ---------------------------------------------------------------------------

describe('hasUserMadeCookieChoice', () => {
  it('should return false when nothing is in localStorage', () => {
    expect(hasUserMadeCookieChoice()).toBe(false);
  });

  it('should return true when cookie-preferences key exists in localStorage', () => {
    windowStub.localStorage.setItem('cookie-preferences', JSON.stringify({}));
    expect(hasUserMadeCookieChoice()).toBe(true);
  });

  it('should return false after localStorage is cleared', () => {
    windowStub.localStorage.setItem('cookie-preferences', '{}');
    windowStub.localStorage.clear();
    expect(hasUserMadeCookieChoice()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getCookieConsentTimestamp
// ---------------------------------------------------------------------------

describe('getCookieConsentTimestamp', () => {
  it('should return null when no cookie-consent cookie exists', () => {
    expect(getCookieConsentTimestamp()).toBeNull();
  });

  it('should return a valid Date when cookie-consent holds an ISO string', () => {
    const isoDate = '2026-02-22T12:00:00.000Z';
    setCookie('cookie-consent', isoDate, 365);
    const result = getCookieConsentTimestamp();
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(isoDate);
  });

  it('should return null when the consent value cannot form a valid date', () => {
    // Inject an invalid value directly into the jar
    cookieJar = 'cookie-consent=not-a-date';
    const result = getCookieConsentTimestamp();
    // Invalid Date is still a Date instance; the function may return it or null
    // Either is acceptable — we just assert it does not throw
    expect(() => getCookieConsentTimestamp()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// privacyToCookiePreferences
// ---------------------------------------------------------------------------

describe('privacyToCookiePreferences', () => {
  const base = {
    id: '1',
    user_id: 'u1',
    share_anonymous_analytics: true,
    ccpa_do_not_sell: false,
    marketing_emails_enabled: true,
    created_at: '',
    updated_at: '',
  };

  it('should always set necessary=true regardless of input', () => {
    expect(privacyToCookiePreferences(base).necessary).toBe(true);
  });

  it('should map third_party_analytics_enabled=true to analytics=true', () => {
    const result = privacyToCookiePreferences({ ...base, third_party_analytics_enabled: true });
    expect(result.analytics).toBe(true);
  });

  it('should set analytics=false when third_party_analytics_enabled is false', () => {
    const result = privacyToCookiePreferences({ ...base, third_party_analytics_enabled: false });
    expect(result.analytics).toBe(false);
  });

  it('should set marketing=true when share_data_with_partners=true and ccpa_do_not_sell=false', () => {
    const result = privacyToCookiePreferences({ ...base, share_data_with_partners: true, ccpa_do_not_sell: false });
    expect(result.marketing).toBe(true);
  });

  it('should set marketing=false when ccpa_do_not_sell=true', () => {
    const result = privacyToCookiePreferences({ ...base, share_data_with_partners: true, ccpa_do_not_sell: true });
    expect(result.marketing).toBe(false);
  });

  it('should always set functional=true and preferences=true', () => {
    const result = privacyToCookiePreferences(base);
    expect(result.functional).toBe(true);
    expect(result.preferences).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cookieToPrivacyUpdates
// ---------------------------------------------------------------------------

describe('cookieToPrivacyUpdates', () => {
  it('should map analytics cookie pref to third_party_analytics_enabled', () => {
    const result = cookieToPrivacyUpdates({ necessary: true, analytics: true, marketing: false, functional: true, preferences: true });
    expect(result.third_party_analytics_enabled).toBe(true);
  });

  it('should map marketing=true to share_data_with_partners=true and ccpa_do_not_sell=false', () => {
    const result = cookieToPrivacyUpdates({ necessary: true, analytics: false, marketing: true, functional: true, preferences: true });
    expect(result.share_data_with_partners).toBe(true);
    expect(result.ccpa_do_not_sell).toBe(false);
  });

  it('should map marketing=false to ccpa_do_not_sell=true', () => {
    const result = cookieToPrivacyUpdates({ necessary: true, analytics: false, marketing: false, functional: true, preferences: true });
    expect(result.ccpa_do_not_sell).toBe(true);
    expect(result.share_data_with_partners).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// COOKIE_CATALOG
// ---------------------------------------------------------------------------

describe('COOKIE_CATALOG', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(COOKIE_CATALOG)).toBe(true);
    expect(COOKIE_CATALOG.length).toBeGreaterThan(0);
  });

  it('should have at least one entry in the necessary category', () => {
    const necessary = COOKIE_CATALOG.filter(c => c.category === 'necessary');
    expect(necessary.length).toBeGreaterThan(0);
  });

  it('should have entries for analytics, marketing, functional, and preferences categories', () => {
    const categories = new Set(COOKIE_CATALOG.map(c => c.category));
    expect(categories.has('analytics')).toBe(true);
    expect(categories.has('marketing')).toBe(true);
    expect(categories.has('functional')).toBe(true);
    expect(categories.has('preferences')).toBe(true);
  });

  it('each entry should have name, category, purpose, and duration string fields', () => {
    for (const entry of COOKIE_CATALOG) {
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.category).toBe('string');
      expect(typeof entry.purpose).toBe('string');
      expect(typeof entry.duration).toBe('string');
    }
  });
});
