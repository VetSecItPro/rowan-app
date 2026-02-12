/**
 * Storage Native Bridge
 *
 * Wraps @capacitor/preferences for persistent key-value storage on iOS/Android.
 * Falls back to localStorage when running in a web browser.
 */

import { isNative } from './capacitor';

// Types from the plugin
type PreferencesPlugin = typeof import('@capacitor/preferences').Preferences;

// Dynamic import to avoid bundling issues on web
let PreferencesPlugin: PreferencesPlugin | null = null;

async function getPreferencesPlugin(): Promise<PreferencesPlugin | null> {
  if (!isNative) return null;

  if (!PreferencesPlugin) {
    const mod = await import('@capacitor/preferences');
    PreferencesPlugin = mod.Preferences;
  }
  return PreferencesPlugin;
}

/**
 * Store a value by key
 *
 * On native: uses Capacitor Preferences (SharedPreferences / UserDefaults).
 * On web: uses localStorage.
 */
export async function setItem(key: string, value: string): Promise<void> {
  const plugin = await getPreferencesPlugin();

  if (plugin) {
    try {
      await plugin.set({ key, value });
      return;
    } catch {
      // Plugin error — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }
}

/**
 * Retrieve a value by key
 *
 * @returns The stored value, or null if not found.
 */
export async function getItem(key: string): Promise<string | null> {
  const plugin = await getPreferencesPlugin();

  if (plugin) {
    try {
      const result = await plugin.get({ key });
      return result.value;
    } catch {
      // Plugin error — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Remove a stored value by key
 */
export async function removeItem(key: string): Promise<void> {
  const plugin = await getPreferencesPlugin();

  if (plugin) {
    try {
      await plugin.remove({ key });
      return;
    } catch {
      // Plugin error — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  }
}

/**
 * Clear all stored key-value pairs
 */
export async function clear(): Promise<void> {
  const plugin = await getPreferencesPlugin();

  if (plugin) {
    try {
      await plugin.clear();
      return;
    } catch {
      // Plugin error — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
    } catch {
      // Silently fail
    }
  }
}

/**
 * Get all stored keys
 *
 * @returns Array of all keys in storage.
 */
export async function keys(): Promise<string[]> {
  const plugin = await getPreferencesPlugin();

  if (plugin) {
    try {
      const result = await plugin.keys();
      return result.keys;
    } catch {
      // Plugin error — fall through to web
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          allKeys.push(key);
        }
      }
      return allKeys;
    } catch {
      return [];
    }
  }

  return [];
}
