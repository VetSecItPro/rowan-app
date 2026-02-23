import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBills,
  getBillById,
  getBillsByStatus,
  getUpcomingBills,
  updateBill,
  deleteBill,
  getBillStats,
  markOverdueBills,
} from '@/lib/services/bills-service';

// ── Supabase client mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockClient = { from: vi.fn(), rpc: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: { createExpense: vi.fn().mockResolvedValue({ id: 'exp-new' }) },
}));
vi.mock('@/lib/services/reminders-service', () => ({
  remindersService: { createReminder: vi.fn().mockResolvedValue({ id: 'rem-1' }) },
}));
vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    createEvent: vi.fn().mockResolvedValue({ id: 'evt-1' }),
    updateEventStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

const NOW = new Date().toISOString().split('T')[0];
const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const MOCK_BILL = {
  id: 'bill-1',
  space_id: 'space-1',
  name: 'Netflix',
  amount: 15.99,
  category: 'Entertainment',
  payee: 'Netflix Inc.',
  notes: null,
  due_date: FUTURE,
  frequency: 'monthly' as const,
  status: 'scheduled' as const,
  auto_pay: false,
  last_paid_date: null,
  next_due_date: null,
  linked_expense_id: null,
  linked_calendar_event_id: null,
  linked_reminder_id: null,
  reminder_enabled: true,
  reminder_days_before: 3,
  last_reminder_sent_at: null,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('bills-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getBills ──────────────────────────────────────────────────────────────
  describe('getBills', () => {
    it('returns array of bills on success', async () => {
      const chain = createChainMock({ data: [MOCK_BILL], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBills('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Netflix');
    });

    it('returns empty array when no bills', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBills('space-1');

      expect(result).toEqual([]);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getBills('space-1')).rejects.toBeTruthy();
    });
  });

  // ── getBillById ───────────────────────────────────────────────────────────
  describe('getBillById', () => {
    it('returns a single bill', async () => {
      const chain = createChainMock({ data: MOCK_BILL, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBillById('bill-1');

      expect(result).toEqual(MOCK_BILL);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getBillById('bill-1')).rejects.toBeTruthy();
    });

    it('returns null when bill does not exist', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBillById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ── getBillsByStatus ──────────────────────────────────────────────────────
  describe('getBillsByStatus', () => {
    it('returns bills matching the given status', async () => {
      const chain = createChainMock({ data: [MOCK_BILL], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBillsByStatus('space-1', 'scheduled');

      expect(result).toHaveLength(1);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getBillsByStatus('space-1', 'overdue')).rejects.toBeTruthy();
    });
  });

  // ── getUpcomingBills ──────────────────────────────────────────────────────
  describe('getUpcomingBills', () => {
    it('returns scheduled bills within 30 days', async () => {
      const chain = createChainMock({ data: [MOCK_BILL], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUpcomingBills('space-1');

      expect(result).toHaveLength(1);
    });

    it('returns empty array when none upcoming', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUpcomingBills('space-1');

      expect(result).toEqual([]);
    });
  });

  // ── updateBill ────────────────────────────────────────────────────────────
  describe('updateBill', () => {
    it('returns updated bill', async () => {
      const updated = { ...MOCK_BILL, amount: 20 };
      const chain = createChainMock({ data: updated, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await updateBill('bill-1', { amount: 20 });

      expect(result.amount).toBe(20);
    });

    it('throws when update fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Update error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(updateBill('bill-1', { amount: 20 })).rejects.toBeTruthy();
    });
  });

  // ── deleteBill ────────────────────────────────────────────────────────────
  describe('deleteBill', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteBill('bill-1')).resolves.toBeUndefined();
    });

    it('throws when delete fails', async () => {
      const chain = createChainMock({ error: { message: 'Delete failed' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteBill('bill-1')).rejects.toBeTruthy();
    });
  });

  // ── getBillStats ──────────────────────────────────────────────────────────
  describe('getBillStats', () => {
    it('computes stats from bills array', async () => {
      const bills = [
        { ...MOCK_BILL, status: 'scheduled', due_date: NOW },
        { ...MOCK_BILL, id: 'bill-2', status: 'paid', due_date: NOW },
        { ...MOCK_BILL, id: 'bill-3', status: 'overdue', due_date: NOW },
      ];
      const chain = createChainMock({ data: bills, error: null });
      mockClient.from.mockReturnValue(chain);

      const stats = await getBillStats('space-1');

      expect(stats.total).toBe(3);
      expect(stats.paid).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.scheduled).toBe(1);
    });

    it('returns zero stats when no bills', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);

      const stats = await getBillStats('space-1');

      expect(stats.total).toBe(0);
      expect(stats.totalAmountDue).toBe(0);
    });
  });

  // ── markOverdueBills ──────────────────────────────────────────────────────
  describe('markOverdueBills', () => {
    it('calls rpc to mark overdue bills', async () => {
      mockClient.rpc.mockResolvedValue({ error: null });

      await markOverdueBills();

      expect(mockClient.rpc).toHaveBeenCalledWith('mark_bills_overdue');
    });
  });
});
