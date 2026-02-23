// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ spaceId: 'space-1' })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/financial-reports-service', () => ({
  getReportTemplates: vi.fn().mockResolvedValue([]),
  getGeneratedReports: vi.fn().mockResolvedValue([]),
  generateReport: vi.fn().mockResolvedValue({}),
  downloadReportPDF: vi.fn().mockResolvedValue(undefined),
  deleteReport: vi.fn().mockResolvedValue(undefined),
  toggleReportFavorite: vi.fn().mockResolvedValue(undefined),
  getReportShareUrl: vi.fn().mockResolvedValue(''),
  updateReportViews: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return { ...actual };
});

// Mock sub-components to keep this test focused
vi.mock('@/components/reports/ReportTemplateSelector', () => ({
  ReportTemplateSelector: () => <div data-testid="template-selector" />,
}));
vi.mock('@/components/reports/ReportLibrary', () => ({
  ReportLibrary: () => <div data-testid="report-library" />,
}));
vi.mock('@/components/reports/ReportGenerator', () => ({
  ReportGenerator: () => <div data-testid="report-generator" />,
}));
vi.mock('@/components/reports/ReportViewer', () => ({
  ReportViewer: () => <div data-testid="report-viewer" />,
}));

import { ReportsPage } from '@/components/reports/ReportsPage';

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReportsPage />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<ReportsPage />);
    // Loading skeleton is present
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders with className prop', () => {
    const { container } = render(<ReportsPage className="custom" />);
    expect(container).toBeTruthy();
  });
});
