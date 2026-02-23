import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/services/achievement-service', () => ({
  checkAndAwardBadges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/goals/goal-service', () => ({
  goalService: {
    getGoals: vi.fn().mockResolvedValue([]),
  },
}));

// Build a chainable Supabase mock that resolves at the end
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'limit',
   'in', 'gte', 'lte', 'lt', 'neq', 'is', 'not', 'match', 'or'].forEach((m) => {
    chain[m] = vi.fn(self);
  });
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return chain;
}

function makeStorageChain(uploadValue: unknown, urlValue: unknown) {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue(uploadValue),
      getPublicUrl: vi.fn().mockReturnValue(urlValue),
    }),
  };
}

const GOAL_ID = '550e8400-e29b-41d4-a716-446655440001';
const CHECKIN_ID = '550e8400-e29b-41d4-a716-446655440002';
const USER_ID = '550e8400-e29b-41d4-a716-446655440003';

const MOCK_CHECKIN = {
  id: CHECKIN_ID,
  goal_id: GOAL_ID,
  user_id: USER_ID,
  progress_percentage: 50,
  mood: 'good',
  notes: 'Making progress',
  check_in_type: 'manual',
  goal: { space_id: '550e8400-e29b-41d4-a716-446655440004' },
};

const MOCK_SETTINGS = {
  id: 'settings-1',
  goal_id: GOAL_ID,
  user_id: USER_ID,
  frequency: 'weekly',
  day_of_week: 1,
  reminder_time: '09:00:00',
  enable_reminders: true,
  enable_voice_notes: true,
  enable_photos: true,
};

describe('checkinService', () => {
  let mockSupabaseClient: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the global mock for @/lib/supabase/client
    mockSupabaseClient = vi.fn();
  });

  describe('createCheckIn()', () => {
    it('should throw when user is not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: vi.fn(),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(
        checkinService.createCheckIn({
          goal_id: GOAL_ID,
          progress_percentage: 50,
          mood: 'good',
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should create a check-in and return it', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_CHECKIN, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      const result = await checkinService.createCheckIn({
        goal_id: GOAL_ID,
        progress_percentage: 50,
        mood: 'good',
      });

      expect(result.id).toBe(CHECKIN_ID);
      expect(result.progress_percentage).toBe(50);
    });

    it('should throw when database insert fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(
        checkinService.createCheckIn({
          goal_id: GOAL_ID,
          progress_percentage: 50,
          mood: 'good',
        })
      ).rejects.toBeDefined();
    });

    it('should trigger badge check after creating check-in', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_CHECKIN, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkAndAwardBadges } = await import('@/lib/services/achievement-service');
      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await checkinService.createCheckIn({
        goal_id: GOAL_ID,
        progress_percentage: 75,
        mood: 'great',
      });

      // Badge check is async (fire-and-forget), so just verify it was called
      await new Promise((r) => setTimeout(r, 10));
      expect(checkAndAwardBadges).toHaveBeenCalledWith(
        USER_ID,
        MOCK_CHECKIN.goal.space_id
      );
    });
  });

  describe('getGoalCheckIns()', () => {
    it('should return check-ins for a goal', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: [MOCK_CHECKIN], error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getGoalCheckIns(GOAL_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(CHECKIN_ID);
    });

    it('should return empty array when no check-ins exist', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getGoalCheckIns(GOAL_ID);

      expect(result).toEqual([]);
    });

    it('should throw when query fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Query failed' } });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(checkinService.getGoalCheckIns(GOAL_ID)).rejects.toBeDefined();
    });
  });

  describe('getCheckInById()', () => {
    it('should return a check-in by id', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_CHECKIN, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getCheckInById(CHECKIN_ID);

      expect(result?.id).toBe(CHECKIN_ID);
    });

    it('should return null when not found', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getCheckInById(CHECKIN_ID);

      expect(result).toBeNull();
    });
  });

  describe('updateCheckIn()', () => {
    it('should update and return check-in', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const updated = { ...MOCK_CHECKIN, progress_percentage: 75 };
      const chain = makeChain({ data: updated, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.updateCheckIn(CHECKIN_ID, { progress_percentage: 75 });

      expect(result.progress_percentage).toBe(75);
    });

    it('should throw when update fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Update failed' } });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(
        checkinService.updateCheckIn(CHECKIN_ID, { progress_percentage: 75 })
      ).rejects.toBeDefined();
    });
  });

  describe('deleteCheckIn()', () => {
    it('should delete a check-in successfully', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(checkinService.deleteCheckIn(CHECKIN_ID)).resolves.toBeUndefined();
    });

    it('should throw when delete fails', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn() },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(checkinService.deleteCheckIn(CHECKIN_ID)).rejects.toBeDefined();
    });
  });

  describe('getCheckInSettings()', () => {
    it('should return settings for goal and user', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_SETTINGS, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getCheckInSettings(GOAL_ID, USER_ID);

      expect(result?.goal_id).toBe(GOAL_ID);
    });

    it('should return null when settings not found (PGRST116)', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getCheckInSettings(GOAL_ID, USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('updateCheckInSettings()', () => {
    it('should throw when user is not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: vi.fn(),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(
        checkinService.updateCheckInSettings({ goal_id: GOAL_ID, frequency: 'weekly' })
      ).rejects.toThrow('User not authenticated');
    });

    it('should return existing settings when update succeeds', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const chain = makeChain({ data: MOCK_SETTINGS, error: null });
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn().mockReturnValue(chain),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.updateCheckInSettings({
        goal_id: GOAL_ID,
        frequency: 'daily',
      });

      expect(result.goal_id).toBe(GOAL_ID);
    });
  });

  describe('getUpcomingCheckIns()', () => {
    it('should return empty array when user not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: vi.fn(),
      } as unknown as ReturnType<typeof createClient>);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');

      await expect(
        checkinService.getUpcomingCheckIns('space-1')
      ).rejects.toThrow('User not authenticated');
    });

    it('should return empty array when no active goals', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
        },
        from: vi.fn(),
      } as unknown as ReturnType<typeof createClient>);

      const { goalService } = await import('@/lib/services/goals/goal-service');
      vi.mocked(goalService.getGoals).mockResolvedValue([]);

      const { checkinService } = await import('@/lib/services/goals/checkin-service');
      const result = await checkinService.getUpcomingCheckIns('space-1');

      expect(result).toEqual([]);
    });
  });
});
