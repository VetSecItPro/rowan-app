import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadFile,
  deleteFile,
  uploadAvatar,
  uploadRecipeImage,
  getSpaceStorageUsage,
  checkStorageQuota,
} from '@/lib/services/storage-service';

// Persistent bucket mock — same object returned every time storage.from() is called
const mockBucket = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
}));

const mockSupabaseClient = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chainable.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chainable.rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chainable.storage = {
    from: vi.fn(() => mockBucket),
  };
  return chainable;
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/config/feature-limits', () => ({
  FEATURE_LIMITS: {
    free: { storageGB: 0.5 },
    pro: { storageGB: 5 },
    family: { storageGB: 20 },
  },
}));

vi.mock('@/lib/utils/format', () => ({
  formatBytes: vi.fn((bytes: number) => `${bytes} B`),
}));

describe('storage-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable defaults
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
    // Reset bucket mocks
    mockBucket.upload.mockResolvedValue({ data: null, error: null });
    mockBucket.remove.mockResolvedValue({ error: null });
    mockBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/file.jpg' } });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      mockBucket.upload.mockResolvedValueOnce({
        data: { path: 'user1/12345-test.jpg' },
        error: null,
      });

      const result = await uploadFile('avatars', file, 'user1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.url).toBe('https://example.com/file.jpg');
        expect(result.path).toBe('user1/12345-test.jpg');
      }
    });

    it('should reject file that exceeds size limit', async () => {
      const largeFile = new File([new Array(10 * 1024 * 1024).join('x')], 'large.jpg', {
        type: 'image/jpeg',
      });

      const result = await uploadFile('avatars', largeFile, 'user1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('exceeds');
      }
    });

    it('should reject invalid file type', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = await uploadFile('avatars', file, 'user1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not allowed');
      }
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockBucket.remove.mockResolvedValueOnce({ error: null });

      const result = await deleteFile('avatars', 'user1/file.jpg');

      expect(result.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockBucket.remove.mockResolvedValueOnce({ error: new Error('Delete failed') });

      const result = await deleteFile('avatars', 'user1/file.jpg');

      expect(result.success).toBe(false);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and update user profile', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

      // 1. Get current avatar: .from('users').select('avatar_url').eq('id', userId).single()
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { avatar_url: null }, error: null });

      // 2. uploadFile internally: storage.from('avatars').upload(...)
      mockBucket.upload.mockResolvedValueOnce({
        data: { path: 'user1/avatar.jpg' },
        error: null,
      });

      // 3. Update user profile: .from('users').update({...}).eq('id', userId)
      // Use a separate chain for the update so eq.mockResolvedValueOnce doesn't consume the first eq
      mockSupabaseClient.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await uploadAvatar(file, 'user1');

      expect(result.success).toBe(true);
    });
  });

  describe('uploadRecipeImage', () => {
    it('should upload recipe image successfully', async () => {
      const file = new File(['content'], 'recipe.jpg', { type: 'image/jpeg' });

      mockBucket.upload.mockResolvedValueOnce({
        data: { path: 'user1/recipe.jpg' },
        error: null,
      });

      const result = await uploadRecipeImage(file, 'user1');

      expect(result.success).toBe(true);
    });
  });

  describe('getSpaceStorageUsage', () => {
    it('should return storage usage', async () => {
      // .from('storage_usage').select(...).eq('space_id', spaceId).single()
      // Use eq.mockReturnValueOnce to route to a specific single mock
      mockSupabaseClient.eq.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: {
            total_bytes: 1000,
            file_count: 5,
            storage_limit_bytes: 5000,
            last_calculated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const result = await getSpaceStorageUsage('space1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalBytes).toBe(1000);
        expect(result.data.fileCount).toBe(5);
      }
    });
  });

  describe('checkStorageQuota', () => {
    it('should check if upload is allowed', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [
          {
            allowed: true,
            current_bytes: 1000,
            limit_bytes: 5000,
            available_bytes: 4000,
            percentage_used: 20,
          },
        ],
        error: null,
      });

      const result = await checkStorageQuota('space1', 500);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowed).toBe(true);
      }
    });
  });
});
