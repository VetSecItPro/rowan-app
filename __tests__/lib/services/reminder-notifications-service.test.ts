import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/services/email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/services/push-notification-service', () => ({
  pushNotificationService: { sendPush: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/lib/services/notification-queue-service', () => ({
  notificationQueueService: { queueNotification: vi.fn().mockResolvedValue(undefined) },
}));

import { reminderNotificationsService } from '@/lib/services/reminder-notifications-service';
import { createClient } from '@/lib/supabase/client';

function chain(resolved: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'or', 'order', 'limit', 'range', 'single', 'rpc', 'maybeSingle'].forEach(m => {
    c[m] = vi.fn(handler);
  });
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reminderNotificationsService.formatNotificationTitle', () => {
  it.each([
    ['due', 'Reminder Due'],
    ['overdue', 'Reminder Overdue'],
    ['assigned', 'New Assignment'],
    ['mentioned', 'You were mentioned'],
    ['completed', 'Reminder Completed'],
    ['goal_checkin_due', 'Goal Check-In Due'],
    ['goal_checkin_overdue', 'Goal Check-In Overdue'],
  ])('formats type %s as "%s"', (type, expected) => {
    expect(reminderNotificationsService.formatNotificationTitle(type as never)).toBe(expected);
  });

  it('falls back to "Notification" for unknown type', () => {
    expect(reminderNotificationsService.formatNotificationTitle('alien' as never)).toBe('Notification');
  });
});

describe('reminderNotificationsService.formatNotificationBody', () => {
  it('uses entity emoji when provided', () => {
    const body = reminderNotificationsService.formatNotificationBody('due', { title: 'Buy milk', emoji: '🥛' });
    expect(body).toContain('🥛');
    expect(body).toContain('Buy milk');
    expect(body).toMatch(/due now$/);
  });

  it('falls back to default reminder bell when no emoji and non-goal type', () => {
    const body = reminderNotificationsService.formatNotificationBody('overdue', { title: 'Pay bill' });
    expect(body).toContain('🔔');
    expect(body).toContain('Pay bill');
  });

  it('uses goal emoji for goal_checkin_* types when no entity emoji', () => {
    const body = reminderNotificationsService.formatNotificationBody('goal_checkin_due', { title: 'Run 5k' });
    expect(body).toContain('🎯');
    expect(body).toContain('Run 5k');
  });

  it('formats assigned correctly', () => {
    const body = reminderNotificationsService.formatNotificationBody('assigned', { title: 'Walk dog', emoji: '🐶' });
    expect(body).toMatch(/assigned to Walk dog/);
  });

  it('formats unassigned correctly', () => {
    const body = reminderNotificationsService.formatNotificationBody('unassigned', { title: 'Walk dog' });
    expect(body).toMatch(/unassigned from Walk dog/);
  });
});

describe('reminderNotificationsService.isInQuietHours', () => {
  it('returns boolean from supabase rpc on success', async () => {
    const c = chain({ data: true, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await reminderNotificationsService.isInQuietHours('u1')).toBe(true);
  });

  it('returns false when rpc returns null', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await reminderNotificationsService.isInQuietHours('u1')).toBe(false);
  });

  it('returns false when rpc errors', async () => {
    const c = chain({ data: null, error: { message: 'rpc fail' } });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await reminderNotificationsService.isInQuietHours('u1', 's1')).toBe(false);
  });
});

describe('reminderNotificationsService.getUnreadCount', () => {
  it('returns numeric count from supabase chain', async () => {
    const c: Record<string, unknown> = {};
    const handler = () => c;
    ['from', 'select', 'eq', 'is'].forEach(m => { c[m] = vi.fn(handler); });
    c.then = vi.fn((resolve: (v: unknown) => unknown) =>
      resolve({ count: 7, data: null, error: null })
    );
    vi.mocked(createClient).mockReturnValue({ from: () => c } as never);
    const result = await reminderNotificationsService.getUnreadCount('u1');
    expect(typeof result).toBe('number');
  });
});
