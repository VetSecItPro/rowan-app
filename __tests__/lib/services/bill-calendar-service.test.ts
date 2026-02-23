import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBillCalendarEvent,
  getUpcomingBills,
  getBillsDueThisWeek,
  getBillsDueToday,
  getOverdueBills,
  markBillAsPaid,
  getTotalBillsUpcoming,
} from '@/lib/services/bill-calendar-service';

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
  mockClient: { from: vi.fn(), rpc: vi.fn(), channel: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const MOCK_BILLS = [
  {
    event_id: 'evt-1',
    expense_id: 'exp-1',
    title: 'Rent',
    amount: 1200,
    due_date: '2026-03-01',
    category: 'Housing',
    payment_method: 'bank_transfer',
    days_until_due: 7,
  },
  {
    event_id: 'evt-2',
    expense_id: 'exp-2',
    title: 'Electricity',
    amount: 80,
    due_date: '2026-03-05',
    category: 'Utilities',
    payment_method: null,
    days_until_due: 0,
  },
];

describe('bill-calendar-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── createBillCalendarEvent ───────────────────────────────────────────────
  describe('createBillCalendarEvent', () => {
    it('returns event id from rpc on success', async () => {
      mockClient.rpc.mockResolvedValue({ data: 'evt-new', error: null });

      const result = await createBillCalendarEvent('exp-1');

      expect(result).toBe('evt-new');
    });

    it('returns null when rpc fails', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      const result = await createBillCalendarEvent('exp-1');

      expect(result).toBeNull();
    });
  });

  // ── getUpcomingBills ──────────────────────────────────────────────────────
  describe('getUpcomingBills', () => {
    it('returns bills array on success', async () => {
      mockClient.rpc.mockResolvedValue({ data: MOCK_BILLS, error: null });

      const result = await getUpcomingBills('space-1', 30);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Rent');
    });

    it('returns empty array when rpc fails', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await getUpcomingBills('space-1');

      expect(result).toEqual([]);
    });

    it('returns empty array when data is null', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await getUpcomingBills('space-1');

      expect(result).toEqual([]);
    });
  });

  // ── getBillsDueThisWeek ───────────────────────────────────────────────────
  describe('getBillsDueThisWeek', () => {
    it('calls getUpcomingBills with 7 days', async () => {
      mockClient.rpc.mockResolvedValue({ data: [MOCK_BILLS[0]], error: null });

      const result = await getBillsDueThisWeek('space-1');

      expect(result).toHaveLength(1);
      expect(mockClient.rpc).toHaveBeenCalledWith('get_upcoming_bills', expect.objectContaining({
        p_days_ahead: 7,
      }));
    });
  });

  // ── getBillsDueToday ──────────────────────────────────────────────────────
  describe('getBillsDueToday', () => {
    it('filters bills where days_until_due is 0', async () => {
      mockClient.rpc.mockResolvedValue({ data: MOCK_BILLS, error: null });

      const result = await getBillsDueToday('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].days_until_due).toBe(0);
    });

    it('returns empty array when no bills due today', async () => {
      mockClient.rpc.mockResolvedValue({ data: [MOCK_BILLS[0]], error: null });

      const result = await getBillsDueToday('space-1');

      expect(result).toHaveLength(0);
    });
  });

  // ── getOverdueBills ───────────────────────────────────────────────────────
  describe('getOverdueBills', () => {
    it('returns mapped overdue bills from events table', async () => {
      const chain = createChainMock({
        data: [
          {
            id: 'evt-1',
            title: 'Overdue Bill',
            start_time: '2026-01-01T00:00:00Z',
            expenses: { id: 'exp-1', amount: 150, category: 'Utilities', payment_method: null },
          },
        ],
        error: null,
      });
      mockClient.from.mockReturnValue(chain);

      const result = await getOverdueBills('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Overdue Bill');
    });

    it('returns empty array on db error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getOverdueBills('space-1');

      expect(result).toEqual([]);
    });
  });

  // ── markBillAsPaid ────────────────────────────────────────────────────────
  describe('markBillAsPaid', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(markBillAsPaid('exp-1')).resolves.toBeUndefined();
    });

    it('throws when update fails', async () => {
      const chain = createChainMock({ error: { message: 'Update failed', code: 'DB_ERROR' } });
      mockClient.from.mockReturnValue(chain);

      await expect(markBillAsPaid('exp-1')).rejects.toBeTruthy();
    });
  });

  // ── getTotalBillsUpcoming ─────────────────────────────────────────────────
  describe('getTotalBillsUpcoming', () => {
    it('returns count and totalAmount from upcoming bills', async () => {
      mockClient.rpc.mockResolvedValue({ data: MOCK_BILLS, error: null });

      const result = await getTotalBillsUpcoming('space-1', 30);

      expect(result.count).toBe(2);
      expect(result.totalAmount).toBe(1280);
    });

    it('returns zero values when no bills', async () => {
      mockClient.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getTotalBillsUpcoming('space-1');

      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
