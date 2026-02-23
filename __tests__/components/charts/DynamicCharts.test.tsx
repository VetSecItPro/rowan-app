// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  default: (fn, options) => {
    const Component = (props) => {
      const Loader = options?.loading;
      return Loader ? React.createElement(Loader) : React.createElement('div', {'data-testid': 'dynamic-chart'}, 'Chart');
    };
    Component.displayName = 'DynamicComponent';
    return Component;
  }
}));
vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }) => React.createElement('div', { className, 'data-testid': 'skeleton' }),
}));
vi.mock('@/components/charts/charts/PieChartComponent', () => ({
  PieChartComponent: (props) => React.createElement('div', {'data-testid': 'pie-chart'}, 'PieChart'),
}));
vi.mock('@/components/charts/charts/BarChartComponent', () => ({
  BarChartComponent: (props) => React.createElement('div', {'data-testid': 'bar-chart'}, 'BarChart'),
}));
vi.mock('@/components/charts/charts/LineChartComponent', () => ({
  LineChartComponent: (props) => React.createElement('div', {'data-testid': 'line-chart'}, 'LineChart'),
}));
vi.mock('@/components/charts/charts/AreaChartComponent', () => ({
  AreaChartComponent: (props) => React.createElement('div', {'data-testid': 'area-chart'}, 'AreaChart'),
}));

import { DynamicPieChart, DynamicBarChart, DynamicLineChart, DynamicAreaChart } from '@/components/charts/DynamicCharts';

describe('DynamicCharts', () => {
  it('DynamicPieChart renders without crashing', () => {
    render(React.createElement(DynamicPieChart, { data: [{ name: 'A', value: 10 }] }));
    expect(document.body).toBeTruthy();
  });

  it('DynamicBarChart renders without crashing', () => {
    render(React.createElement(DynamicBarChart, { data: [{ name: 'A', value: 10 }], xDataKey: 'name', yDataKey: 'value' }));
    expect(document.body).toBeTruthy();
  });

  it('DynamicLineChart renders without crashing', () => {
    render(React.createElement(DynamicLineChart, { data: [{ name: 'A', value: 10 }], xDataKey: 'name', lineDataKey: 'value' }));
    expect(document.body).toBeTruthy();
  });

  it('DynamicAreaChart renders without crashing', () => {
    render(React.createElement(DynamicAreaChart, { data: [{ name: 'A', value: 10 }], xDataKey: 'name', areaDataKey: 'value' }));
    expect(document.body).toBeTruthy();
  });
});
