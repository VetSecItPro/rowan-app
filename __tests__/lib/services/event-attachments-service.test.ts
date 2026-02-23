import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client with storage support
const mockStorageOps = {
  upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
  remove: vi.fn(() => Promise.resolve({ error: null })),
  createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://example.com/signed-url' }, error: null })),
  download: vi.fn(() => Promise.resolve({ data: new Blob(['test']), error: null })),
};

const mockSupabase = vi.hoisted(() => {
  const chain = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return {
    ...chain,
    storage: {
      from: vi.fn(() => mockStorageOps),
    },
  };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase as unknown as SupabaseClient),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { eventAttachmentsService } from '@/lib/services/event-attachments-service';
import type { EventAttachment, UploadAttachmentInput } from '@/lib/services/event-attachments-service';

describe('eventAttachmentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset storage mocks to default behavior
    mockStorageOps.upload.mockResolvedValue({ data: { path: 'test-path' }, error: null });
    mockStorageOps.remove.mockResolvedValue({ error: null });
    mockStorageOps.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-url' }, error: null });
    mockStorageOps.download.mockResolvedValue({ data: new Blob(['test']), error: null });
  });

  describe('uploadAttachment', () => {
    const validInput: UploadAttachmentInput = {
      event_id: 'event-123',
      space_id: 'space-456',
      file: new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
    };

    it('should upload valid PDF file', async () => {
      const mockAttachment: EventAttachment = {
        id: 'attach-1',
        event_id: 'event-123',
        file_name: 'test.pdf',
        file_size: 12,
        mime_type: 'application/pdf',
        storage_path: 'events/event-123/12345-uuid.pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      mockStorageOps.upload.mockResolvedValueOnce({ data: { path: 'test-path' }, error: null });
      mockSupabase.insert.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: mockAttachment, error: null });

      const result = await eventAttachmentsService.uploadAttachment(validInput);

      expect(result).toBeDefined();
      expect(result.file_name).toBe('test.pdf');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('event-attachments');
    });

    it('should reject invalid file type', async () => {
      const invalidInput: UploadAttachmentInput = {
        event_id: 'event-123',
        space_id: 'space-456',
        file: new File(['<script>alert("xss")</script>'], 'malicious.html', { type: 'text/html' }),
      };

      await expect(eventAttachmentsService.uploadAttachment(invalidInput)).rejects.toThrow('not allowed');
    });

    it('should reject file exceeding size limit', async () => {
      const largeFile = new File([new Array(11 * 1024 * 1024).join('x')], 'large.pdf', { type: 'application/pdf' });
      const invalidInput: UploadAttachmentInput = {
        event_id: 'event-123',
        space_id: 'space-456',
        file: largeFile,
      };

      await expect(eventAttachmentsService.uploadAttachment(invalidInput)).rejects.toThrow('exceeds maximum');
    });

    it('should clean up storage on database insert failure', async () => {
      mockStorageOps.upload.mockResolvedValueOnce({ data: { path: 'test-path' }, error: null });
      mockSupabase.insert.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(eventAttachmentsService.uploadAttachment(validInput)).rejects.toThrow();
      expect(mockStorageOps.remove).toHaveBeenCalled();
    });

    it('should accept image files', async () => {
      const imageInput: UploadAttachmentInput = {
        event_id: 'event-123',
        space_id: 'space-456',
        file: new File(['image data'], 'photo.jpg', { type: 'image/jpeg' }),
      };

      const mockAttachment: EventAttachment = {
        id: 'attach-2',
        event_id: 'event-123',
        file_name: 'photo.jpg',
        file_size: 10,
        mime_type: 'image/jpeg',
        storage_path: 'events/event-123/12345-uuid.jpg',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      mockStorageOps.upload.mockResolvedValueOnce({ data: { path: 'test-path' }, error: null });
      mockSupabase.insert.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: mockAttachment, error: null });

      const result = await eventAttachmentsService.uploadAttachment(imageInput);

      expect(result.mime_type).toBe('image/jpeg');
    });
  });

  describe('getAttachments', () => {
    it('should fetch all attachments for an event', async () => {
      const mockAttachments: EventAttachment[] = [
        {
          id: 'attach-1',
          event_id: 'event-123',
          file_name: 'file1.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          storage_path: 'events/event-123/file1.pdf',
          uploaded_by: 'user-1',
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({ data: mockAttachments, error: null });

      const result = await eventAttachmentsService.getAttachments('event-123');

      expect(result).toHaveLength(1);
      expect(result[0].file_name).toBe('file1.pdf');
    });

    it('should return empty array when no attachments', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await eventAttachmentsService.getAttachments('event-123');

      expect(result).toEqual([]);
    });

    it('should throw on database error', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(eventAttachmentsService.getAttachments('event-123')).rejects.toThrow();
    });
  });

  describe('getAttachmentUrl', () => {
    it('should generate signed URL for attachment', async () => {
      const attachment: EventAttachment = {
        id: 'attach-1',
        event_id: 'event-123',
        file_name: 'file.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        storage_path: 'events/event-123/file.pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      const url = await eventAttachmentsService.getAttachmentUrl(attachment);

      expect(url).toBe('https://example.com/signed-url');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('event-attachments');
    });

    it('should throw on storage error', async () => {
      const attachment: EventAttachment = {
        id: 'attach-1',
        event_id: 'event-123',
        file_name: 'file.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        storage_path: 'events/event-123/file.pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      mockStorageOps.createSignedUrl.mockResolvedValueOnce({ data: null, error: new Error('Storage error') });

      await expect(eventAttachmentsService.getAttachmentUrl(attachment)).rejects.toThrow();
    });
  });

  describe('downloadAttachment', () => {
    it('should download attachment as Blob', async () => {
      const attachment: EventAttachment = {
        id: 'attach-1',
        event_id: 'event-123',
        file_name: 'file.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        storage_path: 'events/event-123/file.pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      const result = await eventAttachmentsService.downloadAttachment(attachment);

      expect(result).toBeInstanceOf(Blob);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('event-attachments');
    });

    it('should throw when file not found', async () => {
      const attachment: EventAttachment = {
        id: 'attach-1',
        event_id: 'event-123',
        file_name: 'file.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        storage_path: 'events/event-123/file.pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      mockStorageOps.download.mockResolvedValueOnce({ data: null, error: null });

      await expect(eventAttachmentsService.downloadAttachment(attachment)).rejects.toThrow('File not found');
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment from database and storage', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: { storage_path: 'events/event-123/file.pdf' }, error: null });
      mockSupabase.delete.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await eventAttachmentsService.deleteAttachment('attach-1');

      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockStorageOps.remove).toHaveBeenCalledWith(['events/event-123/file.pdf']);
    });

    it('should throw when attachment not found', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(eventAttachmentsService.deleteAttachment('attach-1')).rejects.toThrow('Attachment not found');
    });
  });

  describe('getAttachmentCount', () => {
    it('should return count of attachments', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ count: 3, error: null });

      const result = await eventAttachmentsService.getAttachmentCount('event-123');

      expect(result).toBe(3);
    });

    it('should return 0 when no attachments', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ count: 0, error: null });

      const result = await eventAttachmentsService.getAttachmentCount('event-123');

      expect(result).toBe(0);
    });

    it('should throw on database error', async () => {
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ count: null, error: new Error('DB error') });

      await expect(eventAttachmentsService.getAttachmentCount('event-123')).rejects.toThrow();
    });
  });
});
