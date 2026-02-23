// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) =>
      ({ children, ...props }: { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    testId,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    testId?: string;
  }) =>
    isOpen ? (
      <div data-testid={testId || 'modal'}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import { DrillDownModal } from '@/components/admin/DrillDownModal';

describe('DrillDownModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(
      <DrillDownModal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </DrillDownModal>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(
      <DrillDownModal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </DrillDownModal>
    );
    expect(screen.queryByTestId('drill-down-modal')).toBeNull();
  });

  it('displays the title', () => {
    render(
      <DrillDownModal isOpen={true} onClose={vi.fn()} title="Page Views Drill-Down">
        <div>Chart content</div>
      </DrillDownModal>
    );
    expect(screen.getByText('Page Views Drill-Down')).toBeTruthy();
  });

  it('displays the subtitle when provided', () => {
    render(
      <DrillDownModal
        isOpen={true}
        onClose={vi.fn()}
        title="Revenue"
        subtitle="Last 30 days"
      >
        <div>Chart</div>
      </DrillDownModal>
    );
    expect(screen.getByText('Last 30 days')).toBeTruthy();
  });

  it('renders children content', () => {
    render(
      <DrillDownModal isOpen={true} onClose={vi.fn()} title="Test">
        <div data-testid="inner-content">Chart goes here</div>
      </DrillDownModal>
    );
    expect(screen.getByTestId('inner-content')).toBeTruthy();
  });

  it('passes testId to Modal', () => {
    render(
      <DrillDownModal isOpen={true} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </DrillDownModal>
    );
    expect(screen.getByTestId('drill-down-modal')).toBeTruthy();
  });
});
