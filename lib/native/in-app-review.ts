/**
 * In-App Review Native Bridge
 *
 * Wraps @capacitor-community/in-app-review for prompting users to rate
 * the app via the native App Store / Google Play review dialog.
 * No-op on web since in-app review is native-only.
 */

import { isNative, isPluginAvailable } from './capacitor';

/**
 * Check if the in-app review dialog is available on this platform.
 * Returns false on web.
 */
export function isReviewAvailable(): boolean {
  return isNative && isPluginAvailable('InAppReview');
}

/**
 * Request the native in-app review dialog.
 *
 * Note: On both iOS and Android, the OS decides whether to actually show
 * the dialog. Calling this does not guarantee the user will see a prompt.
 * The OS rate-limits review requests to prevent abuse.
 *
 * No-op on web.
 */
export async function requestReview(): Promise<void> {
  if (!isReviewAvailable()) return;

  try {
    const { InAppReview } = await import(
      '@capacitor-community/in-app-review'
    );
    await InAppReview.requestReview();
  } catch {
    // Silently fail — review prompts are non-critical
  }
}
