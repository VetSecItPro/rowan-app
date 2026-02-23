import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskAttachmentsService } from '@/lib/services/task-attachments-service';

// Persistent bucket mock — same object returned every time storage.from() is called
const mockBucket = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.pdf' } })),
}));

const mockSupabaseClient = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chainable.storage = {
    from: vi.fn(() => mockBucket),
  };
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('taskAttachmentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable defaults
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.order.mockResolvedValue({ data: [], error: null });
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
    // Reset bucket mocks
    mockBucket.upload.mockResolvedValue({ error: null });
    mockBucket.remove.mockResolvedValue({ error: null });
    mockBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } });
  });

  describe('uploadAttachment', () => {
    it('should upload file and create record', async () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });

      mockBucket.upload.mockResolvedValueOnce({ error: null });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'attachment1', file_name: 'document.pdf' },
        error: null,
      });

      const result = await taskAttachmentsService.uploadAttachment('task1', file, 'user1');

      expect(result.file_name).toBe('document.pdf');
    });

    it('should throw on upload error', async () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });

      mockBucket.upload.mockResolvedValueOnce({ error: new Error('Upload failed') });

      await expect(
        taskAttachmentsService.uploadAttachment('task1', file, 'user1')
      ).rejects.toThrow();
    });
  });

  describe('getAttachments', () => {
    it('should return attachments for task', async () => {
      // .from('task_attachments').select(...).eq('task_id', taskId).order(...)
      mockSupabaseClient.order.mockResolvedValueOnce({
        data: [{ id: 'attachment1', task_id: 'task1' }],
        error: null,
      });

      const result = await taskAttachmentsService.getAttachments('task1');

      expect(result).toHaveLength(1);
    });
  });

  describe('getAttachmentUrl', () => {
    it('should return public URL for file', async () => {
      const url = await taskAttachmentsService.getAttachmentUrl('path/to/file.pdf');

      expect(url).toBe('https://example.com/file.pdf');
    });
  });

  describe('deleteAttachment', () => {
    it('should delete file and record', async () => {
      // 1. Fetch attachment: .from('task_attachments').select('storage_path').eq('id', attachmentId).single()
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { storage_path: 'path/to/file.pdf' },
        error: null,
      });

      // 2. Remove from storage: storage.from('task-attachments').remove([path])
      mockBucket.remove.mockResolvedValueOnce({ error: null });

      // 3. Delete record: .from('task_attachments').delete().eq('id', attachmentId)
      // Use a separate chain for delete so eq.mockResolvedValueOnce doesn't consume the first eq
      mockSupabaseClient.delete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await expect(
        taskAttachmentsService.deleteAttachment('attachment1')
      ).resolves.toBeUndefined();
    });
  });
});
