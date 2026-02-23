import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createComment,
  updateComment,
  deleteComment,
  togglePinComment,
  getCommentCount,
  getUnreadMentions,
  markMentionAsRead,
  markAllMentionsAsRead,
  getUnreadMentionCount,
  addReaction,
  removeReaction,
  createActivityLog,
  getSpaceActivityLogs,
  getUserActivityLogs,
  extractMentions,
  formatActivityDescription,
  getActivityStats,
} from '@/lib/services/comments-service';

// ── Supabase client mock ──────────────────────────────────────────────────────
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
const { mockClient } = vi.hoisted(() => ({
  mockClient: { from: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));

const MOCK_COMMENT = {
  id: 'cmt-1',
  space_id: 'space-1',
  commentable_type: 'task' as const,
  commentable_id: 'task-1',
  content: 'Good work!',
  parent_comment_id: null,
  thread_depth: 0,
  created_by: 'user-1',
  edited_at: null,
  is_edited: false,
  is_pinned: false,
  is_deleted: false,
  deleted_at: null,
  deleted_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('comments-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── createComment ─────────────────────────────────────────────────────────
  describe('createComment', () => {
    it('creates a top-level comment', async () => {
      const chain = createChainMock({ data: MOCK_COMMENT, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await createComment({
        space_id: 'space-1',
        commentable_type: 'task',
        commentable_id: 'task-1',
        content: 'Good work!',
        created_by: 'user-1',
      });

      expect(result).toEqual(MOCK_COMMENT);
    });

    it('throws when insert fails', async () => {
      // No parent_comment_id means only 1 from() call (the insert itself)
      mockClient.from.mockReturnValue(createChainMock({ data: null, error: { message: 'Insert failed' } }));

      await expect(
        createComment({
          space_id: 'space-1',
          commentable_type: 'task',
          commentable_id: 'task-1',
          content: 'Test',
          created_by: 'user-1',
        })
      ).rejects.toBeTruthy();
    });

    it('creates a reply comment with parent_comment_id', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: { thread_depth: 0 }, error: null });
        }
        return createChainMock({ data: { ...MOCK_COMMENT, parent_comment_id: 'cmt-0', thread_depth: 1 }, error: null });
      });

      const result = await createComment({
        space_id: 'space-1',
        commentable_type: 'task',
        commentable_id: 'task-1',
        content: 'Reply',
        created_by: 'user-1',
        parent_comment_id: 'cmt-0',
      });

      expect(result.thread_depth).toBe(1);
    });
  });

  // ── updateComment ─────────────────────────────────────────────────────────
  describe('updateComment', () => {
    it('marks comment as edited', async () => {
      const edited = { ...MOCK_COMMENT, content: 'Edited!', is_edited: true };
      const chain = createChainMock({ data: edited, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await updateComment('cmt-1', { content: 'Edited!' });

      expect(result.is_edited).toBe(true);
    });

    it('throws when update fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(updateComment('cmt-1', { content: 'X' })).rejects.toBeTruthy();
    });
  });

  // ── deleteComment ─────────────────────────────────────────────────────────
  describe('deleteComment', () => {
    it('soft deletes a comment', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteComment('cmt-1', 'user-1')).resolves.toBeUndefined();
    });

    it('throws when update fails', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteComment('cmt-1', 'user-1')).rejects.toBeTruthy();
    });
  });

  // ── togglePinComment ──────────────────────────────────────────────────────
  describe('togglePinComment', () => {
    it('pins a comment', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(togglePinComment('cmt-1', true)).resolves.toBeUndefined();
    });

    it('throws when update fails', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(togglePinComment('cmt-1', true)).rejects.toBeTruthy();
    });
  });

  // ── getCommentCount ───────────────────────────────────────────────────────
  describe('getCommentCount', () => {
    it('returns comment count', async () => {
      const chain = createChainMock({ data: { comment_count: 5 }, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getCommentCount('task', 'task-1');

      expect(result).toBe(5);
    });

    it('returns 0 when no rows found (PGRST116)', async () => {
      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getCommentCount('task', 'task-1');

      expect(result).toBe(0);
    });

    it('throws for non-PGRST116 errors', async () => {
      const chain = createChainMock({ data: null, error: { code: 'OTHER', message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getCommentCount('task', 'task-1')).rejects.toBeTruthy();
    });
  });

  // ── mentions ──────────────────────────────────────────────────────────────
  describe('mentions', () => {
    it('getUnreadMentions returns array', async () => {
      const chain = createChainMock({ data: [{ id: 'mention-1' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUnreadMentions('user-1');

      expect(result).toHaveLength(1);
    });

    it('markMentionAsRead resolves without error', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(markMentionAsRead('mention-1')).resolves.toBeUndefined();
    });

    it('markAllMentionsAsRead resolves without error', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(markAllMentionsAsRead('user-1')).resolves.toBeUndefined();
    });

    it('getUnreadMentionCount returns number', async () => {
      const chain = createChainMock({ count: 3, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUnreadMentionCount('user-1');

      expect(result).toBe(3);
    });
  });

  // ── reactions ─────────────────────────────────────────────────────────────
  describe('reactions', () => {
    it('addReaction inserts and resolves', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(addReaction('cmt-1', 'user-1', '👍')).resolves.toBeUndefined();
    });

    it('addReaction ignores duplicate key error (23505)', async () => {
      const chain = createChainMock({ error: { code: '23505', message: 'Duplicate' } });
      mockClient.from.mockReturnValue(chain);

      await expect(addReaction('cmt-1', 'user-1', '👍')).resolves.toBeUndefined();
    });

    it('removeReaction deletes and resolves', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(removeReaction('cmt-1', 'user-1', '👍')).resolves.toBeUndefined();
    });

    it('removeReaction throws on db error', async () => {
      const chain = createChainMock({ error: { code: 'OTHER', message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(removeReaction('cmt-1', 'user-1', '👍')).rejects.toBeTruthy();
    });
  });

  // ── activity logs ─────────────────────────────────────────────────────────
  describe('activity logs', () => {
    it('createActivityLog returns the log', async () => {
      const mockLog = { id: 'log-1', space_id: 'space-1', activity_type: 'created', entity_type: 'task', entity_id: 'task-1', user_id: 'user-1', description: null, metadata: null, is_system: false, created_at: '2026-01-01' };
      const chain = createChainMock({ data: mockLog, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await createActivityLog({
        space_id: 'space-1',
        activity_type: 'created',
        entity_type: 'task',
        entity_id: 'task-1',
        user_id: 'user-1',
      });

      expect(result.id).toBe('log-1');
    });

    it('getSpaceActivityLogs returns array', async () => {
      const chain = createChainMock({ data: [{ id: 'log-1' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getSpaceActivityLogs('space-1');

      expect(result).toHaveLength(1);
    });

    it('getUserActivityLogs returns array for user', async () => {
      const chain = createChainMock({ data: [{ id: 'log-1' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserActivityLogs('user-1');

      expect(result).toHaveLength(1);
    });

    it('getActivityStats returns totals', async () => {
      const chain = createChainMock({
        data: [
          { activity_type: 'created', user_id: 'user-1' },
          { activity_type: 'updated', user_id: 'user-1' },
          { activity_type: 'created', user_id: 'user-2' },
        ],
        error: null,
      });
      mockClient.from.mockReturnValue(chain);

      const result = await getActivityStats('space-1');

      expect(result.total_activities).toBe(3);
      expect(result.top_contributors).toBeDefined();
    });
  });

  // ── utility functions ─────────────────────────────────────────────────────
  describe('utility functions', () => {
    describe('extractMentions', () => {
      it('extracts @mentions from text', () => {
        const result = extractMentions('Hello @alice and @bob!');

        expect(result).toContain('alice');
        expect(result).toContain('bob');
      });

      it('returns empty array when no mentions', () => {
        const result = extractMentions('No mentions here');

        expect(result).toEqual([]);
      });
    });

    describe('formatActivityDescription', () => {
      it('formats created activity', () => {
        const result = formatActivityDescription({
          id: '1', space_id: 'space-1', activity_type: 'created', entity_type: 'task',
          entity_id: 'task-1', user_id: 'user-1', description: null, metadata: null, is_system: false, created_at: '2026-01-01',
        });

        expect(result).toContain('task');
      });

      it('formats status_changed activity with new_value', () => {
        const result = formatActivityDescription({
          id: '1', space_id: 'space-1', activity_type: 'status_changed', entity_type: 'task',
          entity_id: 'task-1', user_id: 'user-1', description: null,
          metadata: { new_value: 'completed' }, is_system: false, created_at: '2026-01-01',
        });

        expect(result).toContain('completed');
      });
    });
  });
});
