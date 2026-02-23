import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationQueueService } from '@/lib/services/notification-queue-service';

// ── Supabase client mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// Use vi.hoisted so mockClient and mockRpc are available inside vi.mock factory
const { mockRpc, mockClient } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockClient = { from: vi.fn(), rpc: mockRpc };
  return { mockRpc, mockClient };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/services/reminder-notifications-service', () => ({
  NotificationFrequency: {},
}));

const MOCK_QUEUED = {
  id: 'queue-1',
  user_id: 'user-1',
  space_id: 'space-1',
  notification_type: 'task_assignment',
  notification_data: { taskTitle: 'Do dishes' },
  delivery_method: 'instant' as const,
  scheduled_for: '2026-01-01T10:00:00Z',
  status: 'pending' as const,
  retry_count: 0,
  suppressed_by_quiet_hours: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('notification-queue-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── queueNotification ─────────────────────────────────────────────────────
  describe('queueNotification', () => {
    it('queues a notification and returns it', async () => {
      // calculateScheduledTime needs two rpc calls; queueNotification needs from().insert
      mockRpc
        .mockResolvedValueOnce({ data: '2026-01-01T10:00:00Z', error: null })  // calculate_next_delivery_time
        .mockResolvedValueOnce({ data: '2026-01-01T10:00:00Z', error: null }); // adjust_for_quiet_hours

      const chain = createChainMock({ data: MOCK_QUEUED, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await notificationQueueService.queueNotification(
        'user-1',
        'space-1',
        'task_assignment',
        { taskTitle: 'Do dishes' },
        'instant'
      );

      expect(result.id).toBe('queue-1');
    });

    it('throws when insert fails', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: '2026-01-01T10:00:00Z', error: null })
        .mockResolvedValueOnce({ data: '2026-01-01T10:00:00Z', error: null });

      const chain = createChainMock({ data: null, error: { message: 'Insert failed' } });
      mockClient.from.mockReturnValue(chain);

      await expect(
        notificationQueueService.queueNotification('user-1', 'space-1', 'test', {}, 'instant')
      ).rejects.toThrow('Failed to queue notification');
    });
  });

  // ── calculateScheduledTime ────────────────────────────────────────────────
  describe('calculateScheduledTime', () => {
    it('returns calculated scheduled time', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: '2026-01-01T12:00:00Z', error: null })
        .mockResolvedValueOnce({ data: '2026-01-01T12:00:00Z', error: null });

      const result = await notificationQueueService.calculateScheduledTime('user-1', 'space-1', 'hourly');

      expect(result).toBe('2026-01-01T12:00:00Z');
    });

    it('falls back to now when RPC fails', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      const result = await notificationQueueService.calculateScheduledTime('user-1', null, 'instant');

      // Should return a valid ISO date string
      expect(typeof result).toBe('string');
      expect(() => new Date(result)).not.toThrow();
    });
  });

  // ── getPendingNotifications ───────────────────────────────────────────────
  describe('getPendingNotifications', () => {
    it('returns pending notifications', async () => {
      const chain = createChainMock({ data: [MOCK_QUEUED], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await notificationQueueService.getPendingNotifications(100);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('returns empty array when no pending notifications', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await notificationQueueService.getPendingNotifications();

      expect(result).toEqual([]);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.getPendingNotifications()).rejects.toThrow(
        'Failed to fetch pending notifications'
      );
    });
  });

  // ── markAsSent ────────────────────────────────────────────────────────────
  describe('markAsSent', () => {
    it('resolves without error', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.markAsSent(['queue-1', 'queue-2'])).resolves.toBeUndefined();
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.markAsSent(['queue-1'])).rejects.toThrow(
        'Failed to mark notifications as sent'
      );
    });
  });

  // ── markAsFailed ──────────────────────────────────────────────────────────
  describe('markAsFailed', () => {
    it('resolves without error', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(
        notificationQueueService.markAsFailed('queue-1', 'Delivery failed', 1)
      ).resolves.toBeUndefined();
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(
        notificationQueueService.markAsFailed('queue-1', 'Error', 1)
      ).rejects.toThrow('Failed to mark notification as failed');
    });
  });

  // ── retryNotification ─────────────────────────────────────────────────────
  describe('retryNotification', () => {
    it('resets notification to pending', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: { retry_count: 1 }, error: null }); // fetch
        }
        return createChainMock({ error: null }); // update
      });

      await expect(notificationQueueService.retryNotification('queue-1')).resolves.toBeUndefined();
    });

    it('throws when max retries exceeded', async () => {
      const chain = createChainMock({ data: { retry_count: 3 }, error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.retryNotification('queue-1')).rejects.toThrow(
        'Max retries exceeded'
      );
    });

    it('throws when notification not found', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.retryNotification('queue-1')).rejects.toThrow(
        'Notification not found'
      );
    });
  });

  // ── cancelNotification ────────────────────────────────────────────────────
  describe('cancelNotification', () => {
    it('cancels notification successfully', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.cancelNotification('queue-1')).resolves.toBeUndefined();
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(notificationQueueService.cancelNotification('queue-1')).rejects.toThrow(
        'Failed to cancel notification'
      );
    });
  });

  // ── cleanup ───────────────────────────────────────────────────────────────
  describe('cleanup', () => {
    it('returns count of deleted notifications', async () => {
      const chain = createChainMock({ data: [{ id: '1' }, { id: '2' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await notificationQueueService.cleanup();

      expect(result).toBe(2);
    });

    it('returns 0 on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await notificationQueueService.cleanup();

      expect(result).toBe(0);
    });
  });
});
