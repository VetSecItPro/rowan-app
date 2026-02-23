// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}));

import MilestonesBarChart from '@/components/goals/analytics/MilestonesBarChart';

const mockData = [
  { week: 'Week 1', completed: 3, total: 5 },
  { week: 'Week 2', completed: 2, total: 4 },
];

describe('MilestonesBarChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<MilestonesBarChart data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    render(<MilestonesBarChart data={mockData} />);
    expect(screen.getByText('Milestones Completion Trends')).toBeTruthy();
  });

  it('renders bar chart when data is present', () => {
    render(<MilestonesBarChart data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    render(<MilestonesBarChart data={[]} />);
    expect(screen.getByText('No milestones data available')).toBeTruthy();
  });

  it('renders empty state when data is undefined', () => {
    render(<MilestonesBarChart data={undefined as unknown as []} />);
    expect(screen.getByText('No milestones data available')).toBeTruthy();
  });
});
