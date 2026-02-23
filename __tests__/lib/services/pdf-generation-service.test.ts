// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Mock @react-pdf/renderer before importing anything from the service
vi.mock('@react-pdf/renderer', () => {
  const MockDocument = ({ children }: { children: unknown }) => children;
  const MockPage = ({ children }: { children: unknown }) => children;
  const MockText = ({ children }: { children: unknown }) => children;
  const MockView = ({ children }: { children: unknown }) => children;

  return {
    Document: MockDocument,
    Page: MockPage,
    Text: MockText,
    View: MockView,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    pdf: vi.fn().mockReturnValue({
      toBlob: vi.fn().mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
    }),
  };
});

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('January 2026'),
}));

// Import after mocks are set up
import { pdfGenerationService, FinancialReportPDF } from '@/lib/services/pdf-generation-service';
import type { GeneratedReport } from '@/lib/services/financial-reports-service';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeMockReport(overrides: Partial<GeneratedReport> = {}): GeneratedReport {
  return {
    id: 'rpt-1',
    template_id: 'tmpl-1',
    space_id: 'space-1',
    title: 'January 2026 Report',
    description: 'Monthly summary',
    report_type: 'monthly',
    date_range_start: '2026-01-01',
    date_range_end: '2026-01-31',
    data: {
      expenses: [
        { id: 'exp-1', amount: 100, category: 'Food', date: '2026-01-15', is_recurring: false },
      ],
      budgets: [
        { category: 'Food', budgeted_amount: 500, period: 'monthly' },
      ],
      goals: [],
      metrics: {
        total_expenses: 100,
        expense_count: 1,
        avg_expense: 100,
        max_expense: 100,
        categories_count: 1,
        vendors_count: 0,
      },
      date_range: { start: '2026-01-01', end: '2026-01-31' },
      generated_at: '2026-01-31T00:00:00Z',
    },
    charts_config: {},
    summary_stats: {
      total_expenses: 100,
      expense_count: 1,
      avg_expense: 100,
      max_expense: 100,
      categories_count: 1,
      vendors_count: 0,
    },
    generated_at: '2026-01-31T00:00:00Z',
    generated_by: 'user-1',
    status: 'generated',
    is_shared: false,
    view_count: 0,
    download_count: 0,
    created_at: '2026-01-31T00:00:00Z',
    updated_at: '2026-01-31T00:00:00Z',
    ...overrides,
  };
}

describe('pdf-generation-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── FinancialReportPDF component ──────────────────────────────────────────
  describe('FinancialReportPDF', () => {
    it('is exported as a React component', () => {
      expect(typeof FinancialReportPDF).toBe('function');
    });
  });

  // ── pdfGenerationService.generatePDFBlob ──────────────────────────────────
  describe('generatePDFBlob', () => {
    it('generates a PDF blob from a report', async () => {
      const report = makeMockReport();

      const blob = await pdfGenerationService.generatePDFBlob(report);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('handles report with no expenses', async () => {
      const report = makeMockReport({
        data: {
          expenses: [],
          budgets: [],
          goals: [],
          metrics: {
            total_expenses: 0,
            expense_count: 0,
            avg_expense: 0,
            max_expense: 0,
            categories_count: 0,
            vendors_count: 0,
          },
          date_range: { start: '2026-01-01', end: '2026-01-31' },
          generated_at: '2026-01-31T00:00:00Z',
        },
      });

      const blob = await pdfGenerationService.generatePDFBlob(report);

      expect(blob).toBeInstanceOf(Blob);
    });

    it('handles report with goals data', async () => {
      const report = makeMockReport({
        data: {
          expenses: [],
          budgets: [],
          goals: [{ id: 'goal-1', title: 'Save $1000', status: 'active', progress: 50 }],
          metrics: {
            total_expenses: 0,
            expense_count: 0,
            avg_expense: 0,
            max_expense: 0,
            categories_count: 0,
            vendors_count: 0,
          },
          date_range: { start: '2026-01-01', end: '2026-01-31' },
          generated_at: '2026-01-31T00:00:00Z',
        },
      });

      const blob = await pdfGenerationService.generatePDFBlob(report);

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ── pdfGenerationService.generateAndDownloadPDF ───────────────────────────
  describe('generateAndDownloadPDF', () => {
    it('triggers browser download', async () => {
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test');
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const mockAnchor = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());

      const report = makeMockReport({ title: 'January Report' });

      await pdfGenerationService.generateAndDownloadPDF(report);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  // ── pdfGenerationService.estimatePDFSize ──────────────────────────────────
  describe('estimatePDFSize', () => {
    it('returns base size for empty report', () => {
      const report = makeMockReport({
        data: {
          expenses: [],
          budgets: [],
          goals: [],
          metrics: { total_expenses: 0, expense_count: 0, avg_expense: 0, max_expense: 0, categories_count: 0, vendors_count: 0 },
          date_range: { start: '2026-01-01', end: '2026-01-31' },
          generated_at: '2026-01-31T00:00:00Z',
        },
      });

      const size = pdfGenerationService.estimatePDFSize(report);

      expect(size).toBe(50000); // base size only
    });

    it('increases size estimate with more expenses', () => {
      const reportSmall = makeMockReport();
      const reportLarge = makeMockReport({
        data: {
          ...makeMockReport().data,
          expenses: Array(10).fill({ id: 'exp-1', amount: 100, category: 'Food', date: '2026-01-15', is_recurring: false }),
        },
      });

      const sizeSmall = pdfGenerationService.estimatePDFSize(reportSmall);
      const sizeLarge = pdfGenerationService.estimatePDFSize(reportLarge);

      expect(sizeLarge).toBeGreaterThan(sizeSmall);
    });
  });

  // ── pdfGenerationService.validateReportData ───────────────────────────────
  describe('validateReportData', () => {
    it('validates a valid report', () => {
      const report = makeMockReport();

      const result = pdfGenerationService.validateReportData(report);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns errors for missing title', () => {
      const report = makeMockReport({ title: '' });

      const result = pdfGenerationService.validateReportData(report);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Report title is required');
    });

    it('returns errors for missing date range', () => {
      const report = makeMockReport({ date_range_start: '', date_range_end: '' });

      const result = pdfGenerationService.validateReportData(report);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Date range'))).toBe(true);
    });
  });

  // ── pdfGenerationService.getSupportedFormats ──────────────────────────────
  describe('getSupportedFormats', () => {
    it('returns supported format information', () => {
      const formats = pdfGenerationService.getSupportedFormats();

      expect(formats.sizes).toContain('A4');
      expect(formats.formats).toContain('PDF');
      expect(formats.orientations).toContain('portrait');
    });
  });
});
