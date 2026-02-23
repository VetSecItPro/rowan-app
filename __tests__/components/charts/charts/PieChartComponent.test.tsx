// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  Pie: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'pie' }, children),
  Cell: () => React.createElement('div', { 'data-testid': 'cell' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
  Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
}));

import { PieChartComponent } from '@/components/charts/charts/PieChartComponent';

const sampleData = [
  { name: 'Housing', value: 1200 },
  { name: 'Food', value: 600 },
  { name: 'Transport', value: 300 },
];

describe('PieChartComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(
      React.createElement(PieChartComponent, { data: sampleData })
    );
    expect(container).toBeTruthy();
  });

  it('renders the pie chart container', () => {
    const { getByTestId } = render(
      React.createElement(PieChartComponent, { data: sampleData })
    );
    expect(getByTestId('pie-chart')).toBeTruthy();
  });

  it('renders responsive container', () => {
    const { getByTestId } = render(
      React.createElement(PieChartComponent, { data: sampleData })
    );
    expect(getByTestId('responsive-container')).toBeTruthy();
  });

  it('renders pie element', () => {
    const { getByTestId } = render(
      React.createElement(PieChartComponent, { data: sampleData })
    );
    expect(getByTestId('pie')).toBeTruthy();
  });

  it('renders legend', () => {
    const { getByTestId } = render(
      React.createElement(PieChartComponent, { data: sampleData })
    );
    expect(getByTestId('legend')).toBeTruthy();
  });

  it('renders tooltip', () => {
    const { getByTestId } = render(
      React.createElement(PieChartComponent, { data: sampleData })
    );
    expect(getByTestId('tooltip')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      React.createElement(PieChartComponent, { data: sampleData, className: 'my-pie-chart' })
    );
    expect(container.querySelector('.my-pie-chart')).toBeTruthy();
  });

  it('renders with empty data array', () => {
    const { container } = render(
      React.createElement(PieChartComponent, { data: [] })
    );
    expect(container).toBeTruthy();
  });

  it('renders with custom colors', () => {
    const { container } = render(
      React.createElement(PieChartComponent, { data: sampleData, colors: ['#ff0000', '#00ff00', '#0000ff'] })
    );
    expect(container).toBeTruthy();
  });
});
