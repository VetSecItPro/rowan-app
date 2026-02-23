// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock recharts to avoid canvas/SVG measurement issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

import { DrillDownChart } from '@/components/admin/DrillDownChart';
import type { DrillDownDataPoint } from '@/components/admin/DrillDownChart';

const sampleData: DrillDownDataPoint[] = [
  { date: '2024-01-01', value: 10 },
  { date: '2024-01-02', value: 20 },
  { date: '2024-01-03', value: 15 },
];

describe('DrillDownChart', () => {
  it('renders without crashing with data', () => {
    const { container } = render(
      <DrillDownChart data={sampleData} metric="Page Views" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the area chart when data is provided', () => {
    render(<DrillDownChart data={sampleData} metric="Visitors" />);
    expect(screen.getByTestId('area-chart')).toBeTruthy();
  });

  it('shows empty state when data is empty', () => {
    render(<DrillDownChart data={[]} metric="Page Views" />);
    expect(screen.getByText('No data available for this metric')).toBeTruthy();
  });

  it('does not render chart when data is empty', () => {
    render(<DrillDownChart data={[]} metric="Page Views" />);
    expect(screen.queryByTestId('area-chart')).toBeNull();
  });

  it('renders previous data comparison when previousData is provided', () => {
    const prevData: DrillDownDataPoint[] = [
      { date: '2023-12-01', value: 8 },
      { date: '2023-12-02', value: 18 },
      { date: '2023-12-03', value: 12 },
    ];
    render(
      <DrillDownChart
        data={sampleData}
        previousData={prevData}
        metric="Page Views"
      />
    );
    // Legend and second Area are rendered when previous data is available
    expect(screen.getByTestId('legend')).toBeTruthy();
  });

  it('does not render legend when no previous data', () => {
    render(<DrillDownChart data={sampleData} metric="Page Views" />);
    expect(screen.queryByTestId('legend')).toBeNull();
  });

  it('accepts custom color prop', () => {
    const { container } = render(
      <DrillDownChart data={sampleData} metric="Revenue" color="#ff0000" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts a custom formatter', () => {
    const formatter = (v: number) => `$${v}`;
    const { container } = render(
      <DrillDownChart data={sampleData} metric="Revenue" formatter={formatter} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
