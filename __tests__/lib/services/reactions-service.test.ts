import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactionsService } from '@/lib/services/reactions-service';

const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockDelete = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockOn = vi.fn();
const mockSubscribe = vi.fn();

const mockSupabaseClient = {
  from: mockFrom,
  channel: mockChannel,
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('reactions-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ upsert: mockUpsert, select: mockSelect, delete: mockDelete });
    mockUpsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, maybeSingle: mockMaybeSingle, single: mockSingle });
    mockEq.mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }), order: mockOrder });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockChannel.mockReturnValue({ on: mockOn });
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockSubscribe.mockReturnValue({});
  });

  describe('createReaction', () => {
    it('should create a reaction successfully', async () => {
      const mockReaction = {
        id: '1',
        checkin_id: 'checkin-1',
        from_user_id: 'user-1',
        reaction_type: 'heart' as const,
        created_at: '2024-01-15',
      };
      mockSingle.mockResolvedValue({ data: mockReaction, error: null });

      const result = await reactionsService.createReaction('user-1', {
        checkin_id: 'checkin-1',
        reaction_type: 'heart',
      });

      expect(result).toEqual(mockReaction);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should upsert existing reaction', async () => {
      const mockReaction = { id: '1', reaction_type: 'hug' as const };
      mockSingle.mockResolvedValue({ data: mockReaction, error: null });

      await reactionsService.createReaction('user-1', {
        checkin_id: 'checkin-1',
        reaction_type: 'hug',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ reaction_type: 'hug' }),
        { onConflict: 'checkin_id,from_user_id' }
      );
    });

    it('should include optional message', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null });

      await reactionsService.createReaction('user-1', {
        checkin_id: 'checkin-1',
        reaction_type: 'heart',
        message: 'Great job!',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Great job!' }),
        expect.any(Object)
      );
    });
  });

  describe('getReactionsForCheckIn', () => {
    it('should fetch reactions for a check-in', async () => {
      const mockReactions = [
        { id: '1', reaction_type: 'heart', from_user_id: 'user-1' },
      ];
      mockOrder.mockResolvedValue({ data: mockReactions, error: null });

      const result = await reactionsService.getReactionsForCheckIn('checkin-1');

      expect(result).toEqual(mockReactions);
    });

    it('should return empty array when no reactions', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await reactionsService.getReactionsForCheckIn('checkin-1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteReaction', () => {
    it('should delete a reaction', async () => {
      mockEq.mockResolvedValue({ error: null });

      await reactionsService.deleteReaction('reaction-1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'reaction-1');
    });
  });

  describe('getUserReactionForCheckIn', () => {
    it('should get user reaction for check-in', async () => {
      const mockReaction = { id: '1', reaction_type: 'heart' };
      mockMaybeSingle.mockResolvedValue({ data: mockReaction, error: null });

      const result = await reactionsService.getUserReactionForCheckIn('checkin-1', 'user-1');

      expect(result).toEqual(mockReaction);
    });

    it('should return null when no reaction exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await reactionsService.getUserReactionForCheckIn('checkin-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getValidationStreak', () => {
    it('should calculate streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockReactions = [
        { created_at: today.toISOString(), checkin_id: '1' },
        { created_at: yesterday.toISOString(), checkin_id: '2' },
      ];
      mockOrder.mockResolvedValue({ data: mockReactions, error: null });

      const result = await reactionsService.getValidationStreak('space-1', 'user-1');

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when no reactions', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await reactionsService.getValidationStreak('space-1', 'user-1');

      expect(result).toBe(0);
    });
  });

  describe('subscribeToReactions', () => {
    it('should setup real-time subscription', () => {
      const callback = vi.fn();
      reactionsService.subscribeToReactions('checkin-1', callback);

      expect(mockChannel).toHaveBeenCalledWith('reactions:checkin-1');
      expect(mockOn).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });
});
