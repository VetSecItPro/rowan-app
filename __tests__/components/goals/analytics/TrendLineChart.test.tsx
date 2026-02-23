// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}));

import TrendLineChart from '@/components/goals/analytics/TrendLineChart';

const mockData = [
  { date: '2026-01-01', progress: 20, completed: 1 },
  { date: '2026-01-15', progress: 50, completed: 2 },
  { date: '2026-02-01', progress: 80, completed: 4 },
];

describe('TrendLineChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrendLineChart data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    render(<TrendLineChart data={mockData} />);
    expect(screen.getByText('Progress Trends Over Time')).toBeTruthy();
  });

  it('renders line chart when data is present', () => {
    render(<TrendLineChart data={mockData} />);
    expect(screen.getByTestId('line-chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    render(<TrendLineChart data={[]} />);
    expect(screen.getByText('No progress data available')).toBeTruthy();
  });

  it('renders empty state when data is undefined', () => {
    render(<TrendLineChart data={undefined as unknown as []} />);
    expect(screen.getByText('No progress data available')).toBeTruthy();
  });
});
