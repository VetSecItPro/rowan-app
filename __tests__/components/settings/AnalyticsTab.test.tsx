// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import AnalyticsTab from '@/components/settings/AnalyticsTab';

describe('AnalyticsTab', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnalyticsTab />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays the Analytics & Insights heading', () => {
    render(<AnalyticsTab />);
    expect(screen.getByText('Analytics & Insights')).toBeTruthy();
  });

  it('displays all 8 analytics feature cards', () => {
    render(<AnalyticsTab />);
    expect(screen.getByText('Tasks & Chores')).toBeTruthy();
    expect(screen.getByText('Calendar & Events')).toBeTruthy();
    expect(screen.getByText('Reminders')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
    expect(screen.getByText('Shopping Lists')).toBeTruthy();
    expect(screen.getByText('Meal Planning')).toBeTruthy();
    expect(screen.getByText('Budget Tracking')).toBeTruthy();
    expect(screen.getByText('Goals & Milestones')).toBeTruthy();
  });

  it('renders View Analytics links', () => {
    render(<AnalyticsTab />);
    const links = screen.getAllByText('View Analytics');
    expect(links.length).toBe(8);
  });

  it('links to correct analytics pages', () => {
    render(<AnalyticsTab />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/settings/analytics/tasks');
    expect(hrefs).toContain('/settings/analytics/budget');
  });
});
