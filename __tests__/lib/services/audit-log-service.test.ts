import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logAuditEvent,
  getUserAuditLog,
  logDataExport,
  logAccountLogin,
  logAccountLogout,
  logPasswordChange,
  logEmailChange,
  logProfileView,
} from '@/lib/services/audit-log-service';

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

describe('audit-log-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── logAuditEvent ─────────────────────────────────────────────────────────
  describe('logAuditEvent', () => {
    it('returns success:true when insert succeeds', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logAuditEvent({
        user_id: 'user-1',
        action: 'login',
        action_category: 'account',
      });

      expect(result.success).toBe(true);
    });

    it('returns success:false with error message when insert fails', async () => {
      const chain = createChainMock({ error: { message: 'DB write error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await logAuditEvent({
        user_id: 'user-1',
        action: 'login',
        action_category: 'account',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB write error');
    });

    it('handles thrown exceptions gracefully', async () => {
      mockClient.from.mockImplementation(() => { throw new Error('Connection refused'); });

      const result = await logAuditEvent({
        user_id: 'user-1',
        action: 'login',
        action_category: 'account',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  // ── getUserAuditLog ───────────────────────────────────────────────────────
  describe('getUserAuditLog', () => {
    const MOCK_LOG = [
      { id: 'log-1', user_id: 'user-1', action: 'login', action_category: 'account', timestamp: '2026-01-01T00:00:00Z' },
    ];

    it('returns log entries on success', async () => {
      const chain = createChainMock({ data: MOCK_LOG, error: null, count: 1 });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserAuditLog('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('returns success:false when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Query failed' }, count: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserAuditLog('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });

    it('applies optional category filter', async () => {
      const chain = createChainMock({ data: MOCK_LOG, error: null, count: 1 });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserAuditLog('user-1', { category: 'security' });

      expect(result.success).toBe(true);
    });
  });

  // ── helper functions ──────────────────────────────────────────────────────
  describe('helper audit functions', () => {
    it('logDataExport calls logAuditEvent with correct category', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logDataExport('user-1', 'json', 'expenses');

      expect(result.success).toBe(true);
    });

    it('logAccountLogin returns success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logAccountLogin('user-1', '127.0.0.1', 'Mozilla/5.0');

      expect(result.success).toBe(true);
    });

    it('logAccountLogout returns success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logAccountLogout('user-1');

      expect(result.success).toBe(true);
    });

    it('logPasswordChange returns success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logPasswordChange('user-1');

      expect(result.success).toBe(true);
    });

    it('logEmailChange returns success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logEmailChange('user-1', 'new@example.com');

      expect(result.success).toBe(true);
    });

    it('logProfileView returns success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await logProfileView('user-1');

      expect(result.success).toBe(true);
    });

    it('helper functions return failure on DB error', async () => {
      const chain = createChainMock({ error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await logAccountLogin('user-1');

      expect(result.success).toBe(false);
    });
  });
});
