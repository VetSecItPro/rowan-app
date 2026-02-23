/**
 * Tests for goal-dependencies-service.ts
 * Covers CRUD, validation, dependency stats, and cascade logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDependencies,
  getGoalDependencies,
  getDependentGoals,
  updateDependency,
  deleteDependency,
  bypassDependency,
  getDependencyStats,
  canGoalBeStarted,
  triggerDependentGoals,
  getDependencyTree,
} from '@/lib/services/goal-dependencies-service';

// ---------------------------------------------------------------------------
// Chain mock helper
// ---------------------------------------------------------------------------

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete', 'single',
    'limit', 'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not',
    'upsert', 'match', 'or', 'filter', 'ilike', 'rpc', 'range',
  ].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getDependencies
// ---------------------------------------------------------------------------

describe('getDependencies', () => {
  it('returns all dependencies for a space', async () => {
    const mockDeps = [
      { id: 'd1', space_id: 's1', goal_id: 'g1', depends_on_goal_id: 'g2', dependency_type: 'prerequisite', status: 'pending' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockDeps, error: null }));

    const result = await getDependencies('s1');
    expect(result).toHaveLength(1);
    expect(result[0].dependency_type).toBe('prerequisite');
  });

  it('returns empty array when no dependencies exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const result = await getDependencies('s1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(getDependencies('s1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getGoalDependencies
// ---------------------------------------------------------------------------

describe('getGoalDependencies', () => {
  it('returns dependencies for a specific goal', async () => {
    const mockDeps = [
      { id: 'd1', goal_id: 'g1', depends_on_goal_id: 'g2', dependency_type: 'trigger', status: 'pending' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockDeps, error: null }));

    const result = await getGoalDependencies('g1');
    expect(result).toHaveLength(1);
    expect(result[0].goal_id).toBe('g1');
  });

  it('returns empty array when goal has no dependencies', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const result = await getGoalDependencies('g1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getDependentGoals
// ---------------------------------------------------------------------------

describe('getDependentGoals', () => {
  it('returns goals that depend on the given goal', async () => {
    const mockDeps = [
      { id: 'd1', goal_id: 'g2', depends_on_goal_id: 'g1', dependency_type: 'prerequisite', status: 'pending' },
      { id: 'd2', goal_id: 'g3', depends_on_goal_id: 'g1', dependency_type: 'trigger', status: 'pending' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockDeps, error: null }));

    const result = await getDependentGoals('g1');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no goals depend on the given goal', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const result = await getDependentGoals('g1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateDependency
// ---------------------------------------------------------------------------

describe('updateDependency', () => {
  it('returns the updated dependency', async () => {
    const mockDep = { id: 'd1', completion_threshold: 80, auto_unlock: false };
    mockFrom.mockReturnValue(createChainMock({ data: mockDep, error: null }));

    const result = await updateDependency('d1', { completion_threshold: 80 });
    expect(result.completion_threshold).toBe(80);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(updateDependency('d1', { auto_unlock: true })).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// deleteDependency
// ---------------------------------------------------------------------------

describe('deleteDependency', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    await expect(deleteDependency('d1')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(deleteDependency('d1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// bypassDependency
// ---------------------------------------------------------------------------

describe('bypassDependency', () => {
  it('returns the bypassed dependency with updated status', async () => {
    const mockDep = { id: 'd1', status: 'bypassed', bypassed_by: 'admin-user', bypass_reason: 'Emergency' };
    mockFrom.mockReturnValue(createChainMock({ data: mockDep, error: null }));

    const result = await bypassDependency('d1', 'admin-user', 'Emergency');
    expect(result.status).toBe('bypassed');
    expect(result.bypassed_by).toBe('admin-user');
    expect(result.bypass_reason).toBe('Emergency');
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(bypassDependency('d1', 'user-1', 'reason')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// canGoalBeStarted
// ---------------------------------------------------------------------------

describe('canGoalBeStarted', () => {
  it('returns true when goal has no blocking dependencies', async () => {
    // No dependencies at all
    mockFrom.mockReturnValue(createChainMock({ data: [], error: null }));
    const result = await canGoalBeStarted('g1');
    expect(result).toBe(true);
  });

  it('returns false when goal has a pending prerequisite dependency', async () => {
    const deps = [
      { id: 'd1', dependency_type: 'prerequisite', status: 'pending' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: deps, error: null }));
    const result = await canGoalBeStarted('g1');
    expect(result).toBe(false);
  });

  it('returns true when prerequisite dependency is satisfied', async () => {
    const deps = [
      { id: 'd1', dependency_type: 'prerequisite', status: 'satisfied' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: deps, error: null }));
    const result = await canGoalBeStarted('g1');
    expect(result).toBe(true);
  });

  it('returns true when only non-blocking dependency type is pending', async () => {
    const deps = [
      { id: 'd1', dependency_type: 'trigger', status: 'pending' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: deps, error: null }));
    const result = await canGoalBeStarted('g1');
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// triggerDependentGoals
// ---------------------------------------------------------------------------

describe('triggerDependentGoals', () => {
  it('returns goal IDs for satisfied trigger dependencies', async () => {
    const deps = [
      { id: 'd1', goal_id: 'g2', depends_on_goal_id: 'g1', dependency_type: 'trigger', status: 'satisfied' },
      { id: 'd2', goal_id: 'g3', depends_on_goal_id: 'g1', dependency_type: 'trigger', status: 'satisfied' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: deps, error: null }));

    const result = await triggerDependentGoals('g1');
    expect(result).toContain('g2');
    expect(result).toContain('g3');
  });

  it('does not trigger goals with pending trigger dependencies', async () => {
    const deps = [
      { id: 'd1', goal_id: 'g2', depends_on_goal_id: 'g1', dependency_type: 'trigger', status: 'pending' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: deps, error: null }));

    const result = await triggerDependentGoals('g1');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no dependent goals exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: [], error: null }));
    const result = await triggerDependentGoals('g1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getDependencyStats
// ---------------------------------------------------------------------------

describe('getDependencyStats', () => {
  it('calculates stats from dependencies and goals', async () => {
    const deps = [
      { id: 'd1', goal_id: 'g1', depends_on_goal_id: 'g2', dependency_type: 'prerequisite', status: 'pending', auto_unlock: true },
      { id: 'd2', goal_id: 'g3', depends_on_goal_id: 'g4', dependency_type: 'prerequisite', status: 'satisfied', auto_unlock: false },
      { id: 'd3', goal_id: 'g5', depends_on_goal_id: 'g6', dependency_type: 'trigger', status: 'pending', auto_unlock: true },
    ];
    const goals = { data: [{ id: 'g1', status: 'active' }], error: null };

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: deps, error: null }); // getDependencies
      return createChainMock(goals); // goals query
    });

    const stats = await getDependencyStats('s1');

    expect(stats.total_dependencies).toBe(3);
    expect(stats.satisfied_dependencies).toBe(1);
    expect(stats.pending_dependencies).toBe(2);
    expect(stats.blocked_goals).toBe(1); // Only prerequisite + pending counts
    expect(stats.unlockable_goals).toBe(1); // satisfied + !auto_unlock
  });
});

// ---------------------------------------------------------------------------
// getDependencyTree
// ---------------------------------------------------------------------------

describe('getDependencyTree', () => {
  it('calls the RPC and returns the tree nodes', async () => {
    const treeNodes = [
      { goal_id: 'g1', goal_title: 'Goal 1', depends_on_goal_id: 'g2', depends_on_title: 'Goal 2', dependency_type: 'prerequisite', completion_threshold: 100, status: 'pending', depth: 0 },
    ];
    mockRpc.mockResolvedValue({ data: treeNodes, error: null });

    const result = await getDependencyTree('g1');
    expect(result).toHaveLength(1);
    expect(result[0].depth).toBe(0);
  });

  it('returns empty array when no tree exists', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await getDependencyTree('g1');
    expect(result).toEqual([]);
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC fail' } });
    await expect(getDependencyTree('g1')).rejects.toBeTruthy();
  });
});
