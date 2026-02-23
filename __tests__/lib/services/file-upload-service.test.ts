import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileUploadService } from '@/lib/services/file-upload-service';

// Mock Supabase client
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    refreshSession: vi.fn(),
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock DOM APIs
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 1920;
  height = 1080;
} as never;

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as never;

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn((callback) => callback(new Blob(['mock-image'], { type: 'image/jpeg' }))),
};

global.document = {
  createElement: vi.fn((tag) => {
    if (tag === 'canvas') return mockCanvas;
    if (tag === 'video') return {
      preload: '',
      onloadedmetadata: null,
      onerror: null,
      src: '',
      videoWidth: 1920,
      videoHeight: 1080,
      duration: 120,
    };
    return null;
  }),
} as never;

global.Audio = class {
  preload = '';
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  duration = 180;
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('file-upload-service', () => {
  describe('validateFile', () => {
    it('should reject files exceeding 50MB', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      const result = await fileUploadService.validateFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 50MB limit');
    });

    it('should reject disallowed MIME types', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

      const result = await fileUploadService.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should accept valid image files with magic bytes', async () => {
      // Create file with JPEG magic bytes (FFD8FF)
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' });

      const result = await fileUploadService.validateFile(file);

      expect(result.valid).toBe(true);
    });

    it('should accept valid PDF files with magic bytes', async () => {
      // Create file with PDF magic bytes (25504446)
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const file = new File([pdfBytes], 'doc.pdf', { type: 'application/pdf' });

      const result = await fileUploadService.validateFile(file);

      expect(result.valid).toBe(true);
    });
  });

  describe('getFileType', () => {
    it('should return "image" for image MIME types', () => {
      expect(fileUploadService.getFileType('image/jpeg')).toBe('image');
      expect(fileUploadService.getFileType('image/png')).toBe('image');
      expect(fileUploadService.getFileType('image/webp')).toBe('image');
    });

    it('should return "video" for video MIME types', () => {
      expect(fileUploadService.getFileType('video/mp4')).toBe('video');
      expect(fileUploadService.getFileType('video/webm')).toBe('video');
    });

    it('should return "audio" for audio MIME types', () => {
      expect(fileUploadService.getFileType('audio/mp4')).toBe('audio');
      expect(fileUploadService.getFileType('audio/mpeg')).toBe('audio');
    });

    it('should return "document" for document MIME types', () => {
      expect(fileUploadService.getFileType('application/pdf')).toBe('document');
      expect(fileUploadService.getFileType('text/plain')).toBe('document');
    });
  });

  // Note: DOM-dependent methods (generateImageThumbnail, getImageDimensions, getVideoMetadata, getAudioDuration)
  // require browser environment and are tested in E2E tests instead

  // Note: uploadFile method requires DOM APIs (Image, video, Audio) for metadata extraction
  // and is tested in E2E tests instead

  describe('uploadFile - error cases', () => {
    it('should throw error if authentication required', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({ data: {}, error: null });
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(fileUploadService.uploadFile(file, 'space-1', 'msg-1')).rejects.toThrow('Authentication required');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from storage and database', async () => {
      const mockAttachment = {
        id: 'attachment-1',
        storage_path: 'space-1/msg-1/test.jpg',
        thumbnail_path: 'space-1/msg-1/thumb-test.jpg',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAttachment, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      });

      const mockRemove = vi.fn().mockResolvedValue({ data: {}, error: null });
      mockSupabase.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      await fileUploadService.deleteFile('attachment-1');

      expect(mockRemove).toHaveBeenCalledWith([mockAttachment.storage_path, mockAttachment.thumbnail_path]);
    });

    it('should throw error if attachment not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      await expect(fileUploadService.deleteFile('invalid-id')).rejects.toThrow('Attachment not found');
    });
  });
});
