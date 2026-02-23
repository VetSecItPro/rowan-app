// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/shared/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ClientErrorBoundary from '@/components/shared/ClientErrorBoundary';

describe('ClientErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <ClientErrorBoundary>
        <div>Test child</div>
      </ClientErrorBoundary>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders its children', () => {
    render(
      <ClientErrorBoundary>
        <div>Hello World</div>
      </ClientErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders multiple children', () => {
    render(
      <ClientErrorBoundary>
        <span>Child 1</span>
        <span>Child 2</span>
      </ClientErrorBoundary>
    );
    expect(screen.getByText('Child 1')).toBeTruthy();
    expect(screen.getByText('Child 2')).toBeTruthy();
  });
});
