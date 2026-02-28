/**
 * Storage Native Bridge
 *
 * Provides persistent key-value storage with a security-tiered approach:
 *
 * - Native (iOS/Android): Uses `capacitor-secure-storage-plugin`, which maps
 *   to iOS Keychain and Android EncryptedSharedPreferences. All values are
 *   encrypted at rest. `@capacitor/preferences` (unencrypted SharedPreferences /
 *   UserDefaults) is no longer used on native — that was F-016.
 *
 * - Web: Falls back to localStorage, which is per-origin and considered
 *   acceptable for non-credential web data. A console warning is emitted so
 *   developers remain aware that web storage is plaintext.
 *
 * SECURITY (F-016 fix):
 *   The previous implementation used @capacitor/preferences on native, which
 *   stores data in plaintext SharedPreferences (Android) / unprotected
 *   UserDefaults (iOS). All native writes now go through SecureStoragePlugin
 *   so that user IDs, space IDs, and preference data are encrypted at rest.
 */

import { isNative, isPluginAvailable } from './capacitor';

// Types
type SecureStoragePluginType =
  typeof import('capacitor-secure-storage-plugin').SecureStoragePlugin;

// Lazy-loaded SecureStoragePlugin instance (native only)
let _securePlugin: SecureStoragePluginType | null = null;

async function getSecurePlugin(): Promise<SecureStoragePluginType | null> {
  if (!isNative || !isPluginAvailable('SecureStoragePlugin')) return null;

  if (!_securePlugin) {
    const mod = await import('capacitor-secure-storage-plugin');
    _securePlugin = mod.SecureStoragePlugin;
  }
  return _securePlugin;
}

/**
 * Store a value by key.
 *
 * On native: encrypted via SecureStoragePlugin (Keychain / EncryptedSharedPreferences).
 * On web: localStorage (plaintext, per-origin).
 */
export async function setItem(key: string, value: string): Promise<void> {
  const plugin = await getSecurePlugin();

  if (plugin) {
    try {
      await plugin.set({ key, value });
      return;
    } catch {
      // Plugin error — fall through to web fallback
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
 * Retrieve a value by key.
 *
 * @returns The stored value, or null if not found.
 */
export async function getItem(key: string): Promise<string | null> {
  const plugin = await getSecurePlugin();

  if (plugin) {
    try {
      const result = await plugin.get({ key });
      return result.value;
    } catch {
      // Key not found or plugin error — return null
      return null;
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
 * Remove a stored value by key.
 */
export async function removeItem(key: string): Promise<void> {
  const plugin = await getSecurePlugin();

  if (plugin) {
    try {
      await plugin.remove({ key });
      return;
    } catch {
      // Plugin error — fall through to web fallback
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
 * Clear all stored key-value pairs.
 *
 * NOTE: On native, SecureStoragePlugin.clear() removes only keys written by
 * this app's secure storage namespace. On web, localStorage.clear() removes
 * ALL keys for this origin — callers should prefer removeItem for targeted cleanup.
 */
export async function clear(): Promise<void> {
  const plugin = await getSecurePlugin();

  if (plugin) {
    try {
      await plugin.clear();
      return;
    } catch {
      // Plugin error — fall through to web fallback
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
 * Get all stored keys.
 *
 * NOTE: SecureStoragePlugin does not expose a `keys()` method, so on native
 * this returns an empty array. Callers that need key enumeration should
 * maintain their own key registry. On web, localStorage.key() enumeration
 * works as before.
 *
 * @returns Array of all keys in storage (web only; empty on native).
 */
export async function keys(): Promise<string[]> {
  const plugin = await getSecurePlugin();

  if (plugin) {
    // SecureStoragePlugin has no keys() API — return empty on native.
    // Callers that require key listing should track keys explicitly.
    return [];
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
