import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/reminders/[id]/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/reminders-service', () => ({
  remindersService: {
    getReminderById: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
  },
}));

vi.mock('@/lib/services/authorization-service', () => ({
  verifyResourceAccess: vi.fn(),
}));

vi.mock('@/lib/ratelimit', () => ({
  checkGeneralRateLimit: vi.fn(),
}));

vi.mock('@/lib/ratelimit-fallback', () => ({
  extractIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const REMINDER_ID = '00000000-0000-4000-8000-000000000010';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const mockReminder = {
  id: REMINDER_ID,
  title: 'Pay bills',
  space_id: '00000000-0000-4000-8000-000000000002',
  created_by: USER_ID,
};

function makeProps() {
  return { params: Promise.resolve({ id: REMINDER_ID }) };
}

function mockRateLimitAndAuth(
  createClient: ReturnType<typeof vi.fn>,
  checkGeneralRateLimit: ReturnType<typeof vi.fn>,
  userId = USER_ID
) {
  vi.mocked(checkGeneralRateLimit).mockResolvedValue({
    success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
  });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as any);
}

describe('/api/reminders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when reminder not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Reminder not found');
    });

    it('should return 403 when user lacks resource access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(mockReminder as any);
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Forbidden'));

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this reminder');
    });

    it('should return reminder successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(mockReminder as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'GET' }
      );

      const response = await GET(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(REMINDER_ID);
    });
  });

  describe('PATCH', () => {
    it('should return 404 when reminder not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/reminders/${REMINDER_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated reminder' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Reminder not found');
    });

    it('should return 400 for invalid update data (strict schema rejects unknown keys)', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(mockReminder as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost/api/reminders/${REMINDER_ID}`, {
        method: 'PATCH',
        // unknown_field rejected by strict()
        body: JSON.stringify({ unknown_field: 'value' }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should update reminder successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(mockReminder as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const updatedReminder = { ...mockReminder, title: 'Updated reminder', completed: true };
      vi.mocked(remindersService.updateReminder).mockResolvedValue(updatedReminder as any);

      const request = new NextRequest(`http://localhost/api/reminders/${REMINDER_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated reminder', completed: true }),
      });

      const response = await PATCH(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated reminder');
      expect(data.data.completed).toBe(true);
    });
  });

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');

      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60000,
      });

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when reminder not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Reminder not found');
    });

    it('should delete reminder successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      const { createClient } = await import('@/lib/supabase/server');
      const { remindersService } = await import('@/lib/services/reminders-service');
      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');

      mockRateLimitAndAuth(createClient as any, checkGeneralRateLimit as any);
      vi.mocked(remindersService.getReminderById).mockResolvedValue(mockReminder as any);
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);
      vi.mocked(remindersService.deleteReminder).mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost/api/reminders/${REMINDER_ID}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, makeProps());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Reminder deleted successfully');
    });
  });
});
