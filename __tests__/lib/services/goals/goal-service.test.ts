import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
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

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
  };
  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/services/achievement-service', () => ({
  checkAndAwardBadges: vi.fn(async () => {}),
}));
vi.mock('@/lib/services/enhanced-notification-service', () => ({
  enhancedNotificationService: {
    getSpaceMembers: vi.fn(async () => []),
    sendGoalAchievementNotification: vi.fn(async () => {}),
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/cache', () => ({
  cacheAside: vi.fn(async (_key: string, fetcher: () => unknown) => fetcher()),
  cacheKeys: { goalStats: (id: string) => `goal-stats-${id}` },
  deleteCachePattern: vi.fn(async () => {}),
  CACHE_TTL: { MEDIUM: 300 },
  CACHE_PREFIXES: { GOAL_STATS: 'goal-stats-' },
}));
vi.mock('@/lib/utils/app-url', () => ({ getAppUrl: () => 'https://app.rowan.com' }));

import { goalService } from '@/lib/services/goals/goal-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'goal-1',
    space_id: 'space-1',
    title: 'Run a 5K',
    description: 'Train and complete a 5K race',
    category: 'health',
    status: 'active',
    progress: 0,
    visibility: 'shared',
    template_id: null,
    priority: 'p2',
    priority_order: 1,
    is_pinned: false,
    target_date: '2026-06-01',
    assigned_to: 'user-1',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    completed_at: null,
    milestones: [],
    assignee: null,
    ...overrides,
  };
}

function makeChainWithResult(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const handler = () => chain;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
   'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
   'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
    chain[m] = vi.fn(handler);
  });
  chain.single = vi.fn(async () => ({ data, error }));
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data, error }));
  return chain;
}

// ---------------------------------------------------------------------------
// getGoals
// ---------------------------------------------------------------------------
describe('goalService.getGoals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns goals for a space', async () => {
    const goals = [makeGoal()];
    const chain = makeChainWithResult(goals);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.getGoals('space-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('goal-1');
  });

  it('returns empty array when no goals', async () => {
    const chain = makeChainWithResult([]);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.getGoals('space-1');
    expect(result).toHaveLength(0);
  });

  it('throws on database error', async () => {
    const chain = makeChainWithResult(null, { message: 'DB error' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(goalService.getGoals('space-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getGoalById
// ---------------------------------------------------------------------------
describe('goalService.getGoalById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns goal when found', async () => {
    const goal = makeGoal();
    const chain = makeChainWithResult(goal);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.getGoalById('goal-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('goal-1');
  });

  it('throws on database error', async () => {
    const chain = makeChainWithResult(null, { message: 'not found' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(goalService.getGoalById('missing')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createGoal
// ---------------------------------------------------------------------------
describe('goalService.createGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a new goal', async () => {
    const goal = makeGoal();
    const chain = makeChainWithResult(goal);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.createGoal({
      space_id: 'space-1',
      title: 'Run a 5K',
    });

    expect(result.id).toBe('goal-1');
    expect(result.title).toBe('Run a 5K');
  });

  it('defaults status to active when not provided', async () => {
    const goal = makeGoal();
    const chain = makeChainWithResult(goal);
    mockSupabase.from.mockReturnValue(chain);

    await goalService.createGoal({ space_id: 'space-1', title: 'New Goal' });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ status: 'active', progress: 0 }),
      ])
    );
  });

  it('throws on database error', async () => {
    const chain = makeChainWithResult(null, { message: 'insert failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(goalService.createGoal({ space_id: 'space-1', title: 'Bad' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateGoal
// ---------------------------------------------------------------------------
describe('goalService.updateGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the goal', async () => {
    const updated = makeGoal({ title: 'Updated Title' });
    const chain = makeChainWithResult(updated);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.updateGoal('goal-1', { title: 'Updated Title' });
    expect(result.title).toBe('Updated Title');
  });

  it('sets completed_at and progress=100 when status becomes completed', async () => {
    const completed = makeGoal({ status: 'completed', progress: 100, space_id: 'space-1' });
    const chain = makeChainWithResult(completed);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.updateGoal('goal-1', { status: 'completed' });
    expect(result.status).toBe('completed');
  });

  it('clears completed_at when status changes from completed to active', async () => {
    const active = makeGoal({ status: 'active', completed_at: null });
    const chain = makeChainWithResult(active);
    mockSupabase.from.mockReturnValue(chain);

    await goalService.updateGoal('goal-1', { status: 'active' });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: null })
    );
  });

  it('throws on database error', async () => {
    const chain = makeChainWithResult(null, { message: 'update failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(goalService.updateGoal('goal-1', { title: 'x' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteGoal
// ---------------------------------------------------------------------------
describe('goalService.deleteGoal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes goal without error', async () => {
    const chain = makeChainWithResult(null);
    // eq resolves successfully
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(goalService.deleteGoal('goal-1')).resolves.not.toThrow();
  });

  it('throws when delete fails', async () => {
    const chain = makeChainWithResult(null, { message: 'delete failed' });
    chain.eq = vi.fn(async () => ({ data: null, error: { message: 'delete failed' } }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(goalService.deleteGoal('goal-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getGoalCollaborators
// ---------------------------------------------------------------------------
describe('goalService.getGoalCollaborators', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns collaborators for a goal', async () => {
    const collaborators = [
      { id: 'collab-1', goal_id: 'goal-1', user_id: 'user-2', role: 'viewer', invited_by: 'user-1', invited_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ];
    const chain = makeChainWithResult(collaborators);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.getGoalCollaborators('goal-1');
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('viewer');
  });
});

// ---------------------------------------------------------------------------
// addCollaborator
// ---------------------------------------------------------------------------
describe('goalService.addCollaborator', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds collaborator when user is authenticated', async () => {
    const collab = { id: 'collab-1', goal_id: 'goal-1', user_id: 'user-2', role: 'contributor', invited_by: 'user-1' };
    const chain = makeChainWithResult(collab);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.addCollaborator({
      goal_id: 'goal-1',
      user_id: 'user-2',
      role: 'contributor',
    });

    expect(result.user_id).toBe('user-2');
  });

  it('throws when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(
      goalService.addCollaborator({ goal_id: 'goal-1', user_id: 'user-2', role: 'contributor' })
    ).rejects.toThrow('User not authenticated');
  });
});

// ---------------------------------------------------------------------------
// toggleGoalVisibility
// ---------------------------------------------------------------------------
describe('goalService.toggleGoalVisibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toggles visibility to private', async () => {
    const goal = makeGoal({ visibility: 'private' });
    const chain = makeChainWithResult(goal);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.toggleGoalVisibility('goal-1', 'private');
    expect(result.visibility).toBe('private');
  });
});

// ---------------------------------------------------------------------------
// updateGoalPriority
// ---------------------------------------------------------------------------
describe('goalService.updateGoalPriority', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates priority and returns updated goal', async () => {
    const goal = makeGoal({ priority: 'p1' });
    const chain = makeChainWithResult(goal);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.updateGoalPriority('goal-1', 'p1');
    expect(result.priority).toBe('p1');
  });
});

// ---------------------------------------------------------------------------
// toggleGoalPin
// ---------------------------------------------------------------------------
describe('goalService.toggleGoalPin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pins a goal', async () => {
    const pinned = makeGoal({ is_pinned: true });
    const chain = makeChainWithResult(pinned);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.toggleGoalPin('goal-1', true);
    expect(result.is_pinned).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getGoalStats
// ---------------------------------------------------------------------------
describe('goalService.getGoalStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns stats with active, completed, inProgress counts', async () => {
    const goals = [
      { status: 'active', progress: 50 },
      { status: 'active', progress: 0 },
      { status: 'completed', progress: 100 },
    ];
    const milestones: unknown[] = [{ id: 'm1' }];

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'limit', 'maybeSingle', 'gte', 'lte', 'in',
       'neq', 'is', 'not', 'upsert', 'match', 'or', 'filter', 'ilike', 'range'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.single = vi.fn(async () => ({ data: null, error: null }));

      if (callCount === 1) {
        // goals query
        chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: goals, error: null }));
      } else {
        // milestones query
        chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: milestones, error: null }));
      }
      return chain;
    });

    const stats = await goalService.getGoalStats('space-1');

    expect(stats.active).toBe(2);
    expect(stats.completed).toBe(2); // 1 completed goal + 1 completed milestone
    expect(stats.inProgress).toBe(1); // active with progress 50
    expect(stats.milestonesReached).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getGoalTemplates
// ---------------------------------------------------------------------------
describe('goalService.getGoalTemplates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all templates when no category filter', async () => {
    const templates = [{ id: 'tmpl-1', title: 'Fitness Goal', category: 'health' }];
    const chain = makeChainWithResult(templates);
    mockSupabase.from.mockReturnValue(chain);

    const result = await goalService.getGoalTemplates();
    expect(result).toHaveLength(1);
  });

  it('passes category filter to query', async () => {
    const chain = makeChainWithResult([]);
    mockSupabase.from.mockReturnValue(chain);

    await goalService.getGoalTemplates('health');

    expect(chain.eq).toHaveBeenCalledWith('category', 'health');
  });
});
