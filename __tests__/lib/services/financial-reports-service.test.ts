import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase client mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// Use vi.hoisted so mockClient and mockRpc are available inside vi.mock factories
const { mockRpc, mockClient } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockClient = { from: vi.fn(), rpc: mockRpc };
  return { mockRpc, mockClient };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/utils/app-url', () => ({
  getAppUrl: vi.fn().mockReturnValue('https://app.rowan.com'),
}));

// Import after mocks
import {
  getReportTemplates,
  getReportTemplate,
  createReportTemplate,
  getGeneratedReports,
  getGeneratedReport,
  deleteReport,
  financialReportsService,
} from '@/lib/services/financial-reports-service';

const MOCK_TEMPLATE = {
  id: 'tmpl-1',
  name: 'Monthly Summary',
  description: 'Monthly report',
  category: 'summary' as const,
  report_type: 'monthly' as const,
  config: { charts: ['category_breakdown'], metrics: ['total_expenses'] },
  default_date_range: 'last_month',
  is_system: true,
  is_active: true,
  requires_goals: false,
  requires_budget: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_REPORT = {
  id: 'rpt-1',
  template_id: 'tmpl-1',
  space_id: 'space-1',
  title: 'January Report',
  report_type: 'monthly',
  date_range_start: '2026-01-01',
  date_range_end: '2026-01-31',
  data: {},
  charts_config: {},
  summary_stats: {},
  generated_at: '2026-01-31T00:00:00Z',
  generated_by: 'user-1',
  status: 'generated' as const,
  is_shared: false,
  view_count: 0,
  download_count: 0,
  created_at: '2026-01-31T00:00:00Z',
  updated_at: '2026-01-31T00:00:00Z',
};

describe('financial-reports-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getReportTemplates ────────────────────────────────────────────────────
  describe('getReportTemplates', () => {
    it('returns active templates', async () => {
      const chain = createChainMock({ data: [MOCK_TEMPLATE], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getReportTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Monthly Summary');
    });

    it('returns empty array when none found', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getReportTemplates();

      expect(result).toEqual([]);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getReportTemplates()).rejects.toBeTruthy();
    });

    it('filters by category when provided', async () => {
      const chain = createChainMock({ data: [MOCK_TEMPLATE], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getReportTemplates(undefined, 'summary');

      expect(result).toHaveLength(1);
    });
  });

  // ── getReportTemplate ─────────────────────────────────────────────────────
  describe('getReportTemplate', () => {
    it('returns template by id', async () => {
      const chain = createChainMock({ data: MOCK_TEMPLATE, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getReportTemplate('tmpl-1');

      expect(result?.id).toBe('tmpl-1');
    });

    it('returns null when not found (PGRST116)', async () => {
      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getReportTemplate('nonexistent');

      expect(result).toBeNull();
    });

    it('throws for non-404 errors', async () => {
      const chain = createChainMock({ data: null, error: { code: 'OTHER', message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getReportTemplate('tmpl-1')).rejects.toBeTruthy();
    });
  });

  // ── createReportTemplate ──────────────────────────────────────────────────
  describe('createReportTemplate', () => {
    it('returns the created template', async () => {
      const chain = createChainMock({ data: MOCK_TEMPLATE, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await createReportTemplate('user-1', {
        name: 'Custom Report',
        category: 'expenses',
        report_type: 'monthly',
        config: { charts: [], metrics: [] },
        space_id: 'space-1',
      });

      expect(result.name).toBe('Monthly Summary');
    });

    it('throws on insert error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(
        createReportTemplate('user-1', {
          name: 'X',
          category: 'expenses',
          report_type: 'monthly',
          config: { charts: [], metrics: [] },
          space_id: 'space-1',
        })
      ).rejects.toBeTruthy();
    });
  });

  // ── getGeneratedReports ───────────────────────────────────────────────────
  describe('getGeneratedReports', () => {
    it('returns generated reports for space', async () => {
      const chain = createChainMock({ data: [MOCK_REPORT], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getGeneratedReports('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rpt-1');
    });

    it('returns empty array on null data', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getGeneratedReports('space-1');

      expect(result).toEqual([]);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getGeneratedReports('space-1')).rejects.toBeTruthy();
    });
  });

  // ── getGeneratedReport ────────────────────────────────────────────────────
  describe('getGeneratedReport', () => {
    it('returns specific report by id', async () => {
      const chain = createChainMock({ data: MOCK_REPORT, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getGeneratedReport('rpt-1');

      expect(result?.id).toBe('rpt-1');
    });

    it('returns null when not found (PGRST116)', async () => {
      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getGeneratedReport('nonexistent');

      expect(result).toBeNull();
    });

    it('throws for non-404 errors', async () => {
      const chain = createChainMock({ data: null, error: { code: 'OTHER', message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getGeneratedReport('rpt-1')).rejects.toBeTruthy();
    });
  });

  // ── deleteReport ──────────────────────────────────────────────────────────
  describe('deleteReport', () => {
    it('resolves without error', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteReport('rpt-1')).resolves.toBeUndefined();
    });

    it('throws on delete error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteReport('rpt-1')).rejects.toBeTruthy();
    });
  });

  // ── financialReportsService singleton ─────────────────────────────────────
  describe('financialReportsService singleton', () => {
    it('exposes required service methods', () => {
      expect(typeof financialReportsService.getReportTemplates).toBe('function');
      expect(typeof financialReportsService.generateReport).toBe('function');
      expect(typeof financialReportsService.getGeneratedReports).toBe('function');
    });

    it('singleton is a valid object', () => {
      expect(financialReportsService).toBeDefined();
      expect(typeof financialReportsService).toBe('object');
    });
  });
});
