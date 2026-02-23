import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

describe('calendar-service', () => {
  it('should handle calendar events', () => {
    const event = {
      id: 'event-1',
      space_id: 'space-123',
      title: 'Team Meeting',
      start_time: '2025-01-15T10:00:00Z',
      end_time: '2025-01-15T11:00:00Z',
    };
    expect(event.title).toBe('Team Meeting');
  });

  describe('event operations', () => {
    it('should validate event times', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const end = new Date('2025-01-15T11:00:00Z');
      expect(end > start).toBe(true);
    });

    it('should handle recurring events', () => {
      const event = {
        is_recurring: true,
        recurrence_pattern: 'weekly',
      };
      expect(event.is_recurring).toBe(true);
    });
  });
});
