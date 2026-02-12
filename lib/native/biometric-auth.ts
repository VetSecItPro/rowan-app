/**
 * Biometric Authentication Native Bridge
 *
 * Wraps @aparajita/capacitor-biometric-auth for Face ID, Touch ID,
 * and fingerprint authentication on iOS/Android.
 * Returns safe defaults on web (not available, authentication fails).
 */

import { isNative } from './capacitor';

// Types from the plugin
type BiometricAuthPlugin =
  typeof import('@aparajita/capacitor-biometric-auth').BiometricAuth;

// Dynamic import to avoid bundling issues on web
let BiometricAuthPlugin: BiometricAuthPlugin | null = null;

async function getBiometricPlugin(): Promise<BiometricAuthPlugin | null> {
  if (!isNative) return null;

  if (!BiometricAuthPlugin) {
    const mod = await import('@aparajita/capacitor-biometric-auth');
    BiometricAuthPlugin = mod.BiometricAuth;
  }
  return BiometricAuthPlugin;
}

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

/**
 * Check if biometric authentication is available on this device
 *
 * On native: checks for enrolled biometrics (Face ID, Touch ID, fingerprint).
 * On web: always returns false.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const plugin = await getBiometricPlugin();
  if (!plugin) return false;

  try {
    const result = await plugin.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/**
 * Get the type of biometric authentication available
 *
 * @returns 'face' for Face ID, 'fingerprint' for Touch ID / fingerprint,
 *          'iris' for iris scanning, or 'none' if unavailable.
 */
export async function getBiometricType(): Promise<BiometricType> {
  const plugin = await getBiometricPlugin();
  if (!plugin) return 'none';

  try {
    const result = await plugin.checkBiometry();

    if (!result.isAvailable) return 'none';

    // The biometryType field uses numeric enum values from the plugin.
    // Map them to our string union type.
    // BiometryType enum: 0 = none, 1 = touchId, 2 = faceId, 3 = fingerprintAuthentication, 4 = irisAuthentication
    const biometryType = result.biometryType;

    switch (biometryType) {
      case 1: // touchId
        return 'fingerprint';
      case 2: // faceId
        return 'face';
      case 3: // fingerprintAuthentication (Android)
        return 'fingerprint';
      case 4: // irisAuthentication
        return 'iris';
      default:
        return 'none';
    }
  } catch {
    return 'none';
  }
}

/**
 * Authenticate the user with biometrics
 *
 * Displays the system biometric prompt (Face ID, Touch ID, etc.).
 *
 * @param reason - The reason string shown in the biometric prompt.
 * @returns true if authentication succeeded, false otherwise.
 */
export async function authenticate(reason?: string): Promise<boolean> {
  const plugin = await getBiometricPlugin();
  if (!plugin) return false;

  try {
    await plugin.authenticate({
      reason: reason ?? 'Please authenticate to continue',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
    });

    // If authenticate() resolves without throwing, authentication succeeded
    return true;
  } catch {
    // User cancelled or authentication failed
    return false;
  }
}
