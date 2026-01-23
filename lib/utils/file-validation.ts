/**
 * File Validation Utilities
 *
 * Security: Validates file types using magic bytes (file signatures)
 * to prevent malicious files disguised with fake extensions/MIME types.
 *
 * Magic bytes are the first few bytes of a file that identify its true format,
 * regardless of file extension or declared MIME type.
 */

// Magic byte signatures for common image formats
// Each entry: [signature bytes, offset, format name, MIME type]
const IMAGE_SIGNATURES: Array<{
  bytes: number[];
  offset: number;
  format: string;
  mime: string;
}> = [
  // JPEG: FF D8 FF
  { bytes: [0xFF, 0xD8, 0xFF], offset: 0, format: 'JPEG', mime: 'image/jpeg' },

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0, format: 'PNG', mime: 'image/png' },

  // GIF87a: 47 49 46 38 37 61
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0, format: 'GIF', mime: 'image/gif' },

  // GIF89a: 47 49 46 38 39 61
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0, format: 'GIF', mime: 'image/gif' },

  // WebP: RIFF....WEBP (52 49 46 46 at 0, 57 45 42 50 at 8)
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, format: 'WebP', mime: 'image/webp' },

  // BMP: 42 4D
  { bytes: [0x42, 0x4D], offset: 0, format: 'BMP', mime: 'image/bmp' },

  // ICO: 00 00 01 00
  { bytes: [0x00, 0x00, 0x01, 0x00], offset: 0, format: 'ICO', mime: 'image/x-icon' },

  // TIFF (little-endian): 49 49 2A 00
  { bytes: [0x49, 0x49, 0x2A, 0x00], offset: 0, format: 'TIFF', mime: 'image/tiff' },

  // TIFF (big-endian): 4D 4D 00 2A
  { bytes: [0x4D, 0x4D, 0x00, 0x2A], offset: 0, format: 'TIFF', mime: 'image/tiff' },

  // AVIF: ....ftypavif (66 74 79 70 61 76 69 66 at offset 4)
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], offset: 4, format: 'AVIF', mime: 'image/avif' },

  // HEIC: ....ftypheic or ftypmif1
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4, format: 'HEIC', mime: 'image/heic' },
  { bytes: [0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31], offset: 4, format: 'HEIC', mime: 'image/heif' },
];

// Additional WebP check (need to verify WEBP at offset 8)
const WEBP_SECONDARY_OFFSET = 8;
const WEBP_SECONDARY_BYTES = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

export interface FileValidationResult {
  valid: boolean;
  format?: string;
  detectedMime?: string;
  declaredMime?: string;
  error?: string;
}

/**
 * Validate an image file using magic bytes
 *
 * @param file - The File object to validate
 * @returns Validation result with detected format
 */
export async function validateImageMagicBytes(file: File): Promise<FileValidationResult> {
  try {
    // Read the first 16 bytes (enough for all our signatures)
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Minimum file size check
    if (bytes.length < 4) {
      return {
        valid: false,
        declaredMime: file.type,
        error: 'File too small to be a valid image',
      };
    }

    // Check against known image signatures
    for (const sig of IMAGE_SIGNATURES) {
      if (matchesSignature(bytes, sig.bytes, sig.offset)) {
        // Special case for WebP: verify secondary signature
        if (sig.format === 'WebP') {
          if (!matchesSignature(bytes, WEBP_SECONDARY_BYTES, WEBP_SECONDARY_OFFSET)) {
            continue; // Not actually WebP, try other signatures
          }
        }

        return {
          valid: true,
          format: sig.format,
          detectedMime: sig.mime,
          declaredMime: file.type,
        };
      }
    }

    // No valid image signature found
    return {
      valid: false,
      declaredMime: file.type,
      error: 'File does not have a valid image signature',
    };
  } catch {
    return {
      valid: false,
      declaredMime: file.type,
      error: 'Failed to read file for validation',
    };
  }
}

/**
 * Check if bytes match a signature at a given offset
 */
function matchesSignature(bytes: Uint8Array, signature: number[], offset: number): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Allowed image formats for different contexts
 */
export const ALLOWED_AVATAR_FORMATS = ['JPEG', 'PNG', 'WebP', 'GIF'];
export const ALLOWED_RECIPE_FORMATS = ['JPEG', 'PNG', 'WebP', 'GIF', 'AVIF', 'HEIC'];
export const ALLOWED_RECEIPT_FORMATS = ['JPEG', 'PNG', 'WebP', 'TIFF', 'BMP'];

/**
 * Validate that the detected format is in the allowed list
 */
export function isFormatAllowed(format: string, allowedFormats: string[]): boolean {
  return allowedFormats.includes(format);
}
