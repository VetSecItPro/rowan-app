// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('recharts', () => ({
  AreaChart: ({ children }) => React.createElement('div', {'data-testid': 'area-chart'}, children),
  Area: () => React.createElement('div', {'data-testid': 'area'}),
  XAxis: () => React.createElement('div', {'data-testid': 'x-axis'}),
  YAxis: () => React.createElement('div', {'data-testid': 'y-axis'}),
  CartesianGrid: () => React.createElement('div', {'data-testid': 'grid'}),
  Tooltip: () => React.createElement('div', {'data-testid': 'tooltip'}),
  Legend: () => React.createElement('div', {'data-testid': 'legend'}),
  ResponsiveContainer: ({ children }) => React.createElement('div', {'data-testid': 'responsive-container'}, children),
}));

import { AreaChartComponent } from '@/components/charts/charts/AreaChartComponent';

const sampleData = [
  { month: 'Jan', value: 100 },
  { month: 'Feb', value: 200 },
  { month: 'Mar', value: 150 },
];

describe('AreaChartComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(React.createElement(AreaChartComponent, { data: sampleData, xDataKey: 'month', areaDataKey: 'value' }));
    expect(container).toBeTruthy();
  });

  it('renders the area chart container', () => {
    const { getByTestId } = render(React.createElement(AreaChartComponent, { data: sampleData, xDataKey: 'month', areaDataKey: 'value' }));
    expect(getByTestId('area-chart')).toBeTruthy();
  });

  it('renders without grid when showGrid is false', () => {
    const { queryByTestId } = render(React.createElement(AreaChartComponent, { data: sampleData, xDataKey: 'month', areaDataKey: 'value', showGrid: false }));
    expect(queryByTestId('grid')).toBeNull();
  });

  it('renders without legend when showLegend is false', () => {
    const { queryByTestId } = render(React.createElement(AreaChartComponent, { data: sampleData, xDataKey: 'month', areaDataKey: 'value', showLegend: false }));
    expect(queryByTestId('legend')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(React.createElement(AreaChartComponent, { data: sampleData, xDataKey: 'month', areaDataKey: 'value', className: 'my-chart' }));
    expect(container.querySelector('.my-chart')).toBeTruthy();
  });
});
