/**
 * Unit tests for lib/utils/file-validation.ts
 *
 * Tests file validation utilities using magic bytes.
 */

import { describe, it, expect } from 'vitest';
import {
  validateImageMagicBytes,
  isFormatAllowed,
  ALLOWED_AVATAR_FORMATS,
  ALLOWED_RECIPE_FORMATS,
  ALLOWED_RECEIPT_FORMATS,
} from '@/lib/utils/file-validation';

// Helper to create File with specific magic bytes
function createFileWithBytes(bytes: number[], filename: string, mimeType: string = 'image/jpeg'): File {
  const buffer = new Uint8Array(bytes);
  const blob = new Blob([buffer], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

describe('validateImageMagicBytes', () => {
  it('should validate JPEG file', async () => {
    const jpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01];
    const file = createFileWithBytes(jpegBytes, 'test.jpg', 'image/jpeg');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('JPEG');
    expect(result.detectedMime).toBe('image/jpeg');
  });

  it('should validate PNG file', async () => {
    const pngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52];
    const file = createFileWithBytes(pngBytes, 'test.png', 'image/png');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('PNG');
    expect(result.detectedMime).toBe('image/png');
  });

  it('should validate GIF87a file', async () => {
    const gifBytes = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(gifBytes, 'test.gif', 'image/gif');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('GIF');
    expect(result.detectedMime).toBe('image/gif');
  });

  it('should validate GIF89a file', async () => {
    const gifBytes = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(gifBytes, 'test.gif', 'image/gif');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('GIF');
  });

  it('should validate WebP file', async () => {
    const webpBytes = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(webpBytes, 'test.webp', 'image/webp');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('WebP');
    expect(result.detectedMime).toBe('image/webp');
  });

  it('should validate BMP file', async () => {
    const bmpBytes = [0x42, 0x4D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(bmpBytes, 'test.bmp', 'image/bmp');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('BMP');
    expect(result.detectedMime).toBe('image/bmp');
  });

  it('should validate ICO file', async () => {
    const icoBytes = [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(icoBytes, 'test.ico', 'image/x-icon');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('ICO');
    expect(result.detectedMime).toBe('image/x-icon');
  });

  it('should validate TIFF little-endian file', async () => {
    const tiffBytes = [0x49, 0x49, 0x2A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(tiffBytes, 'test.tiff', 'image/tiff');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('TIFF');
    expect(result.detectedMime).toBe('image/tiff');
  });

  it('should validate TIFF big-endian file', async () => {
    const tiffBytes = [0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(tiffBytes, 'test.tiff', 'image/tiff');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('TIFF');
  });

  it('should validate AVIF file', async () => {
    const avifBytes = [0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(avifBytes, 'test.avif', 'image/avif');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('AVIF');
    expect(result.detectedMime).toBe('image/avif');
  });

  it('should validate HEIC file', async () => {
    const heicBytes = [0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(heicBytes, 'test.heic', 'image/heic');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe('HEIC');
    expect(result.detectedMime).toBe('image/heic');
  });

  it('should reject file with invalid magic bytes', async () => {
    const invalidBytes = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(invalidBytes, 'test.txt', 'text/plain');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File does not have a valid image signature');
  });

  it('should reject file that is too small', async () => {
    const tinyBytes = [0x00, 0x00];
    const file = createFileWithBytes(tinyBytes, 'tiny.jpg', 'image/jpeg');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File too small to be a valid image');
  });

  it('should reject WebP file with invalid secondary signature', async () => {
    // RIFF header but not WEBP signature at offset 8
    const fakeWebpBytes = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const file = createFileWithBytes(fakeWebpBytes, 'fake.webp', 'image/webp');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File does not have a valid image signature');
  });

  it('should include declared MIME type in result', async () => {
    const jpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01];
    const file = createFileWithBytes(jpegBytes, 'test.jpg', 'image/jpeg');

    const result = await validateImageMagicBytes(file);

    expect(result.declaredMime).toBe('image/jpeg');
  });

  it('should detect MIME type mismatch', async () => {
    // PNG bytes but declared as JPEG
    const pngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52];
    const file = createFileWithBytes(pngBytes, 'fake.jpg', 'image/jpeg');

    const result = await validateImageMagicBytes(file);

    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe('image/png');
    expect(result.declaredMime).toBe('image/jpeg');
  });
});

describe('isFormatAllowed', () => {
  it('should return true if format is in allowed list', () => {
    expect(isFormatAllowed('JPEG', ALLOWED_AVATAR_FORMATS)).toBe(true);
    expect(isFormatAllowed('PNG', ALLOWED_AVATAR_FORMATS)).toBe(true);
  });

  it('should return false if format is not in allowed list', () => {
    expect(isFormatAllowed('TIFF', ALLOWED_AVATAR_FORMATS)).toBe(false);
    expect(isFormatAllowed('BMP', ALLOWED_AVATAR_FORMATS)).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isFormatAllowed('jpeg', ALLOWED_AVATAR_FORMATS)).toBe(false);
    expect(isFormatAllowed('JPEG', ALLOWED_AVATAR_FORMATS)).toBe(true);
  });
});

describe('ALLOWED_*_FORMATS constants', () => {
  it('should define avatar formats', () => {
    expect(ALLOWED_AVATAR_FORMATS).toContain('JPEG');
    expect(ALLOWED_AVATAR_FORMATS).toContain('PNG');
    expect(ALLOWED_AVATAR_FORMATS).toContain('WebP');
    expect(ALLOWED_AVATAR_FORMATS).toContain('GIF');
  });

  it('should define recipe formats', () => {
    expect(ALLOWED_RECIPE_FORMATS).toContain('JPEG');
    expect(ALLOWED_RECIPE_FORMATS).toContain('PNG');
    expect(ALLOWED_RECIPE_FORMATS).toContain('WebP');
    expect(ALLOWED_RECIPE_FORMATS).toContain('AVIF');
    expect(ALLOWED_RECIPE_FORMATS).toContain('HEIC');
  });

  it('should define receipt formats', () => {
    expect(ALLOWED_RECEIPT_FORMATS).toContain('JPEG');
    expect(ALLOWED_RECEIPT_FORMATS).toContain('PNG');
    expect(ALLOWED_RECEIPT_FORMATS).toContain('TIFF');
    expect(ALLOWED_RECEIPT_FORMATS).toContain('BMP');
  });
});
