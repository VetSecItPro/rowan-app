// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, whileInView, viewport, custom, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { StatCard, ProgressBar, TrendIndicator, type StatCardConfig } from '@/components/dashboard/StatCard';
import { CheckSquare } from 'lucide-react';

const mockConfig: StatCardConfig = {
  href: '/tasks',
  title: 'Tasks',
  linkClass: 'hover:border-blue-500',
  titleClass: 'text-blue-400',
  footerClass: 'text-blue-400',
  icon: CheckSquare,
  iconGradient: 'from-blue-500 to-blue-600',
  mainValue: 5,
  mainLabel: 'total tasks',
  trend: 2,
  trendLabel: 'new',
};

describe('StatCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatCard config={mockConfig} index={0} />);
    expect(container).toBeTruthy();
  });

  it('displays title', () => {
    render(<StatCard config={mockConfig} index={0} />);
    expect(screen.getByText('Tasks')).toBeTruthy();
  });

  it('displays main value', () => {
    render(<StatCard config={mockConfig} index={0} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('displays main label', () => {
    render(<StatCard config={mockConfig} index={0} />);
    expect(screen.getByText('total tasks')).toBeTruthy();
  });

  it('renders link to href', () => {
    render(<StatCard config={mockConfig} index={0} />);
    expect(screen.getByRole('link')).toHaveProperty('href');
  });

  it('renders View all footer text', () => {
    render(<StatCard config={mockConfig} index={0} />);
    expect(screen.getByText('View all')).toBeTruthy();
  });

  it('renders trend indicator when trend is non-zero', () => {
    render(<StatCard config={mockConfig} index={0} />);
    expect(screen.getByText(/2 new/)).toBeTruthy();
  });

  it('renders detail rows when provided', () => {
    const configWithDetails = {
      ...mockConfig,
      details: [{ left: 'Due today', right: '3' }],
    };
    render(<StatCard config={configWithDetails} index={0} />);
    expect(screen.getByText('Due today')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders alerts when provided', () => {
    const configWithAlerts = {
      ...mockConfig,
      alerts: [{ text: '2 overdue', colorClass: 'text-red-400', icon: 'alert' as const }],
    };
    render(<StatCard config={configWithAlerts} index={0} />);
    expect(screen.getByText('2 overdue')).toBeTruthy();
  });

  it('renders extra text when provided', () => {
    const configWithExtra = { ...mockConfig, extraText: 'Last updated today' };
    render(<StatCard config={configWithExtra} index={0} />);
    expect(screen.getByText('Last updated today')).toBeTruthy();
  });

  it('renders progress bar when progress provided', () => {
    const configWithProgress = {
      ...mockConfig,
      progress: { value: 3, max: 5, color: 'blue', showLabel: true },
    };
    render(<StatCard config={configWithProgress} index={0} />);
    expect(screen.getByText('60% complete')).toBeTruthy();
  });

  it('renders highlight box when provided', () => {
    const configWithHighlight = {
      ...mockConfig,
      highlight: {
        label: 'Next event',
        title: 'Team Meeting',
        bgClass: 'bg-blue-900/20',
        labelClass: 'text-blue-300',
      },
    };
    render(<StatCard config={configWithHighlight} index={0} />);
    expect(screen.getByText('Team Meeting')).toBeTruthy();
    expect(screen.getByText('Next event')).toBeTruthy();
  });

  it('renders recent items when provided', () => {
    const configWithItems = {
      ...mockConfig,
      recentItems: [
        { id: 'i1', title: 'Buy groceries' },
        { id: 'i2', title: 'Call doctor' },
      ],
    };
    render(<StatCard config={configWithItems} index={0} />);
    expect(screen.getByText('• Buy groceries')).toBeTruthy();
  });
});

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressBar value={3} max={5} />);
    expect(container).toBeTruthy();
  });

  it('shows percentage label by default', () => {
    render(<ProgressBar value={3} max={5} />);
    expect(screen.getByText('60% complete')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    render(<ProgressBar value={3} max={5} showLabel={false} />);
    expect(screen.queryByText('60% complete')).toBeNull();
  });

  it('renders 0% for zero max', () => {
    render(<ProgressBar value={0} max={0} />);
    expect(screen.getByText('0% complete')).toBeTruthy();
  });
});

describe('TrendIndicator', () => {
  it('renders nothing when value is zero', () => {
    const { container } = render(<TrendIndicator value={0} label="new" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows positive trend', () => {
    render(<TrendIndicator value={3} label="added" />);
    expect(screen.getByText('3 added')).toBeTruthy();
  });

  it('shows negative trend', () => {
    render(<TrendIndicator value={-2} label="removed" />);
    expect(screen.getByText('2 removed')).toBeTruthy();
  });
});
