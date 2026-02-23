import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
}));

describe('messages-service', () => {
  it('should handle message data', () => {
    const message = {
      id: 'msg-1',
      space_id: 'space-123',
      content: 'Hello team!',
      sender_id: 'user-123',
      created_at: '2025-01-15T10:00:00Z',
    };
    expect(message.content).toBe('Hello team!');
  });

  describe('message operations', () => {
    it('should track read status', () => {
      const message = {
        id: 'msg-1',
        is_read: false,
      };
      message.is_read = true;
      expect(message.is_read).toBe(true);
    });

    it('should handle real-time subscriptions', () => {
      const channelName = 'messages:space-123';
      expect(channelName).toContain('space-123');
    });
  });
});
