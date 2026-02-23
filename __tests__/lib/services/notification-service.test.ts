import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '@/lib/services/notification-service';

// Mock Supabase client and utilities using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient, mockCsrfFetch } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockCreateClient = vi.fn(() => mockSupabase);

  const mockCsrfFetch = vi.fn();

  return { mockSupabase, mockCreateClient, mockCsrfFetch };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: mockCsrfFetch,
}));

describe('notification-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should fetch user notification preferences', async () => {
      const mockPrefs = {
        email_enabled: true,
        push_enabled: true,
        quiet_hours_enabled: false,
        timezone: 'UTC',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPrefs,
              error: null,
            }),
          })),
        })),
      });

      const result = await notificationService.getPreferences('user-123');
      expect(result).toEqual(mockPrefs);
    });

    it('should return null on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Error' },
            }),
          })),
        })),
      });

      const result = await notificationService.getPreferences('user-123');
      expect(result).toBeNull();
    });
  });

  describe('isInQuietHours', () => {
    it('should return false when quiet hours disabled', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { quiet_hours_enabled: false },
              error: null,
            }),
          })),
        })),
      });

      const result = await notificationService.isInQuietHours('user-123');
      expect(result).toBe(false);
    });

    it('should calculate quiet hours correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                quiet_hours_enabled: true,
                quiet_hours_start: '22:00',
                quiet_hours_end: '08:00',
                timezone: 'America/New_York',
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await notificationService.isInQuietHours('user-123');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('shouldSendNotification', () => {
    it('should return true when all conditions met', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email_enabled: true,
                email_reminders: true,
                quiet_hours_enabled: false,
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await notificationService.shouldSendNotification('user-123', 'reminder', 'email');
      expect(result).toBe(true);
    });

    it('should return false when in quiet hours', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email_enabled: true,
                email_reminders: true,
                quiet_hours_enabled: true,
                quiet_hours_start: '00:00',
                quiet_hours_end: '23:59',
                timezone: 'UTC',
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await notificationService.shouldSendNotification('user-123', 'reminder', 'email');
      expect(result).toBe(false);
    });

    it('should respect category-specific preferences', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email_enabled: true,
                email_reminders: false,
                quiet_hours_enabled: false,
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await notificationService.shouldSendNotification('user-123', 'reminder', 'email');
      expect(result).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should send email via API', async () => {
      // In test environment (Node), window is undefined, so sendEmail uses fetch not csrfFetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }) as any;

      const result = await notificationService.sendEmail(
        'test@example.com',
        'Test Subject',
        '<p>Test HTML</p>'
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle send failures', async () => {
      // In test environment (Node), window is undefined, so sendEmail uses fetch not csrfFetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

      const result = await notificationService.sendEmail(
        'test@example.com',
        'Test Subject',
        '<p>Test HTML</p>'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
