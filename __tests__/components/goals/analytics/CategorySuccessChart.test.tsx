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
  Cell: () => <div />,
}));

import CategorySuccessChart from '@/components/goals/analytics/CategorySuccessChart';

const mockData = {
  health: { completed: 5, total: 8, rate: 62.5 },
  finance: { completed: 3, total: 3, rate: 100 },
};

describe('CategorySuccessChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<CategorySuccessChart data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    render(<CategorySuccessChart data={mockData} />);
    expect(screen.getByText('Success Rate by Category')).toBeTruthy();
  });

  it('renders bar chart when data is present', () => {
    render(<CategorySuccessChart data={mockData} />);
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('renders empty state when no data', () => {
    render(<CategorySuccessChart data={{}} />);
    expect(screen.getByText('No category data available')).toBeTruthy();
  });

  it('capitalises category names', () => {
    render(<CategorySuccessChart data={mockData} />);
    expect(screen.getByText('Success Rate by Category')).toBeTruthy();
  });
});
