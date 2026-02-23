import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client using vi.hoisted
const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase as unknown as SupabaseClient),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  extractMentions,
  resolveMentions,
  createMentions,
  getMentionsForMessage,
  getUnreadMentions,
  getUnreadMentionCount,
  markMentionAsRead,
  markMessageMentionsAsRead,
  deleteMentionsForMessage,
  getMentionableUsers,
  processMessageMentions,
} from '@/lib/services/mentions-service';

describe('mentions-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all chainable methods
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.in.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('extractMentions', () => {
    it('should extract simple @mention', () => {
      const mentions = extractMentions('Hey @john how are you?');
      expect(mentions).toContain('john');
    });

    it('should extract multiple mentions', () => {
      const mentions = extractMentions('@alice and @bob please review this');
      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('alice');
      expect(mentions).toContain('bob');
    });

    it('should extract quoted mentions', () => {
      const mentions = extractMentions('Hi @"John Doe" and @"Jane Smith"');
      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('John Doe');
      expect(mentions).toContain('Jane Smith');
    });

    it('should handle mentions with underscores and hyphens', () => {
      const mentions = extractMentions('@user_name and @user-name');
      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('user_name');
      expect(mentions).toContain('user-name');
    });

    it('should deduplicate mentions', () => {
      const mentions = extractMentions('@john @john @john');
      expect(mentions).toHaveLength(1);
    });

    it('should return empty array for no mentions', () => {
      const mentions = extractMentions('No mentions here');
      expect(mentions).toEqual([]);
    });
  });

  describe('resolveMentions', () => {
    it('should resolve mentions to users', async () => {
      // resolveMentions calls getMentionableUsers internally
      // getMentionableUsers: .from('space_members').select(...).eq('space_id', spaceId)
      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-1',
            users: { id: 'user-1', name: 'John', email: 'john@example.com', color_theme: null },
          },
        ],
        error: null,
      });

      const result = await resolveMentions(['john'], 'space-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('space_members');
      // 'john' matches email prefix 'john' from john@example.com
      expect(result).toHaveLength(1);
    });

    it('should handle empty mention list', async () => {
      const result = await resolveMentions([], 'space-123');
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should match by display name', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [
          {
            user_id: 'user-1',
            users: { id: 'user-1', name: 'John Doe', email: 'john@example.com', color_theme: null },
          },
        ],
        error: null,
      });

      const result = await resolveMentions(['johndoe'], 'space-123');
      // Should not match since name is "John Doe" not "johndoe"
      expect(result).toHaveLength(0);
    });
  });

  describe('createMentions', () => {
    it('should create mention records', async () => {
      const mockMentions = [
        { id: '1', message_id: 'msg-1', mentioned_user_id: 'user-1', mentioned_by_user_id: 'user-2', space_id: 'space-1', created_at: new Date().toISOString(), read: false, read_at: null },
      ];

      // createMentions: .from('message_mentions').insert(inputs).select()
      // select() is the terminal call that resolves
      mockSupabase.select.mockResolvedValueOnce({ data: mockMentions, error: null });

      const inputs = [{
        message_id: 'msg-1',
        mentioned_user_id: 'user-1',
        mentioned_by_user_id: 'user-2',
        space_id: 'space-1',
      }];

      const result = await createMentions(inputs);
      expect(mockSupabase.from).toHaveBeenCalledWith('message_mentions');
      expect(mockSupabase.insert).toHaveBeenCalledWith(inputs);
      expect(result).toEqual(mockMentions);
    });

    it('should handle empty input', async () => {
      const result = await createMentions([]);
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw on database error', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      const inputs = [{
        message_id: 'msg-1',
        mentioned_user_id: 'user-1',
        mentioned_by_user_id: 'user-2',
        space_id: 'space-1',
      }];

      await expect(createMentions(inputs)).rejects.toThrow();
    });
  });

  describe('getMentionsForMessage', () => {
    it('should fetch mentions for a message', async () => {
      const mockMentions = [
        { id: '1', message_id: 'msg-1', mentioned_user_id: 'user-1', mentioned_by_user_id: 'user-2', space_id: 'space-1', created_at: new Date().toISOString(), read: false, read_at: null },
      ];

      // .from().select().eq('message_id', messageId).order(...)
      mockSupabase.order.mockResolvedValueOnce({ data: mockMentions, error: null });

      const result = await getMentionsForMessage('msg-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('message_id', 'msg-1');
      expect(result).toEqual(mockMentions);
    });

    it('should throw on database error', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(getMentionsForMessage('msg-1')).rejects.toThrow();
    });
  });

  describe('getUnreadMentions', () => {
    it('should fetch unread mentions for user', async () => {
      const mockMentions = [
        { id: '1', message_id: 'msg-1', mentioned_user_id: 'user-1', mentioned_by_user_id: 'user-2', space_id: 'space-1', created_at: new Date().toISOString(), read: false, read_at: null },
      ];

      // .from().select().eq('mentioned_user_id', userId).eq('read', false).order(...)
      // The terminal call is order() (or the query itself if no spaceId)
      mockSupabase.order.mockResolvedValueOnce({ data: mockMentions, error: null });

      const result = await getUnreadMentions('user-1');
      expect(result).toEqual(mockMentions);
    });

    it('should filter by space_id if provided', async () => {
      // When spaceId is provided, there's an extra .eq('space_id', spaceId) call
      // Then the query resolves
      mockSupabase.eq.mockReturnValue(mockSupabase); // all eq calls return chainable
      mockSupabase.order.mockReturnValue(mockSupabase); // order returns chainable
      // The final result comes from awaiting query which is the last chainable
      // Actually the service does: let query = ...chain...; if (spaceId) query = query.eq(...); const { data, error } = await query;
      // So we need the final eq to resolve as a promise
      // Reset and set up fresh
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      // The last .eq('space_id', spaceId) needs to resolve as a thenable
      // Actually it awaits `query` which is the result of the last chained call
      // Since spaceId is set, order returns chainable, then .eq('space_id', spaceId) is called
      // await query means await the return of that last eq call
      // So we need order to return something that has .eq which resolves
      const chainWithResolve: Record<string, ReturnType<typeof vi.fn>> = {};
      chainWithResolve.eq = vi.fn(() => Promise.resolve({ data: [], error: null }));
      mockSupabase.order.mockReturnValueOnce(chainWithResolve);

      await getUnreadMentions('user-1', 'space-123');
      expect(chainWithResolve.eq).toHaveBeenCalledWith('space_id', 'space-123');
    });
  });

  describe('getUnreadMentionCount', () => {
    it('should return count of unread mentions', async () => {
      // .from().select('id', { count: 'exact', head: true }).eq('mentioned_user_id', userId).eq('read', false)
      // Then optionally .eq('space_id', spaceId), then await query
      // The last .eq('read', false) needs to resolve with { count, error }
      mockSupabase.eq.mockReturnValueOnce(mockSupabase); // first eq returns chainable
      mockSupabase.eq.mockResolvedValueOnce({ count: 5, error: null }); // second eq resolves

      const count = await getUnreadMentionCount('user-1');
      expect(count).toBe(5);
    });

    it('should return 0 on error', async () => {
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ count: null, error: new Error('DB error') });

      const count = await getUnreadMentionCount('user-1');
      expect(count).toBe(0);
    });
  });

  describe('markMentionAsRead', () => {
    it('should mark mention as read', async () => {
      const mockMention = {
        id: '1',
        message_id: 'msg-1',
        mentioned_user_id: 'user-1',
        mentioned_by_user_id: 'user-2',
        space_id: 'space-1',
        created_at: new Date().toISOString(),
        read: true,
        read_at: new Date().toISOString(),
      };

      // .from().update(...).eq('id', mentionId).select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockMention, error: null });

      const result = await markMentionAsRead('1');
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(result.read).toBe(true);
    });

    it('should throw on database error', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(markMentionAsRead('1')).rejects.toThrow();
    });
  });

  describe('markMessageMentionsAsRead', () => {
    it('should mark all mentions in message as read', async () => {
      // .from().update(...).eq('message_id', messageId).eq('mentioned_user_id', userId)
      mockSupabase.eq.mockReturnValueOnce(mockSupabase); // first eq
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null }); // second eq resolves

      await markMessageMentionsAsRead('msg-1', 'user-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('message_id', 'msg-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('mentioned_user_id', 'user-1');
    });

    it('should throw on database error', async () => {
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(markMessageMentionsAsRead('msg-1', 'user-1')).rejects.toThrow();
    });
  });

  describe('deleteMentionsForMessage', () => {
    it('should delete all mentions for a message', async () => {
      // .from().delete().eq('message_id', messageId)
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

      await deleteMentionsForMessage('msg-1');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('message_id', 'msg-1');
    });

    it('should throw on database error', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(deleteMentionsForMessage('msg-1')).rejects.toThrow();
    });
  });

  describe('getMentionableUsers', () => {
    it('should fetch mentionable users for space', async () => {
      const mockMembers = [
        {
          user_id: 'user-1',
          users: { id: 'user-1', name: 'John', email: 'john@example.com' },
        },
      ];

      // .from('space_members').select(...).eq('space_id', spaceId)
      mockSupabase.eq.mockResolvedValueOnce({ data: mockMembers, error: null });

      const result = await getMentionableUsers('space-123');
      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('user-1');
      expect(result[0].display_name).toBe('John');
    });

    it('should handle missing user data', async () => {
      const mockMembers = [
        { user_id: 'user-1', users: null },
      ];

      mockSupabase.eq.mockResolvedValueOnce({ data: mockMembers, error: null });

      const result = await getMentionableUsers('space-123');
      expect(result).toHaveLength(0);
    });

    it('should return empty array on error', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      const result = await getMentionableUsers('space-123');
      expect(result).toEqual([]);
    });
  });

  describe('processMessageMentions', () => {
    it('should extract and create mentions', async () => {
      const mockMembers = [
        {
          user_id: 'user-1',
          users: { id: 'user-1', name: 'John', email: 'john@example.com' },
        },
      ];

      // getMentionableUsers: .from('space_members').select(...).eq('space_id', spaceId)
      // First select returns chainable (default), first eq resolves with members
      mockSupabase.eq.mockResolvedValueOnce({ data: mockMembers, error: null });

      // createMentions: .from('message_mentions').insert(inputs).select()
      // Second from returns chainable, insert returns chainable, select resolves with mention data
      const mockMention = {
        id: '1',
        message_id: 'msg-1',
        mentioned_user_id: 'user-1',
        mentioned_by_user_id: 'sender-1',
        space_id: 'space-1',
        created_at: new Date().toISOString(),
        read: false,
        read_at: null,
      };
      // The first select() is consumed by getMentionableUsers (returns chainable - default).
      // The second select() is from createMentions - needs to resolve.
      // Use mockReturnValueOnce for the first, then mockResolvedValueOnce for the second.
      mockSupabase.select.mockReturnValueOnce(mockSupabase); // first select (getMentionableUsers)
      mockSupabase.select.mockResolvedValueOnce({ data: [mockMention], error: null }); // second select (createMentions)

      const result = await processMessageMentions('msg-1', 'Hey @john check this', 'sender-1', 'space-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for no mentions', async () => {
      const result = await processMessageMentions('msg-1', 'No mentions here', 'sender-1', 'space-1');
      expect(result).toEqual([]);
    });
  });
});
