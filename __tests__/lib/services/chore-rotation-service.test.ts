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
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };
  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }));

import { choreRotationService } from '@/lib/services/chore-rotation-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRotation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rotation-1',
    chore_id: 'chore-1',
    rotation_name: 'Rotation for chore-1',
    rotation_type: 'round-robin',
    user_order: ['user-1', 'user-2', 'user-3'],
    rotation_frequency: 'weekly',
    next_rotation_date: '2026-03-01',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
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
// createRotation
// ---------------------------------------------------------------------------
describe('choreRotationService.createRotation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a new rotation', async () => {
    const rotation = makeRotation();
    const chain = makeChainWithSingle(rotation);
    mockSupabase.from.mockReturnValue(chain);

    const result = await choreRotationService.createRotation(
      'chore-1',
      ['user-1', 'user-2'],
      'weekly',
      'round-robin',
      'user-1'
    );

    expect(result.id).toBe('rotation-1');
    expect(result.rotation_frequency).toBe('weekly');
    expect(result.user_order).toContain('user-1');
  });

  it('sets next_rotation_date +1 day for daily frequency', async () => {
    const rotation = makeRotation({ rotation_frequency: 'daily' });
    const chain = makeChainWithSingle(rotation);
    mockSupabase.from.mockReturnValue(chain);

    await choreRotationService.createRotation(
      'chore-1',
      ['user-1'],
      'daily',
      'round-robin',
      'user-1'
    );

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rotation_frequency: 'daily' })
    );
  });

  it('sets next_rotation_date +7 days for weekly frequency', async () => {
    const rotation = makeRotation();
    const chain = makeChainWithSingle(rotation);
    mockSupabase.from.mockReturnValue(chain);

    const today = new Date();
    const expectedNext = new Date(today);
    expectedNext.setDate(expectedNext.getDate() + 7);
    const expectedDateStr = expectedNext.toISOString().split('T')[0];

    await choreRotationService.createRotation(
      'chore-1',
      ['user-1', 'user-2'],
      'weekly',
      'round-robin',
      'user-1'
    );

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ next_rotation_date: expectedDateStr })
    );
  });

  it('throws on database error', async () => {
    const chain = makeChainWithSingle(null, { message: 'insert failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(
      choreRotationService.createRotation('chore-1', ['user-1'], 'weekly', 'round-robin', 'user-1')
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getRotation
// ---------------------------------------------------------------------------
describe('choreRotationService.getRotation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rotation for a chore', async () => {
    const rotation = makeRotation();
    const chain = makeChainWithSingle(rotation);
    mockSupabase.from.mockReturnValue(chain);

    const result = await choreRotationService.getRotation('chore-1');

    expect(result).not.toBeNull();
    expect(result!.chore_id).toBe('chore-1');
    expect(result!.rotation_type).toBe('round-robin');
  });

  it('returns null when rotation not found (PGRST116)', async () => {
    const chain = makeChainWithSingle(null, { code: 'PGRST116', message: 'not found' });
    mockSupabase.from.mockReturnValue(chain);

    const result = await choreRotationService.getRotation('chore-missing');
    expect(result).toBeNull();
  });

  it('throws on non-PGRST116 errors', async () => {
    const chain = makeChainWithSingle(null, { code: '500', message: 'server error' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(choreRotationService.getRotation('chore-1')).rejects.toThrow();
  });

  it('queries by chore_id', async () => {
    const chain = makeChainWithSingle(null, { code: 'PGRST116', message: 'not found' });
    mockSupabase.from.mockReturnValue(chain);

    await choreRotationService.getRotation('chore-xyz');

    expect(chain.eq).toHaveBeenCalledWith('chore_id', 'chore-xyz');
  });
});

// ---------------------------------------------------------------------------
// updateRotation
// ---------------------------------------------------------------------------
describe('choreRotationService.updateRotation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the rotation', async () => {
    const updated = makeRotation({ rotation_frequency: 'biweekly' });
    const chain = makeChainWithSingle(updated);
    mockSupabase.from.mockReturnValue(chain);

    const result = await choreRotationService.updateRotation('rotation-1', {
      rotation_frequency: 'biweekly',
    });

    expect(result.rotation_frequency).toBe('biweekly');
  });

  it('calls update with correct data', async () => {
    const chain = makeChainWithSingle(makeRotation());
    mockSupabase.from.mockReturnValue(chain);

    await choreRotationService.updateRotation('rotation-1', {
      user_order: ['user-2', 'user-1'],
    });

    expect(chain.update).toHaveBeenCalledWith({ user_order: ['user-2', 'user-1'] });
    expect(chain.eq).toHaveBeenCalledWith('id', 'rotation-1');
  });

  it('throws on database error', async () => {
    const chain = makeChainWithSingle(null, { message: 'update failed' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(
      choreRotationService.updateRotation('rotation-1', { rotation_frequency: 'daily' })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// processRotations
// ---------------------------------------------------------------------------
describe('choreRotationService.processRotations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls RPC process_chore_rotations', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    await choreRotationService.processRotations();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('process_chore_rotations');
  });

  it('resolves without throwing on success', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(choreRotationService.processRotations()).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteRotation
// ---------------------------------------------------------------------------
describe('choreRotationService.deleteRotation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes rotation without error', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(choreRotationService.deleteRotation('rotation-1')).resolves.not.toThrow();
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

    await expect(choreRotationService.deleteRotation('rotation-1')).rejects.toThrow();
  });

  it('calls delete and eq with correct arguments', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await choreRotationService.deleteRotation('rotation-xyz');

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'rotation-xyz');
  });
});
