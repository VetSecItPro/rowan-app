// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
  Tooltip: () => <div />,
}));

import CompletionRateChart from '@/components/goals/analytics/CompletionRateChart';

describe('CompletionRateChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CompletionRateChart completed={5} active={3} paused={1} cancelled={0} />
    );
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    render(<CompletionRateChart completed={5} active={3} paused={1} cancelled={0} />);
    expect(screen.getByText('Goal Status Distribution')).toBeTruthy();
  });

  it('renders pie chart when data is present', () => {
    render(<CompletionRateChart completed={5} active={3} paused={1} cancelled={0} />);
    expect(screen.getByTestId('pie-chart')).toBeTruthy();
  });

  it('renders empty state when all values are zero', () => {
    render(<CompletionRateChart completed={0} active={0} paused={0} cancelled={0} />);
    expect(screen.getByText('No goals data available')).toBeTruthy();
  });

  it('renders with only completed goals', () => {
    render(<CompletionRateChart completed={10} active={0} paused={0} cancelled={0} />);
    expect(screen.getByTestId('pie-chart')).toBeTruthy();
  });
});
