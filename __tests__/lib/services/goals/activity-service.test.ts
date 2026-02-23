import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient, mockGoalService } = vi.hoisted(() => {
  function createChainMock(resolvedValue: unknown) {
    const mock: Record<string, unknown> = {};
    const handler = () => mock;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
      (mock as Record<string, unknown>)[m] = vi.fn(handler);
    });
    mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
    return mock;
  }

  const mockGoalService = {
    getGoalById: vi.fn(async () => ({
      id: 'goal-1',
      title: 'Run a 5K',
      space_id: 'space-1',
    })),
  };

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
  };
  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient, mockGoalService };
});

vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/services/goals/goal-service', () => ({ goalService: mockGoalService }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { activityService } from '@/lib/services/goals/activity-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeChainWithList(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
   'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
   'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.single = vi.fn(async () => ({ data: data[0] ?? null, error: null }));
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data, error: null }));
  return chain;
}

function makeChainWithError(errorMsg: string) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
   'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
   'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.single = vi.fn(async () => ({ data: null, error: { message: errorMsg } }));
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: errorMsg } }));
  return chain;
}

// ---------------------------------------------------------------------------
// getActivityFeed
// ---------------------------------------------------------------------------
describe('activityService.getActivityFeed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns activity list for a space', async () => {
    const activities = [
      { id: 'act-1', space_id: 'space-1', activity_type: 'goal_created', title: 'Created goal', created_at: '2026-01-01T00:00:00Z' },
    ];
    const chain = makeChainWithList(activities);
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.getActivityFeed('space-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('act-1');
  });

  it('returns empty array on goal_activities table not found error', async () => {
    const chain = makeChainWithError('goal_activities table not found');
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.getActivityFeed('space-1');
    expect(result).toHaveLength(0);
  });

  it('returns empty array on 42P01 code (table not found)', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
      resolve({ data: null, error: { message: 'unknown', code: '42P01' } })
    );
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.getActivityFeed('space-1');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getGoalActivityFeed
// ---------------------------------------------------------------------------
describe('activityService.getGoalActivityFeed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns activities filtered by goalId', async () => {
    const activities = [
      { id: 'act-2', goal_id: 'goal-1', activity_type: 'goal_updated', title: 'Updated goal', created_at: '2026-01-01T00:00:00Z' },
    ];
    const chain = makeChainWithList(activities);
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.getGoalActivityFeed('goal-1');

    expect(result).toHaveLength(1);
    expect(result[0].goal_id).toBe('goal-1');
  });

  it('throws on database error', async () => {
    const chain = makeChainWithError('DB error');
    mockSupabase.from.mockReturnValue(chain);

    await expect(activityService.getGoalActivityFeed('goal-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createActivity
// ---------------------------------------------------------------------------
describe('activityService.createActivity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates activity for authenticated user', async () => {
    const activity = {
      id: 'act-new',
      space_id: 'space-1',
      activity_type: 'goal_created',
      title: 'Created a goal',
      user_id: 'user-1',
    };
    const chain = makeChainWithList([activity]);
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.createActivity({
      space_id: 'space-1',
      activity_type: 'goal_created',
      title: 'Created a goal',
    });

    expect(result.id).toBe('act-new');
  });

  it('throws when user not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(
      activityService.createActivity({
        space_id: 'space-1',
        activity_type: 'goal_created',
        title: 'Created a goal',
      })
    ).rejects.toThrow('User not authenticated');
  });
});

// ---------------------------------------------------------------------------
// getGoalComments
// ---------------------------------------------------------------------------
describe('activityService.getGoalComments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns top-level comments for a goal', async () => {
    const comments = [
      {
        id: 'comment-1',
        goal_id: 'goal-1',
        user_id: 'user-1',
        content: 'Great progress!',
        parent_comment_id: null,
        reaction_counts: {},
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    // For top-level comments and replies
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
       'or', 'filter', 'ilike', 'range'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: comments, error: null }));
      chain.single = vi.fn(async () => ({ data: null, error: null }));
      return chain;
    });

    const result = await activityService.getGoalComments('goal-1');

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Great progress!');
  });
});

// ---------------------------------------------------------------------------
// createComment
// ---------------------------------------------------------------------------
describe('activityService.createComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates comment and processes mentions', async () => {
    const comment = {
      id: 'comment-new',
      goal_id: 'goal-1',
      user_id: 'user-1',
      content: 'Nice work @alice',
      parent_comment_id: null,
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
       'or', 'filter', 'ilike', 'range'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }));
      chain.single = vi.fn(async () => ({ data: comment, error: null }));
      return chain;
    });

    const result = await activityService.createComment({
      goal_id: 'goal-1',
      content: 'Nice work @alice',
    });

    expect(result.content).toBe('Nice work @alice');
  });

  it('throws when user not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(
      activityService.createComment({ goal_id: 'goal-1', content: 'Hello' })
    ).rejects.toThrow('User not authenticated');
  });
});

// ---------------------------------------------------------------------------
// updateComment
// ---------------------------------------------------------------------------
describe('activityService.updateComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates comment content and sets is_edited', async () => {
    const updatedComment = {
      id: 'comment-1',
      content: 'Updated content',
      is_edited: true,
      edited_at: new Date().toISOString(),
    };
    const chain = makeChainWithList([updatedComment]);
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.updateComment('comment-1', 'Updated content');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Updated content', is_edited: true })
    );
  });
});

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------
describe('activityService.deleteComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes comment without error', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(activityService.deleteComment('comment-1')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// toggleCommentReaction
// ---------------------------------------------------------------------------
describe('activityService.toggleCommentReaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when user not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(
      activityService.toggleCommentReaction('comment-1', '👍')
    ).rejects.toThrow('User not authenticated');
  });

  it('removes reaction if it already exists', async () => {
    const existingReaction = { id: 'reaction-1' };

    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
       'or', 'filter', 'ilike', 'range'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.single = vi.fn(async () => ({ data: existingReaction, error: null }));
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
      return chain;
    });

    await expect(
      activityService.toggleCommentReaction('comment-1', '👍')
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getUserMentions
// ---------------------------------------------------------------------------
describe('activityService.getUserMentions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mentions for authenticated user when userId not provided', async () => {
    const mentions = [{ id: 'mention-1', mentioned_user_id: 'user-1', is_read: false }];
    const chain = makeChainWithList(mentions);
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.getUserMentions();

    expect(result).toHaveLength(1);
  });

  it('returns mentions for specified userId', async () => {
    const chain = makeChainWithList([]);
    mockSupabase.from.mockReturnValue(chain);

    const result = await activityService.getUserMentions('user-99');
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws when no userId provided and user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(activityService.getUserMentions()).rejects.toThrow('User not authenticated');
  });
});

// ---------------------------------------------------------------------------
// markMentionAsRead
// ---------------------------------------------------------------------------
describe('activityService.markMentionAsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks mention as read', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(activityService.markMentionAsRead('mention-1')).resolves.not.toThrow();

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_read: true })
    );
  });
});
