/**
 * Camera Native Bridge
 *
 * Wraps @capacitor/camera for photo capture and image picking on iOS/Android.
 * Falls back to a file input element for picking images on web.
 * Returns null when camera access is unavailable.
 */

import { isNative, isPluginAvailable } from './capacitor';

// Types from the plugin
type CameraPlugin = typeof import('@capacitor/camera').Camera;
type CameraSource = import('@capacitor/camera').CameraSource;

// Dynamic import to avoid bundling issues on web
let CameraPlugin: CameraPlugin | null = null;
let CameraSourceEnum: typeof import('@capacitor/camera').CameraSource | null =
  null;

async function getCameraPlugin(): Promise<CameraPlugin | null> {
  if (!isNative) return null;

  if (!CameraPlugin) {
    const mod = await import('@capacitor/camera');
    CameraPlugin = mod.Camera;
    CameraSourceEnum = mod.CameraSource;
  }
  return CameraPlugin;
}

export interface CameraResult {
  dataUrl: string;
  path?: string;
}

export interface CameraPictureOptions {
  quality?: number;
  width?: number;
  height?: number;
  source?: 'camera' | 'photos' | 'prompt';
}

/**
 * Map our source string to the Capacitor CameraSource enum
 */
function mapSource(source: 'camera' | 'photos' | 'prompt'): CameraSource {
  if (!CameraSourceEnum) {
    // Fallback numeric values matching Capacitor's enum
    const map = { camera: 'CAMERA', photos: 'PHOTOS', prompt: 'PROMPT' };
    return map[source] as unknown as CameraSource;
  }

  switch (source) {
    case 'camera':
      return CameraSourceEnum.Camera;
    case 'photos':
      return CameraSourceEnum.Photos;
    case 'prompt':
      return CameraSourceEnum.Prompt;
  }
}

/**
 * Check if camera functionality is available
 *
 * On native: checks if the Camera plugin is registered.
 * On web: always returns true (file input fallback is always available).
 */
export function isCameraAvailable(): boolean {
  if (isNative) {
    return isPluginAvailable('Camera');
  }
  // Web file input fallback is always available
  return typeof document !== 'undefined';
}

/**
 * Take a picture or pick an image
 *
 * On native: opens the camera or photo library via Capacitor.
 * On web: opens a file picker for images.
 *
 * @returns The captured image as a data URL, or null if cancelled/unavailable.
 */
export async function takePicture(
  options?: CameraPictureOptions
): Promise<CameraResult | null> {
  const plugin = await getCameraPlugin();

  if (plugin) {
    try {
      const result = await plugin.getPhoto({
        quality: options?.quality ?? 90,
        allowEditing: false,
        resultType: (await import('@capacitor/camera')).CameraResultType.DataUrl,
        source: mapSource(options?.source ?? 'prompt'),
        width: options?.width,
        height: options?.height,
      });

      if (result.dataUrl) {
        return {
          dataUrl: result.dataUrl,
          path: result.path,
        };
      }

      return null;
    } catch {
      // User cancelled or camera error
      return null;
    }
  }

  // Web fallback — use file input
  return pickImageFromFileInput(options);
}

/**
 * Pick an image from the photo library
 *
 * Convenience wrapper around takePicture with source set to 'photos'.
 */
export async function pickImage(
  options?: Omit<CameraPictureOptions, 'source'>
): Promise<CameraResult | null> {
  return takePicture({ ...options, source: 'photos' });
}

/**
 * Web fallback: create a temporary file input to pick an image
 */
function pickImageFromFileInput(
  options?: CameraPictureOptions
): Promise<CameraResult | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    // If source is camera, attempt to use capture attribute
    if (options?.source === 'camera') {
      input.setAttribute('capture', 'environment');
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        if (typeof reader.result === 'string') {
          resolve({ dataUrl: reader.result });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => {
        cleanup();
        resolve(null);
      };
      reader.readAsDataURL(file);
    });

    // Handle cancel (user closes the file picker without selecting)
    input.addEventListener('cancel', () => {
      cleanup();
      resolve(null);
    });

    function cleanup() {
      input.remove();
    }

    document.body.appendChild(input);
    input.click();
  });
}
