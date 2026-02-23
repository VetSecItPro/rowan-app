/**
 * Tests for event-comments-service.ts
 * Covers parseMentions, formatMentions, and Supabase-backed CRUD operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventCommentsService } from '@/lib/services/event-comments-service';

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
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: 'user-123', user_metadata: { name: 'Alice' } } },
    error: null,
  }),
};

const mockFrom = vi.fn();
const mockSupabaseClient = {
  from: mockFrom,
  auth: mockAuth,
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123', user_metadata: { name: 'Alice' } } },
    error: null,
  });
});

// ---------------------------------------------------------------------------
// parseMentions (pure function)
// ---------------------------------------------------------------------------

describe('eventCommentsService.parseMentions', () => {
  it('extracts user IDs from @mention syntax', () => {
    const content = 'Hey @[Bob](user-456), can you check this?';
    const mentions = eventCommentsService.parseMentions(content);
    expect(mentions).toEqual(['user-456']);
  });

  it('extracts multiple user IDs from multiple mentions', () => {
    const content = 'CC @[Alice](user-1) and @[Bob](user-2) please review.';
    const mentions = eventCommentsService.parseMentions(content);
    expect(mentions).toEqual(['user-1', 'user-2']);
  });

  it('returns empty array when no mentions are present', () => {
    const content = 'Just a plain comment with no mentions.';
    const mentions = eventCommentsService.parseMentions(content);
    expect(mentions).toEqual([]);
  });

  it('extracts ID portion, not the display name', () => {
    const content = '@[John Doe](uuid-abc-123)';
    const mentions = eventCommentsService.parseMentions(content);
    expect(mentions).toEqual(['uuid-abc-123']);
    expect(mentions).not.toContain('John Doe');
  });
});

// ---------------------------------------------------------------------------
// formatMentions (pure function)
// ---------------------------------------------------------------------------

describe('eventCommentsService.formatMentions', () => {
  it('wraps @mention in a span with class "mention"', () => {
    const content = 'Hello @[Alice](user-1)!';
    const formatted = eventCommentsService.formatMentions(content);
    expect(formatted).toContain('<span class="mention">@Alice</span>');
  });

  it('formats multiple mentions in one string', () => {
    const content = '@[Alice](user-1) and @[Bob](user-2)';
    const formatted = eventCommentsService.formatMentions(content);
    expect(formatted).toContain('@Alice');
    expect(formatted).toContain('@Bob');
  });

  it('leaves plain text unchanged when no mentions are present', () => {
    const content = 'No mentions here.';
    expect(eventCommentsService.formatMentions(content)).toBe(content);
  });

  it('does not expose user IDs in the formatted output', () => {
    const content = '@[Alice](user-secret-uuid)';
    const formatted = eventCommentsService.formatMentions(content);
    expect(formatted).not.toContain('user-secret-uuid');
  });
});

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------

describe('eventCommentsService.deleteComment', () => {
  it('resolves without throwing on successful delete', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    await expect(eventCommentsService.deleteComment('comment-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('event_comments');
  });

  it('throws when the DB returns an error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'Permission denied' } }));
    await expect(eventCommentsService.deleteComment('comment-1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getCommentCount
// ---------------------------------------------------------------------------

describe('eventCommentsService.getCommentCount', () => {
  it('returns the count when query succeeds', async () => {
    mockFrom.mockReturnValue(createChainMock({ count: 7, error: null }));
    const count = await eventCommentsService.getCommentCount('event-1');
    expect(count).toBe(7);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue(createChainMock({ count: null, error: null }));
    const count = await eventCommentsService.getCommentCount('event-1');
    expect(count).toBe(0);
  });

  it('throws when the DB returns an error', async () => {
    mockFrom.mockReturnValue(createChainMock({ count: null, error: { message: 'fail' } }));
    await expect(eventCommentsService.getCommentCount('event-1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// createComment — authentication guard
// ---------------------------------------------------------------------------

describe('eventCommentsService.createComment — auth guard', () => {
  it('throws "Not authenticated" when no user is logged in', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      eventCommentsService.createComment({
        event_id: 'event-1',
        space_id: 'space-1',
        content: 'Hello',
      })
    ).rejects.toThrow('Not authenticated');
  });
});

// ---------------------------------------------------------------------------
// getComments — nesting logic
// ---------------------------------------------------------------------------

describe('eventCommentsService.getComments', () => {
  it('nests replies under their parent comment', async () => {
    let callIndex = 0;

    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // top-level comments
        return createChainMock({
          data: [{ id: 'c1', event_id: 'event-1', user_id: 'user-1', content: 'Top', mentions: [], parent_comment_id: null, created_at: '2026-01-01', updated_at: '2026-01-01' }],
          error: null,
        });
      }
      if (callIndex === 2) {
        // replies
        return createChainMock({
          data: [{ id: 'c2', event_id: 'event-1', user_id: 'user-2', content: 'Reply', mentions: [], parent_comment_id: 'c1', created_at: '2026-01-02', updated_at: '2026-01-02' }],
          error: null,
        });
      }
      // users lookup
      return createChainMock({ data: [], error: null });
    });

    const comments = await eventCommentsService.getComments('event-1');
    expect(comments).toHaveLength(1);
    expect(comments[0].replies).toHaveLength(1);
    expect(comments[0].replies![0].content).toBe('Reply');
  });

  it('throws when top-level comment query fails', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'DB error' } }));
    await expect(eventCommentsService.getComments('event-1')).rejects.toBeTruthy();
  });
});
