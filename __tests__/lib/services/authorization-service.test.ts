import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserSpaceMember, verifySpaceAccess, verifyResourceAccess } from '@/lib/services/authorization-service';

// Mock Supabase using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  };

  const mockCreateClient = vi.fn(async () => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

describe('authorization-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isUserSpaceMember', () => {
    it('should return true when user is a member', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'user-123' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await isUserSpaceMember('user-123', 'space-456');
      expect(result).toBe(true);
    });

    it('should return false when user is not a member', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            })),
          })),
        })),
      });

      const result = await isUserSpaceMember('user-123', 'space-456');
      expect(result).toBe(false);
    });

    it('should return false when database error occurs', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockRejectedValue(new Error('Database error')),
            })),
          })),
        })),
      });

      const result = await isUserSpaceMember('user-123', 'space-456');
      expect(result).toBe(false);
    });

    it('should return false when data is missing', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await isUserSpaceMember('user-123', 'space-456');
      expect(result).toBe(false);
    });
  });

  describe('verifySpaceAccess', () => {
    it('should not throw when user has access', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'user-123' },
                error: null,
              }),
            })),
          })),
        })),
      });

      await expect(verifySpaceAccess('user-123', 'space-456')).resolves.not.toThrow();
    });

    it('should throw when user does not have access', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            })),
          })),
        })),
      });

      await expect(verifySpaceAccess('user-123', 'space-456'))
        .rejects.toThrow('Unauthorized: You do not have access to this space');
    });
  });

  describe('verifyResourceAccess', () => {
    it('should not throw when resource exists and user has access', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { user_id: 'user-123' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const resource = { space_id: 'space-456' };
      await expect(verifyResourceAccess('user-123', resource)).resolves.not.toThrow();
    });

    it('should throw when resource is null', async () => {
      await expect(verifyResourceAccess('user-123', null))
        .rejects.toThrow('Resource not found');
    });

    it('should throw when user does not have access to resource space', async () => {
      const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            })),
          })),
        })),
      });

      const resource = { space_id: 'space-456' };
      await expect(verifyResourceAccess('user-123', resource))
        .rejects.toThrow('Unauthorized: You do not have access to this space');
    });
  });
});
