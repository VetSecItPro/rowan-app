// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/tasks'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/components/layout/Breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: Array<{ label: string; href?: string }> }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' },
      items.map((item) => React.createElement('span', { key: item.label }, item.label))
    ),
}));

vi.mock('@/components/navigation/Footer', () => ({
  Footer: () => React.createElement('footer', { 'data-testid': 'footer' }, 'Footer'),
}));

vi.mock('@/components/ui/SmartBackgroundCanvas', () => ({
  SmartBackgroundCanvas: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'smart-bg' }, children),
}));

vi.mock('@/lib/hooks/useFeatureTracking', () => ({
  useFeatureTracking: vi.fn(() => ({
    trackPageView: vi.fn(),
  })),
}));

const mockUseLayoutHandlesFooter = vi.fn(() => false);

vi.mock('@/lib/contexts/layout-context', () => ({
  useLayoutHandlesFooter: () => mockUseLayoutHandlesFooter(),
}));

import { FeatureLayout } from '@/components/layout/FeatureLayout';

describe('FeatureLayout', () => {
  const breadcrumbItems = [{ label: 'Tasks', href: '/tasks' }];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLayoutHandlesFooter.mockReturnValue(false);
  });

  it('renders without crashing', () => {
    const { container } = render(
      <FeatureLayout breadcrumbItems={breadcrumbItems}>
        <div>Content</div>
      </FeatureLayout>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders children', () => {
    render(
      <FeatureLayout breadcrumbItems={breadcrumbItems}>
        <div>Test child content</div>
      </FeatureLayout>
    );
    expect(screen.getByText('Test child content')).toBeTruthy();
  });

  it('renders breadcrumb with items', () => {
    render(
      <FeatureLayout breadcrumbItems={breadcrumbItems}>
        <div>Content</div>
      </FeatureLayout>
    );
    expect(screen.getByTestId('breadcrumb')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
  });

  it('renders the SmartBackgroundCanvas wrapper', () => {
    render(
      <FeatureLayout breadcrumbItems={breadcrumbItems}>
        <div>Content</div>
      </FeatureLayout>
    );
    expect(screen.getByTestId('smart-bg')).toBeTruthy();
  });

  it('renders footer when layout does not handle footer', () => {
    mockUseLayoutHandlesFooter.mockReturnValue(false);
    render(
      <FeatureLayout breadcrumbItems={breadcrumbItems}>
        <div>Content</div>
      </FeatureLayout>
    );
    expect(screen.getByTestId('footer')).toBeTruthy();
  });

  it('hides footer when layoutHandlesFooter is true', () => {
    mockUseLayoutHandlesFooter.mockReturnValue(true);
    render(
      <FeatureLayout breadcrumbItems={breadcrumbItems}>
        <div>Content</div>
      </FeatureLayout>
    );
    expect(screen.queryByTestId('footer')).toBeNull();
  });

  it('renders with custom backgroundVariant prop', () => {
    const { container } = render(
      <FeatureLayout breadcrumbItems={breadcrumbItems} backgroundVariant="vibrant">
        <div>Content</div>
      </FeatureLayout>
    );
    expect(container.firstChild).not.toBeNull();
  });
});
