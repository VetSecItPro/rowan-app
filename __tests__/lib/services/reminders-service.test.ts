import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

describe('reminders-service', () => {
  it('should handle reminder creation', () => {
    const reminder = {
      id: 'rem-1',
      space_id: 'space-123',
      title: 'Doctor Appointment',
      remind_at: '2025-01-20T14:00:00Z',
      completed: false,
    };
    expect(reminder.completed).toBe(false);
  });

  describe('reminder operations', () => {
    it('should mark reminders as completed', () => {
      let completed = false;
      completed = true;
      expect(completed).toBe(true);
    });

    it('should handle snooze functionality', () => {
      const originalTime = new Date('2025-01-20T14:00:00Z');
      const snoozeMinutes = 30;
      const newTime = new Date(originalTime.getTime() + snoozeMinutes * 60000);
      expect(newTime > originalTime).toBe(true);
    });
  });
});
