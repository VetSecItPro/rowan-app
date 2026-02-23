import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  removeMember,
  changeMemberRole,
  leaveSpace,
  cancelInvitation,
} from '@/lib/services/member-management-service';

// ── Supabase server client mock ───────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// Use vi.hoisted so mockClient is available inside vi.mock factory
const { mockClient } = vi.hoisted(() => {
  const mockClient = { from: vi.fn() };
  return { mockClient };
});

vi.mock('@/lib/supabase/server', () => ({
  // member-management-service uses `await createClient()`
  createClient: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('member-management-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── removeMember ──────────────────────────────────────────────────────────
  describe('removeMember', () => {
    it('removes member when requesting user is admin', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'admin' }, error: null }); // requesting member check
        if (callCount === 2) return createChainMock({ data: { role: 'member' }, error: null }); // target member check
        if (callCount === 3) return createChainMock({ error: null }); // delete member
        return createChainMock({ error: null }); // delete presence
      });

      const result = await removeMember('space-1', 'member-user', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('denies when requesting user is not admin', async () => {
      const chain = createChainMock({ data: { role: 'member' }, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await removeMember('space-1', 'another-user', 'regular-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('denies self-removal', async () => {
      const chain = createChainMock({ data: { role: 'admin' }, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await removeMember('space-1', 'admin-user', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot remove yourself');
    });

    it('denies removing last admin', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'owner' }, error: null }); // requester
        if (callCount === 2) return createChainMock({ data: { role: 'admin' }, error: null }); // target
        // admin count - only 1 admin
        return createChainMock({ data: [{ user_id: 'target-admin' }], error: null });
      });

      const result = await removeMember('space-1', 'target-admin', 'owner-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('last admin');
    });

    it('returns failure when member not found', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'admin' }, error: null });
        return createChainMock({ data: null, error: { message: 'Not found' } });
      });

      const result = await removeMember('space-1', 'ghost-user', 'admin-user');

      expect(result.success).toBe(false);
    });

    it('handles unexpected errors', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('Connection error');
      });

      const result = await removeMember('space-1', 'user-1', 'admin-user');

      expect(result.success).toBe(false);
    });
  });

  // ── changeMemberRole ──────────────────────────────────────────────────────
  describe('changeMemberRole', () => {
    it('changes member role when admin is requesting', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'owner' }, error: null }); // requester
        if (callCount === 2) return createChainMock({ data: { role: 'member' }, error: null }); // current member
        return createChainMock({ error: null }); // update
      });

      const result = await changeMemberRole('space-1', 'member-user', 'admin', 'owner-user');

      expect(result.success).toBe(true);
    });

    it('denies when requesting user lacks permission', async () => {
      const chain = createChainMock({ data: { role: 'member' }, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await changeMemberRole('space-1', 'other-user', 'admin', 'regular-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('denies self role change', async () => {
      const chain = createChainMock({ data: { role: 'admin' }, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await changeMemberRole('space-1', 'admin-user', 'member', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('own role');
    });

    it('denies demoting last admin', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'owner' }, error: null });
        if (callCount === 2) return createChainMock({ data: { role: 'admin' }, error: null });
        // Only 1 admin
        return createChainMock({ data: [{ user_id: 'admin-user' }], error: null });
      });

      const result = await changeMemberRole('space-1', 'admin-user', 'member', 'owner-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('last admin');
    });
  });

  // ── leaveSpace ────────────────────────────────────────────────────────────
  describe('leaveSpace', () => {
    it('allows regular member to leave', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'member' }, error: null }); // user member data
        if (callCount === 2) return createChainMock({ error: null }); // delete member
        return createChainMock({ error: null }); // delete presence
      });

      const result = await leaveSpace('space-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('denies leaving when user is last admin', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { role: 'admin' }, error: null });
        // Only 1 admin (themselves)
        return createChainMock({ data: [{ user_id: 'user-1' }], error: null });
      });

      const result = await leaveSpace('space-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('last admin');
    });

    it('returns failure when user is not a member', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });
      mockClient.from.mockReturnValue(chain);

      const result = await leaveSpace('space-1', 'non-member');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });

    it('handles unexpected errors', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await leaveSpace('space-1', 'user-1');

      expect(result.success).toBe(false);
    });
  });

  // ── cancelInvitation ──────────────────────────────────────────────────────
  describe('cancelInvitation', () => {
    it('cancels invitation when requester is admin', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { space_id: 'space-1', status: 'pending' }, error: null }); // invitation
        if (callCount === 2) return createChainMock({ data: { role: 'admin' }, error: null }); // membership check
        return createChainMock({ error: null }); // update status
      });

      const result = await cancelInvitation('invite-1', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('returns failure when invitation not found', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });
      mockClient.from.mockReturnValue(chain);

      const result = await cancelInvitation('ghost-invite', 'admin-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('denies when requester lacks permission', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { space_id: 'space-1', status: 'pending' }, error: null });
        return createChainMock({ data: { role: 'member' }, error: null }); // not admin
      });

      const result = await cancelInvitation('invite-1', 'regular-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('handles unexpected errors', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('DB failure');
      });

      const result = await cancelInvitation('invite-1', 'admin-user');

      expect(result.success).toBe(false);
    });
  });
});
