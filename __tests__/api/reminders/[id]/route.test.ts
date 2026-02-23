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

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/sentry-utils', () => ({
  setSentryUser: vi.fn(),
}));

const REMINDER_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const SPACE_ID = '550e8400-e29b-41d4-a716-446655440003';

const MOCK_REMINDER = {
  id: REMINDER_ID,
  title: 'Pay electric bill',
  space_id: SPACE_ID,
  created_by: USER_ID,
};

function makeContext(id = REMINDER_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown) {
  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(`http://localhost/api/reminders/${REMINDER_ID}`, options);
}

function setupAuthenticatedClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
  };
}

describe('/api/reminders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const response = await GET(makeRequest('GET'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 401 when not authenticated', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

      const response = await GET(makeRequest('GET'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when reminder not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(null);

      const response = await GET(makeRequest('GET'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Reminder not found');
    });

    it('should return 403 when user does not have access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const response = await GET(makeRequest('GET'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('access');
    });

    it('should return reminder when access is valid', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const response = await GET(makeRequest('GET'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(MOCK_REMINDER);
    });
  });

  describe('PATCH', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const response = await PATCH(makeRequest('PATCH', { title: 'Updated' }), makeContext());
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 404 when reminder not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(null);

      const response = await PATCH(makeRequest('PATCH', { title: 'Updated' }), makeContext());
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid update body', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      // unknownField should be rejected by strict mode
      const response = await PATCH(
        makeRequest('PATCH', { unknownField: 'bad' }),
        makeContext()
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should update reminder successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      const updatedReminder = { ...MOCK_REMINDER, title: 'Updated title' };
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);
      vi.mocked(remindersService.updateReminder).mockResolvedValue(updatedReminder as unknown as Awaited<ReturnType<typeof remindersService.updateReminder>>);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const response = await PATCH(
        makeRequest('PATCH', { title: 'Updated title' }),
        makeContext()
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated title');
    });

    it('should accept valid category values', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);
      vi.mocked(remindersService.updateReminder).mockResolvedValue({ ...MOCK_REMINDER, category: 'bills' } as unknown as Awaited<ReturnType<typeof remindersService.updateReminder>>);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const response = await PATCH(
        makeRequest('PATCH', { category: 'bills' }),
        makeContext()
      );

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const response = await DELETE(makeRequest('DELETE'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(429);
    });

    it('should return 404 when reminder not found', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(null);

      const response = await DELETE(makeRequest('DELETE'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('should delete reminder successfully', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);
      vi.mocked(remindersService.deleteReminder).mockResolvedValue(undefined);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockResolvedValue(undefined);

      const response = await DELETE(makeRequest('DELETE'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');
    });

    it('should return 403 when user does not have access', async () => {
      const { checkGeneralRateLimit } = await import('@/lib/ratelimit');
      vi.mocked(checkGeneralRateLimit).mockResolvedValue({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60000,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(
        setupAuthenticatedClient() as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never
      );

      const { remindersService } = await import('@/lib/services/reminders-service');
      vi.mocked(remindersService.getReminderById).mockResolvedValue(MOCK_REMINDER as unknown as Awaited<ReturnType<typeof remindersService.getReminderById>>);

      const { verifyResourceAccess } = await import('@/lib/services/authorization-service');
      vi.mocked(verifyResourceAccess).mockRejectedValue(new Error('Access denied'));

      const response = await DELETE(makeRequest('DELETE'), makeContext());
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });
});
