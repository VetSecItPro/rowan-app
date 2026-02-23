// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'line-chart' }, children),
  Line: () => React.createElement('div', { 'data-testid': 'line' }),
  XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'grid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
  Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
}));

import { LineChartComponent } from '@/components/charts/charts/LineChartComponent';

const sampleData = [
  { month: 'Jan', value: 100 },
  { month: 'Feb', value: 200 },
  { month: 'Mar', value: 150 },
];

describe('LineChartComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value' })
    );
    expect(container).toBeTruthy();
  });

  it('renders the line chart container', () => {
    const { getByTestId } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value' })
    );
    expect(getByTestId('line-chart')).toBeTruthy();
  });

  it('renders without grid when showGrid is false', () => {
    const { queryByTestId } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value', showGrid: false })
    );
    expect(queryByTestId('grid')).toBeNull();
  });

  it('renders grid by default', () => {
    const { getByTestId } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value' })
    );
    expect(getByTestId('grid')).toBeTruthy();
  });

  it('renders without legend when showLegend is false', () => {
    const { queryByTestId } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value', showLegend: false })
    );
    expect(queryByTestId('legend')).toBeNull();
  });

  it('renders legend by default', () => {
    const { getByTestId } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value' })
    );
    expect(getByTestId('legend')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value', className: 'my-line-chart' })
    );
    expect(container.querySelector('.my-line-chart')).toBeTruthy();
  });

  it('renders responsive container', () => {
    const { getByTestId } = render(
      React.createElement(LineChartComponent, { data: sampleData, xDataKey: 'month', lineDataKey: 'value' })
    );
    expect(getByTestId('responsive-container')).toBeTruthy();
  });
});
