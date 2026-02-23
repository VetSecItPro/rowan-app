// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: () => React.createElement('div', { 'data-testid': 'bar' }),
  XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'grid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
  Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
}));

import { BarChartComponent } from '@/components/charts/charts/BarChartComponent';

const sampleData = [
  { month: 'Jan', value: 100 },
  { month: 'Feb', value: 200 },
  { month: 'Mar', value: 150 },
];

describe('BarChartComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value' })
    );
    expect(container).toBeTruthy();
  });

  it('renders the bar chart container', () => {
    const { getByTestId } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value' })
    );
    expect(getByTestId('bar-chart')).toBeTruthy();
  });

  it('renders without grid when showGrid is false', () => {
    const { queryByTestId } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value', showGrid: false })
    );
    expect(queryByTestId('grid')).toBeNull();
  });

  it('renders grid by default', () => {
    const { getByTestId } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value' })
    );
    expect(getByTestId('grid')).toBeTruthy();
  });

  it('renders without legend when showLegend is false', () => {
    const { queryByTestId } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value', showLegend: false })
    );
    expect(queryByTestId('legend')).toBeNull();
  });

  it('renders legend by default', () => {
    const { getByTestId } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value' })
    );
    expect(getByTestId('legend')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value', className: 'my-bar-chart' })
    );
    expect(container.querySelector('.my-bar-chart')).toBeTruthy();
  });

  it('renders responsive container', () => {
    const { getByTestId } = render(
      React.createElement(BarChartComponent, { data: sampleData, xDataKey: 'month', yDataKey: 'value' })
    );
    expect(getByTestId('responsive-container')).toBeTruthy();
  });
});
