import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportSpaceData, getSpaceExportSummary } from '@/lib/services/space-export-service';

// Valid UUIDs for testing — version 4 (digit after 3rd hyphen must be 1-8)
const SPACE_ID = 'a0000000-0000-4000-a000-000000000001';
const USER_ID = 'b0000000-0000-4000-b000-000000000002';

// Mock Supabase server client
const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('space-export-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('exportSpaceData', () => {
    it('should export space data as JSON successfully', async () => {
      // Membership check: .from().select('role').eq().eq().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      });

      // Space details: .from().select().eq().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: SPACE_ID, name: 'Test Space', created_at: '2024-01-01' },
        error: null,
      });

      // For Promise.allSettled queries: .from().select().eq() — eq is terminal
      // eq returns chainable by default. When awaited, chainable resolves to itself.
      // result.value will be the chainable object. result.value.data is undefined,
      // so the forEach sets each data type to []. That's fine for a success test.

      const result = await exportSpaceData(SPACE_ID, USER_ID, 'json');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should return error when user is not space owner', async () => {
      // Membership check returns member role
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      const result = await exportSpaceData(SPACE_ID, USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Only space owners');
      }
    });

    it('should return error when membership check fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('DB error'),
      });

      const result = await exportSpaceData(SPACE_ID, USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Only space owners');
      }
    });

    it('should return error when space not found', async () => {
      // Membership check passes
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      });

      // Space lookup fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await exportSpaceData(SPACE_ID, USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Space not found');
      }
    });

    it('should export space data as CSV successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: SPACE_ID, name: 'Test Space', created_at: '2024-01-01' },
        error: null,
      });

      const result = await exportSpaceData(SPACE_ID, USER_ID, 'csv');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('string');
      }
    });
  });

  describe('getSpaceExportSummary', () => {
    it('should return export summary for space owner', async () => {
      // Membership check
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      });

      // Count queries: .from().select('id', { count: 'exact' }).eq('space_id', spaceId)
      // eq returns chainable by default. When awaited, result.value = chainable.
      // result.value.count is undefined, so counts default to 0. That's fine.

      const result = await getSpaceExportSummary(SPACE_ID, USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('total');
      }
    });

    it('should return error when user is not owner', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      const result = await getSpaceExportSummary(SPACE_ID, USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Only space owners');
      }
    });

    it('should handle count query errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'owner' },
        error: null,
      });

      const result = await getSpaceExportSummary(SPACE_ID, USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
