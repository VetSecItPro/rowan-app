/**
 * Share Native Bridge
 *
 * Wraps @capacitor/share for native share sheets on iOS/Android.
 * Falls back to navigator.share (Web Share API) or clipboard copy on web.
 */

import { isNative } from './capacitor';

// Types from the plugin
type SharePlugin = typeof import('@capacitor/share').Share;

// Dynamic import to avoid bundling issues on web
let SharePlugin: SharePlugin | null = null;

async function getSharePlugin(): Promise<SharePlugin | null> {
  if (!isNative) return null;

  if (!SharePlugin) {
    const mod = await import('@capacitor/share');
    SharePlugin = mod.Share;
  }
  return SharePlugin;
}

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Check if sharing is available on this platform
 *
 * Returns true on native or if the Web Share API is supported.
 * Falls back to clipboard as a last resort (always available).
 */
export async function canShare(): Promise<boolean> {
  const plugin = await getSharePlugin();

  if (plugin) {
    try {
      const result = await plugin.canShare();
      return result.value;
    } catch {
      // Plugin check failed — fall through to web
    }
  }

  // Web Share API
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    return true;
  }

  // Clipboard fallback is always available in secure contexts
  if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
    return true;
  }

  return false;
}

/**
 * Share content using the native share sheet or web equivalent
 *
 * On native: opens the system share sheet.
 * On web with Web Share API: opens the browser share dialog.
 * On web without Web Share API: copies the URL or text to the clipboard.
 */
export async function shareContent(options: ShareOptions): Promise<void> {
  const plugin = await getSharePlugin();

  if (plugin) {
    try {
      await plugin.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle,
      });
      return;
    } catch (error) {
      // User cancelled or plugin error — fall through to web
      const err = error as Error;
      if (err.message?.includes('cancel')) {
        return; // User cancelled — not an error
      }
    }
  }

  // Web Share API fallback
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        return; // User cancelled — not an error
      }
      // Fall through to clipboard
    }
  }

  // Clipboard fallback — copy the URL or text
  if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
    const content = options.url || options.text || options.title || '';
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        // Clipboard access denied — silently fail
      }
    }
  }
}
