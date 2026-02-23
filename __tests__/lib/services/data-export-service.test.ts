import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportAllUserData,
  exportExpensesToCsv,
  exportTasksToCsv,
  exportEventsToCsv,
  exportShoppingListsToCsv,
  exportMessagesToCsv,
  exportAllDataToCsv,
  getDataSubset,
} from '@/lib/services/data-export-service';

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

const mockClient = { from: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('data-export-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── exportAllUserData ─────────────────────────────────────────────────────
  describe('exportAllUserData', () => {
    it('returns full export with data from all tables', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // profiles query
          return createChainMock({ data: { id: 'user-1', email: 'test@test.com' }, error: null });
        }
        if (callCount === 2) {
          // space_members query
          return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        }
        // all subsequent queries for expenses, budgets, etc.
        return createChainMock({ data: [{ id: 'record-1' }], error: null });
      });

      const result = await exportAllUserData('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.export_info.user_id).toBe('user-1');
      expect(result.data?.export_info.format).toBe('JSON');
      expect(result.data?.profile).toBeDefined();
    });

    it('returns empty arrays when user has no spaces', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: { id: 'user-1' }, error: null });
        }
        // No space memberships
        return createChainMock({ data: [], error: null });
      });

      const result = await exportAllUserData('user-1');

      expect(result.success).toBe(true);
      expect(result.data?.expenses).toEqual([]);
      expect(result.data?.tasks).toEqual([]);
    });

    it('returns failure on thrown exception', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await exportAllUserData('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  // ── exportExpensesToCsv ───────────────────────────────────────────────────
  describe('exportExpensesToCsv', () => {
    it('returns CSV string with headers when expenses exist', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        // expenses
        if (callCount === 3) return createChainMock({ data: [{ id: 'exp-1', amount: 100, category: 'Food' }], error: null });
        return createChainMock({ data: [], error: null });
      });

      const csv = await exportExpensesToCsv('user-1');

      expect(typeof csv).toBe('string');
      expect(csv.length).toBeGreaterThan(0);
      expect(csv).toContain('id');
    });

    it('returns empty string when no expenses', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        return createChainMock({ data: [], error: null });
      });

      const csv = await exportExpensesToCsv('user-1');

      expect(csv).toBe('');
    });
  });

  // ── exportTasksToCsv ──────────────────────────────────────────────────────
  describe('exportTasksToCsv', () => {
    it('returns CSV for tasks', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        // tasks query is the 6th from call (expenses, budgets, bills, goals, projects, tasks)
        return createChainMock({ data: [{ id: 'task-1', title: 'Do dishes' }], error: null });
      });

      const csv = await exportTasksToCsv('user-1');

      expect(typeof csv).toBe('string');
    });
  });

  // ── exportEventsToCsv ─────────────────────────────────────────────────────
  describe('exportEventsToCsv', () => {
    it('returns CSV for calendar events', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        return createChainMock({ data: [{ id: 'evt-1', title: 'Dinner' }], error: null });
      });

      const csv = await exportEventsToCsv('user-1');

      expect(typeof csv).toBe('string');
    });
  });

  // ── exportShoppingListsToCsv ──────────────────────────────────────────────
  describe('exportShoppingListsToCsv', () => {
    it('returns CSV for shopping lists', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        return createChainMock({ data: [{ id: 'list-1', name: 'Groceries' }], error: null });
      });

      const csv = await exportShoppingListsToCsv('user-1');

      expect(typeof csv).toBe('string');
    });
  });

  // ── exportMessagesToCsv ───────────────────────────────────────────────────
  describe('exportMessagesToCsv', () => {
    it('returns CSV for messages', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        return createChainMock({ data: [{ id: 'msg-1', content: 'Hello' }], error: null });
      });

      const csv = await exportMessagesToCsv('user-1');

      expect(typeof csv).toBe('string');
    });
  });

  // ── exportAllDataToCsv ────────────────────────────────────────────────────
  describe('exportAllDataToCsv', () => {
    it('returns object of filename-to-csv mappings', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ data: { id: 'user-1' }, error: null });
        if (callCount === 2) return createChainMock({ data: [{ space_id: 'space-1' }], error: null });
        if (callCount === 3) return createChainMock({ data: [{ id: 'exp-1', amount: 100 }], error: null });
        return createChainMock({ data: [], error: null });
      });

      const result = await exportAllDataToCsv('user-1');

      expect(typeof result).toBe('object');
      expect(result['export_info.csv']).toBeDefined();
    });

    it('returns empty object on export failure', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('error');
      });

      const result = await exportAllDataToCsv('user-1');

      expect(result).toEqual({});
    });
  });

  // ── getDataSubset ─────────────────────────────────────────────────────────
  describe('getDataSubset', () => {
    const mockExport = {
      export_info: { export_date: '2026-01-01', user_id: 'user-1', format: 'JSON' as const, version: '1.0' as const },
      profile: null,
      partnerships: [],
      expenses: [{ id: 'exp-1', amount: 100 }],
      budgets: [],
      bills: [],
      goals: [{ id: 'goal-1' }],
      goal_contributions: [],
      projects: [],
      tasks: [{ id: 'task-1' }],
      calendar_events: [{ id: 'evt-1' }],
      reminders: [],
      messages: [{ id: 'msg-1' }],
      shopping_lists: [{ id: 'list-1' }],
      shopping_items: [],
      meals: [],
      recipes: [],
      households: [],
    };

    it('returns expenses subset with correct title', () => {
      const result = getDataSubset(mockExport, 'expenses');

      expect(result.title).toBe('Expenses');
      expect(result.data).toHaveLength(1);
    });

    it('returns tasks subset', () => {
      const result = getDataSubset(mockExport, 'tasks');

      expect(result.title).toContain('Tasks');
      expect(result.data).toHaveLength(1);
    });

    it('returns goals subset', () => {
      const result = getDataSubset(mockExport, 'goals');

      expect(result.data).toHaveLength(1);
    });

    it('returns unknown for invalid data type', () => {
      const result = getDataSubset(mockExport, 'invalid_type');

      expect(result.title).toBe('Unknown Data Type');
      expect(result.data).toEqual([]);
    });

    it('maps "events" alias to calendar_events', () => {
      const result = getDataSubset(mockExport, 'events');

      expect(result.title).toContain('Calendar');
      expect(result.data).toHaveLength(1);
    });
  });
});
