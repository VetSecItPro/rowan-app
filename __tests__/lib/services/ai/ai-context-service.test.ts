import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiContextService } from '@/lib/services/ai/ai-context-service';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
   'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert',
   'match', 'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeSupabaseClient(overrides: Record<string, unknown> = {}) {
  const defaultChain = createChainMock({ data: [], error: null, count: 0 });
  return {
    from: vi.fn().mockReturnValue(defaultChain),
    ...overrides,
  };
}

describe('AIContextService', () => {
  beforeEach(() => {
    // Clear the internal LRU caches between tests by invalidating the space
    aiContextService.invalidateSpace(SPACE_ID);
    aiContextService.invalidateSpace('other-space');
    vi.clearAllMocks();
  });

  describe('classifyIntent()', () => {
    it('should classify task-related messages', () => {
      expect(aiContextService.classifyIntent('Show me my overdue tasks')).toBe('tasks');
      expect(aiContextService.classifyIntent('what tasks are due today')).toBe('tasks');
      expect(aiContextService.classifyIntent('finish the laundry task')).not.toBe('general');
    });

    it('should classify calendar-related messages', () => {
      expect(aiContextService.classifyIntent('what is on my calendar today')).toBe('calendar');
      expect(aiContextService.classifyIntent('schedule an appointment for tomorrow')).toBe('calendar');
      expect(aiContextService.classifyIntent('any events this week')).toBe('calendar');
    });

    it('should classify budget-related messages', () => {
      expect(aiContextService.classifyIntent('how much budget is remaining')).toBe('budget');
      expect(aiContextService.classifyIntent('track my expenses')).toBe('budget');
    });

    it('should classify meal-related messages', () => {
      expect(aiContextService.classifyIntent('what meal should we eat for dinner tonight')).toBe('meals');
      expect(aiContextService.classifyIntent('what should we cook for lunch')).toBe('meals');
    });

    it('should classify shopping-related messages', () => {
      expect(aiContextService.classifyIntent('add milk to grocery list')).toBe('shopping');
      expect(aiContextService.classifyIntent('what do we need from the store')).toBe('shopping');
    });

    it('should classify goal-related messages', () => {
      expect(aiContextService.classifyIntent('track my savings goal')).toBe('goals');
      expect(aiContextService.classifyIntent('show my milestones')).toBe('goals');
    });

    it('should classify chore-related messages', () => {
      expect(aiContextService.classifyIntent('who did the dishes')).toBe('chores');
      expect(aiContextService.classifyIntent('vacuum the living room')).toBe('chores');
    });

    it('should return general for unmatched messages', () => {
      expect(aiContextService.classifyIntent('hello there')).toBe('general');
      expect(aiContextService.classifyIntent('how are you')).toBe('general');
      expect(aiContextService.classifyIntent('')).toBe('general');
    });

    it('should pick the category with the most keyword matches', () => {
      // "task todo complete due" = 4 task keywords, "calendar event" = 2 calendar keywords
      const result = aiContextService.classifyIntent('task todo complete due calendar event');
      expect(result).toBe('tasks');
    });
  });

  describe('estimateTokens()', () => {
    it('should estimate ~1 token per 4 chars', () => {
      expect(aiContextService.estimateTokens('abcd')).toBe(1);
      expect(aiContextService.estimateTokens('abcdefgh')).toBe(2);
    });

    it('should return 0 for empty string', () => {
      expect(aiContextService.estimateTokens('')).toBe(0);
    });

    it('should round up for partial tokens', () => {
      expect(aiContextService.estimateTokens('abc')).toBe(1);
    });
  });

  describe('truncateContext()', () => {
    it('should not truncate context within budget', () => {
      const context = 'a'.repeat(100);
      const result = aiContextService.truncateContext(context, 100);
      expect(result).toBe(context);
    });

    it('should truncate context exceeding budget', () => {
      const context = 'a'.repeat(1000);
      const result = aiContextService.truncateContext(context, 10); // 10 tokens = 40 chars

      expect(result.length).toBeLessThan(context.length);
      expect(result).toContain('[Context truncated');
    });

    it('should append truncation notice', () => {
      const context = 'x'.repeat(500);
      const result = aiContextService.truncateContext(context, 10);

      expect(result).toContain('[Context truncated to fit token budget]');
    });
  });

  describe('invalidateSpace()', () => {
    it('should not throw when invalidating a non-cached space', () => {
      expect(() => aiContextService.invalidateSpace('unknown-space-id')).not.toThrow();
    });
  });

  describe('getStaticContext()', () => {
    it('should return space name and members from DB', async () => {
      const spaceChain = createChainMock({ data: { name: 'Smith Family' }, error: null });
      const membersChain = createChainMock({
        data: [
          {
            user_id: 'user-1',
            role: 'owner',
            user_profiles: { name: 'Alice', email: 'alice@example.com' },
          },
        ],
        error: null,
      });

      const supabase = {
        from: vi.fn().mockImplementationOnce(() => spaceChain).mockImplementationOnce(() => membersChain),
      };

      const result = await aiContextService.getStaticContext(
        supabase as unknown as Parameters<typeof aiContextService.getStaticContext>[0],
        SPACE_ID
      );

      expect(result.spaceName).toBe('Smith Family');
      expect(result.members).toHaveLength(1);
      expect(result.members[0].displayName).toBe('Alice');
      expect(result.members[0].role).toBe('owner');
    });

    it('should use cached result on second call', async () => {
      const spaceChain = createChainMock({ data: { name: 'Cached Space' }, error: null });
      const membersChain = createChainMock({ data: [], error: null });

      const supabase = {
        from: vi.fn()
          .mockImplementationOnce(() => spaceChain)
          .mockImplementationOnce(() => membersChain),
      };

      await aiContextService.getStaticContext(
        supabase as unknown as Parameters<typeof aiContextService.getStaticContext>[0],
        SPACE_ID
      );

      // Second call should use cache, not call supabase again
      const result = await aiContextService.getStaticContext(
        supabase as unknown as Parameters<typeof aiContextService.getStaticContext>[0],
        SPACE_ID
      );

      expect(supabase.from).toHaveBeenCalledTimes(2); // only called once (initial)
      expect(result.spaceName).toBe('Cached Space');
    });

    it('should fallback to My Space when space name is null', async () => {
      const spaceChain = createChainMock({ data: null, error: null });
      const membersChain = createChainMock({ data: [], error: null });

      const supabase = {
        from: vi.fn()
          .mockImplementationOnce(() => spaceChain)
          .mockImplementationOnce(() => membersChain),
      };

      const result = await aiContextService.getStaticContext(
        supabase as unknown as Parameters<typeof aiContextService.getStaticContext>[0],
        'other-space'
      );

      expect(result.spaceName).toBe('My Space');
    });
  });

  describe('buildFullContext()', () => {
    it('should return minimal context on error', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('DB unavailable');
        }),
      };

      const user = { id: 'user-1', email: 'alice@example.com' };

      const result = await aiContextService.buildFullContext(
        supabase as unknown as Parameters<typeof aiContextService.buildFullContext>[0],
        SPACE_ID,
        user
      );

      expect(result.spaceId).toBe(SPACE_ID);
      expect(result.userId).toBe('user-1');
      expect(result.spaceName).toBe('My Space');
      expect(result.members).toEqual([]);
    });

    it('should use user_metadata.name when available', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('DB unavailable');
        }),
      };

      const user = {
        id: 'user-1',
        email: 'alice@example.com',
        user_metadata: { name: 'Alice Smith' },
      };

      const result = await aiContextService.buildFullContext(
        supabase as unknown as Parameters<typeof aiContextService.buildFullContext>[0],
        'error-space',
        user
      );

      expect(result.userName).toBe('Alice Smith');
    });

    it('should extract username from email when no name available', async () => {
      const supabase = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('DB unavailable');
        }),
      };

      const user = { id: 'user-1', email: 'john.doe@example.com' };

      const result = await aiContextService.buildFullContext(
        supabase as unknown as Parameters<typeof aiContextService.buildFullContext>[0],
        'error-space-2',
        user
      );

      expect(result.userName).toBe('john.doe');
    });
  });
});
