/**
 * App Badge Native Bridge
 *
 * Wraps @capawesome/capacitor-badge for managing the app icon badge count
 * on iOS and Android. No-op on web since badge counts are native-only.
 */

import { isNative, isPluginAvailable } from './capacitor';

// Dynamic import to avoid bundling the native plugin on web
type BadgePluginType = typeof import('@capawesome/capacitor-badge').Badge;

let BadgePlugin: BadgePluginType | null = null;

async function getPlugin(): Promise<BadgePluginType | null> {
  if (!isNative || !isPluginAvailable('Badge')) return null;

  if (!BadgePlugin) {
    const mod = await import('@capawesome/capacitor-badge');
    BadgePlugin = mod.Badge;
  }
  return BadgePlugin;
}

/**
 * Check if badge management is supported on the current platform.
 * Returns false on web.
 */
export async function isBadgeSupported(): Promise<boolean> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      const result = await plugin.isSupported();
      return result.isSupported;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Set the app icon badge count.
 * No-op on web.
 */
export async function setBadgeCount(count: number): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    await plugin.set({ count });
  } catch {
    // Silently fail — badge is non-critical
  }
}

/**
 * Get the current app icon badge count.
 * Returns 0 on web.
 */
export async function getBadgeCount(): Promise<number> {
  const plugin = await getPlugin();
  if (!plugin) return 0;

  try {
    const result = await plugin.get();
    return result.count;
  } catch {
    return 0;
  }
}

/**
 * Clear the app icon badge (set count to 0).
 * No-op on web.
 */
export async function clearBadge(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    await plugin.clear();
  } catch {
    // Silently fail — badge is non-critical
  }
}
