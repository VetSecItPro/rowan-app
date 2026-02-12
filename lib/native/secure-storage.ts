/**
 * Secure Storage Native Bridge
 *
 * Wraps capacitor-secure-storage-plugin for encrypted key-value storage
 * on native platforms (iOS Keychain / Android EncryptedSharedPreferences).
 * Falls back to localStorage on web with a warning about non-secure storage.
 */

import { isNative, isPluginAvailable } from './capacitor';

// Dynamic import to avoid bundling the native plugin on web
type SecureStoragePluginType =
  typeof import('capacitor-secure-storage-plugin').SecureStoragePlugin;

let SecureStoragePlugin: SecureStoragePluginType | null = null;

async function getPlugin(): Promise<SecureStoragePluginType | null> {
  if (!isNative || !isPluginAvailable('SecureStoragePlugin')) return null;

  if (!SecureStoragePlugin) {
    const mod = await import('capacitor-secure-storage-plugin');
    SecureStoragePlugin = mod.SecureStoragePlugin;
  }
  return SecureStoragePlugin;
}

/**
 * Store a value securely.
 * Native: encrypted keychain/keystore. Web: localStorage (with warning).
 */
export async function secureSet(key: string, value: string): Promise<void> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      await plugin.set({ key, value });
      return;
    } catch {
      // Fall through to web fallback
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    console.warn(
      '[SecureStorage] Using localStorage — data is NOT encrypted. Use native builds for secure storage.'
    );
    localStorage.setItem(key, value);
  }
}

/**
 * Retrieve a securely stored value.
 * Returns null if the key does not exist.
 */
export async function secureGet(key: string): Promise<string | null> {
  const plugin = await getPlugin();

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
    console.warn(
      '[SecureStorage] Reading from localStorage — data is NOT encrypted.'
    );
    return localStorage.getItem(key);
  }

  return null;
}

/**
 * Remove a single key from secure storage.
 */
export async function secureRemove(key: string): Promise<void> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      await plugin.remove({ key });
      return;
    } catch {
      // Fall through to web fallback
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/**
 * Clear all entries from secure storage.
 */
export async function secureClear(): Promise<void> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      await plugin.clear();
      return;
    } catch {
      // Fall through to web fallback
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    console.warn(
      '[SecureStorage] Clearing localStorage — this removes ALL localStorage entries, not just secure storage.'
    );
    localStorage.clear();
  }
}
