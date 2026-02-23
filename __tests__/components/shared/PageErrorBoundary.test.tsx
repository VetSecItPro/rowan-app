// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/shared/ErrorBoundary', () => ({
  ErrorBoundary: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode; onError?: () => void }) =>
    <div data-testid="error-boundary">{fallback || children}</div>,
}));

import PageErrorBoundary from '@/components/shared/PageErrorBoundary';

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <PageErrorBoundary>
        <div>Page content</div>
      </PageErrorBoundary>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders an error boundary wrapper', () => {
    render(
      <PageErrorBoundary>
        <div>Content</div>
      </PageErrorBoundary>
    );
    expect(screen.getByTestId('error-boundary')).toBeTruthy();
  });

  it('accepts pageName prop', () => {
    const { container } = render(
      <PageErrorBoundary pageName="Settings">
        <div>Content</div>
      </PageErrorBoundary>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts pageDescription prop', () => {
    const { container } = render(
      <PageErrorBoundary pageName="Settings" pageDescription="the settings page">
        <div>Content</div>
      </PageErrorBoundary>
    );
    expect(container.firstChild).toBeTruthy();
  });
});
