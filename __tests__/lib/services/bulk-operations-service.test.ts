import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bulkDeleteExpenses,
  bulkDeleteTasks,
  bulkExportByDateRange,
  archiveOldExpenses,
  archiveOldTasks,
  archiveOldCalendarEvents,
  getExpensesBulkDeleteCount,
} from '@/lib/services/bulk-operations-service';

// ── Supabase client mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// Use vi.hoisted so mockClient is available inside vi.mock factory
const { mockClient } = vi.hoisted(() => ({
  mockClient: { from: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('bulk-operations-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── bulkDeleteExpenses ────────────────────────────────────────────────────
  describe('bulkDeleteExpenses', () => {
    it('returns deleted count on success with selectedIds', async () => {
      const chain = createChainMock({ data: [{ id: '1' }, { id: '2' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkDeleteExpenses('space-1', { selectedIds: ['1', '2'] });

      expect(result.success).toBe(true);
      expect(result.deleted_count).toBe(2);
    });

    it('returns deleted count with date range filters', async () => {
      const chain = createChainMock({ data: [{ id: '1' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkDeleteExpenses('space-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result.success).toBe(true);
    });

    it('returns success:false on db error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkDeleteExpenses('space-1', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });

    it('returns success:false on thrown exception', async () => {
      mockClient.from.mockImplementation(() => { throw new Error('Connection error'); });

      const result = await bulkDeleteExpenses('space-1', {});

      expect(result.success).toBe(false);
    });
  });

  // ── bulkDeleteTasks ───────────────────────────────────────────────────────
  describe('bulkDeleteTasks', () => {
    it('returns deleted count for completed tasks', async () => {
      const chain = createChainMock({ data: [{ id: 't-1' }, { id: 't-2' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkDeleteTasks('space-1', { completed: true });

      expect(result.success).toBe(true);
      expect(result.deleted_count).toBe(2);
    });

    it('returns success:false on error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkDeleteTasks('space-1', {});

      expect(result.success).toBe(false);
    });
  });

  // ── bulkExportByDateRange ─────────────────────────────────────────────────
  describe('bulkExportByDateRange', () => {
    it('returns data for user with spaces', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        }
        return createChainMock({ data: [{ id: 'exp-1', amount: 100 }], error: null, count: 1 });
      });

      const result = await bulkExportByDateRange('user-1', 'expenses', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('returns empty data when user has no spaces', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkExportByDateRange('user-1', 'expenses', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('returns success:false on spaces query error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Permission denied' } });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkExportByDateRange('user-1', 'expenses', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(false);
    });

    it('returns success:false for invalid data type', async () => {
      const chain = createChainMock({ data: [{ space_id: 'space-1' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await bulkExportByDateRange(
        'user-1',
        'invalid_type' as 'expenses',
        '2026-01-01',
        '2026-01-31'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data type');
    });
  });

  // ── archiveOldExpenses ────────────────────────────────────────────────────
  describe('archiveOldExpenses', () => {
    it('returns archived count on success', async () => {
      const chain = createChainMock({ data: [{ id: '1' }, { id: '2' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await archiveOldExpenses('space-1', '2025-01-01');

      expect(result.success).toBe(true);
      expect(result.archived_count).toBe(2);
    });

    it('returns success:false on error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await archiveOldExpenses('space-1', '2025-01-01');

      expect(result.success).toBe(false);
    });
  });

  // ── archiveOldTasks ───────────────────────────────────────────────────────
  describe('archiveOldTasks', () => {
    it('returns archived count on success', async () => {
      const chain = createChainMock({ data: [{ id: 't-1' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await archiveOldTasks('space-1', '2025-01-01');

      expect(result.success).toBe(true);
      expect(result.archived_count).toBe(1);
    });
  });

  // ── archiveOldCalendarEvents ──────────────────────────────────────────────
  describe('archiveOldCalendarEvents', () => {
    it('returns archived count on success', async () => {
      const chain = createChainMock({ data: [{ id: 'evt-1' }, { id: 'evt-2' }], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await archiveOldCalendarEvents('space-1', '2025-01-01');

      expect(result.success).toBe(true);
      expect(result.archived_count).toBe(2);
    });

    it('returns success:false on error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await archiveOldCalendarEvents('space-1', '2025-01-01');

      expect(result.success).toBe(false);
    });
  });

  // ── getExpensesBulkDeleteCount ────────────────────────────────────────────
  describe('getExpensesBulkDeleteCount', () => {
    it('returns count of matching expenses', async () => {
      const chain = createChainMock({ count: 5 });
      mockClient.from.mockReturnValue(chain);

      const result = await getExpensesBulkDeleteCount('space-1', { startDate: '2026-01-01' });

      expect(result).toBe(5);
    });

    it('returns 0 on error', async () => {
      mockClient.from.mockImplementation(() => { throw new Error('error'); });

      const result = await getExpensesBulkDeleteCount('space-1', {});

      expect(result).toBe(0);
    });
  });
});
