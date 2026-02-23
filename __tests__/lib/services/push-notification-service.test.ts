import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPushToken, unregisterPushToken, getActiveTokensForUsers } from '@/lib/services/push-notification-service';

const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('push-notification-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.in.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('registerPushToken', () => {
    it('should register a new push token', async () => {
      const mockToken = { id: 'token-1', user_id: 'user-1', token: 'abc123', platform: 'ios' };

      // Check existing token: .from('push_tokens').select('id').eq('user_id').eq('token').single()
      // Returns null (no existing token)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Insert new token: .from('push_tokens').insert({...}).select('id').single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockToken, error: null });

      const result = await registerPushToken('user-1', 'space-1', {
        token: 'abc123',
        platform: 'ios',
      });

      expect(result.success).toBe(true);
      expect(result.tokenId).toBe('token-1');
    });

    it('should update existing token', async () => {
      // Check existing token returns a result: .select('id').eq('user_id').eq('token').single()
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'token-1' }, error: null });

      // update({...}).eq('id', existingToken.id) — use separate chain so eq.mockResolvedValueOnce
      // doesn't get consumed by the check chain's eq calls
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await registerPushToken('user-1', 'space-1', {
        token: 'abc123',
        platform: 'ios',
      });

      expect(result.success).toBe(true);
    });

    it('should handle validation errors', async () => {
      const result = await registerPushToken('user-1', 'space-1', {
        token: '',
        platform: 'ios',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('unregisterPushToken', () => {
    it('should unregister a token', async () => {
      // .from('push_tokens').update({...}).eq('user_id', userId).eq('token', token)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase); // first eq returns chainable
      mockSupabase.eq.mockResolvedValueOnce({ error: null }); // second eq resolves

      const result = await unregisterPushToken('user-1', 'abc123');
      expect(result.success).toBe(true);
    });
  });

  describe('getActiveTokensForUsers', () => {
    it('should fetch active tokens', async () => {
      const mockTokens = [{ id: '1', token: 'abc', platform: 'ios', is_active: true }];
      // .from('push_tokens').select(...).in('user_id', userIds).eq('space_id', spaceId).eq('is_active', true)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase); // first eq
      mockSupabase.eq.mockResolvedValueOnce({ data: mockTokens, error: null }); // second eq

      const result = await getActiveTokensForUsers(['user-1'], 'space-1');
      expect(result).toEqual(mockTokens);
    });
  });
});
