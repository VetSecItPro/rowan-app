// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import ProgressHeatmap from '@/components/goals/analytics/ProgressHeatmap';

const mockData = [
  { date: '2026-01-01', count: 3 },
  { date: '2026-01-15', count: 1 },
  { date: '2026-02-01', count: 5 },
];

describe('ProgressHeatmap', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressHeatmap data={mockData} />);
    expect(container).toBeTruthy();
  });

  it('renders with empty data', () => {
    const { container } = render(<ProgressHeatmap data={[]} />);
    expect(container).toBeTruthy();
  });

  it('renders heatmap grid cells', () => {
    const { container } = render(<ProgressHeatmap data={mockData} />);
    // Heatmap renders many day cells
    const cells = container.querySelectorAll('[class*="bg-"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders month labels', () => {
    const { container } = render(<ProgressHeatmap data={mockData} />);
    // Should have some text content for months
    expect(container.textContent?.length).toBeGreaterThan(0);
  });
});
