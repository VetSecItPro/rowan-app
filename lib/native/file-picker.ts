/**
 * File Picker Native Bridge
 *
 * Wraps @capawesome/capacitor-file-picker for selecting files on native
 * platforms with native file picker UI. Falls back to a hidden HTML
 * file input element on web.
 */

import { isNative, isPluginAvailable } from './capacitor';

// Dynamic import to avoid bundling the native plugin on web
type FilePickerPluginType =
  typeof import('@capawesome/capacitor-file-picker').FilePicker;

let FilePickerPlugin: FilePickerPluginType | null = null;

async function getPlugin(): Promise<FilePickerPluginType | null> {
  if (!isNative || !isPluginAvailable('FilePicker')) return null;

  if (!FilePickerPlugin) {
    const mod = await import('@capawesome/capacitor-file-picker');
    FilePickerPlugin = mod.FilePicker;
  }
  return FilePickerPlugin;
}

export interface PickedFile {
  /** File name with extension */
  name: string;
  /** Native file path (native only, undefined on web) */
  path?: string;
  /** Base64-encoded file data (may be undefined if path is provided) */
  data?: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Open the native file picker to select one or more files.
 * Returns null if the user cancels or an error occurs.
 *
 * @param options.types - MIME types to filter (e.g. ['application/pdf', 'image/*'])
 * @param options.multiple - Allow selecting multiple files
 */
export async function pickFile(
  options?: { types?: string[]; multiple?: boolean }
): Promise<PickedFile[] | null> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      const result = await plugin.pickFiles({
        types: options?.types,
        limit: options?.multiple ? 0 : 1,
        readData: true,
      });

      return result.files.map((file) => ({
        name: file.name,
        path: file.path,
        data: file.data,
        mimeType: file.mimeType,
        size: file.size,
      }));
    } catch {
      // User cancelled or plugin error
      return null;
    }
  }

  // Web fallback — use a hidden file input
  return pickFileFromInput(
    options?.types?.join(','),
    options?.multiple ?? false
  );
}

/**
 * Open the native file picker filtered to image types.
 * Returns null if the user cancels or an error occurs.
 *
 * @param options.multiple - Allow selecting multiple images
 */
export async function pickImages(
  options?: { multiple?: boolean }
): Promise<PickedFile[] | null> {
  const plugin = await getPlugin();

  if (plugin) {
    try {
      const result = await plugin.pickImages({
        limit: options?.multiple ? 0 : 1,
        readData: true,
      });

      return result.files.map((file) => ({
        name: file.name,
        path: file.path,
        data: file.data,
        mimeType: file.mimeType,
        size: file.size,
      }));
    } catch {
      // User cancelled or plugin error
      return null;
    }
  }

  // Web fallback — use a hidden file input with image accept
  return pickFileFromInput('image/*', options?.multiple ?? false);
}

// ---------- Web fallback helper ----------

/**
 * Create a temporary hidden file input, trigger the browser file dialog,
 * and resolve with the selected files.
 */
function pickFileFromInput(
  accept?: string,
  multiple?: boolean
): Promise<PickedFile[] | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;

    // Track whether a selection was made
    let resolved = false;

    input.addEventListener('change', async () => {
      resolved = true;
      const files = input.files;

      if (!files || files.length === 0) {
        cleanup();
        resolve(null);
        return;
      }

      const pickedFiles: PickedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await fileToBase64(file);
        pickedFiles.push({
          name: file.name,
          data,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }

      cleanup();
      resolve(pickedFiles);
    });

    // Handle cancel — focus returns to the window without a change event
    const handleFocus = () => {
      // Delay to allow the change event to fire first
      setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(null);
        }
      }, 300);
    };

    window.addEventListener('focus', handleFocus, { once: true });

    function cleanup() {
      input.remove();
      window.removeEventListener('focus', handleFocus);
    }

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Read a File object as a base64 string (without the data URL prefix).
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the "data:mime/type;base64," prefix
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
