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
vi.mock('@/lib/utils/app-url', () => ({ getAppUrl: () => 'https://app.rowan.com' }));

import { milestoneService } from '@/lib/services/goals/milestone-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMilestone(overrides: Record<string, unknown> = {}) {
  return {
    id: 'milestone-1',
    goal_id: 'goal-1',
    title: 'Week 1 - 1K run',
    description: 'Run 1 kilometre without stopping',
    type: 'checkbox',
    target_value: null,
    completed: false,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    goal: { space_id: 'space-1' },
    ...overrides,
  };
}

function makeChainWithSingle(data: unknown, error: unknown = null) {
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
// createMilestone
// ---------------------------------------------------------------------------
describe('milestoneService.createMilestone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a new milestone with completed=false', async () => {
    const milestone = makeMilestone();
    const chain = makeChainWithSingle(milestone);
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.createMilestone({
      goal_id: 'goal-1',
      title: 'Week 1 - 1K run',
      type: 'checkbox',
    });

    expect(result.id).toBe('milestone-1');
    expect(result.completed).toBe(false);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ completed: false }),
      ])
    );
  });

  it('throws on database error', async () => {
    const chain = makeChainWithSingle(null, { message: 'insert failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(
      milestoneService.createMilestone({ goal_id: 'goal-1', title: 'Fail', type: 'checkbox' })
    ).rejects.toThrow();
  });

  it('preserves all input fields', async () => {
    const milestone = makeMilestone({ target_value: 100, description: 'Reach 100%' });
    const chain = makeChainWithSingle(milestone);
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.createMilestone({
      goal_id: 'goal-1',
      title: 'Reach goal',
      type: 'numeric',
      target_value: 100,
      description: 'Reach 100%',
    });

    expect(result.target_value).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// updateMilestone
// ---------------------------------------------------------------------------
describe('milestoneService.updateMilestone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates milestone fields and returns updated data', async () => {
    const updated = makeMilestone({ title: 'Updated Title' });
    const chain = makeChainWithSingle(updated);
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.updateMilestone('milestone-1', { title: 'Updated Title' });

    expect(result.title).toBe('Updated Title');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated Title' })
    );
  });

  it('throws on database error', async () => {
    const chain = makeChainWithSingle(null, { message: 'update failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(
      milestoneService.updateMilestone('milestone-1', { title: 'x' })
    ).rejects.toThrow();
  });

  it('calls eq with the correct milestone id', async () => {
    const chain = makeChainWithSingle(makeMilestone());
    mockSupabase.from.mockReturnValue(chain);

    await milestoneService.updateMilestone('milestone-xyz', { title: 'Test' });

    expect(chain.eq).toHaveBeenCalledWith('id', 'milestone-xyz');
  });
});

// ---------------------------------------------------------------------------
// toggleMilestone - marking as complete
// ---------------------------------------------------------------------------
describe('milestoneService.toggleMilestone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks milestone as completed and sets completed_at', async () => {
    const completedMilestone = makeMilestone({ completed: true, completed_at: new Date().toISOString() });
    const chain = makeChainWithSingle(completedMilestone);
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.toggleMilestone('milestone-1', true);

    expect(result.completed).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, completed_at: expect.any(String) })
    );
  });

  it('clears completed_at when uncompleting milestone', async () => {
    const uncompletedMilestone = makeMilestone({ completed: false, completed_at: null });
    const chain = makeChainWithSingle(uncompletedMilestone);
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.toggleMilestone('milestone-1', false);

    expect(result.completed).toBe(false);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false, completed_at: null })
    );
  });

  it('throws on database error', async () => {
    const chain = makeChainWithSingle(null, { message: 'toggle failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(milestoneService.toggleMilestone('milestone-1', true)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteMilestone
// ---------------------------------------------------------------------------
describe('milestoneService.deleteMilestone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes milestone without error', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(milestoneService.deleteMilestone('milestone-1')).resolves.not.toThrow();
  });

  it('throws when delete fails', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: { message: 'delete failed' } }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(milestoneService.deleteMilestone('milestone-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getAllMilestones
// ---------------------------------------------------------------------------
describe('milestoneService.getAllMilestones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all milestones for a space', async () => {
    const milestones = [
      makeMilestone(),
      makeMilestone({ id: 'milestone-2', title: 'Week 2 - 2K run' }),
    ];

    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.single = vi.fn(async () => ({ data: null, error: null }));
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: milestones, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.getAllMilestones('space-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('milestone-1');
  });

  it('returns empty array when no milestones', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.single = vi.fn(async () => ({ data: null, error: null }));
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }));
    mockSupabase.from.mockReturnValue(chain);

    const result = await milestoneService.getAllMilestones('space-1');
    expect(result).toHaveLength(0);
  });

  it('throws on database error', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.single = vi.fn(async () => ({ data: null, error: null }));
    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: { message: 'query failed' } }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(milestoneService.getAllMilestones('space-1')).rejects.toThrow();
  });
});
