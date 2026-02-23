// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>, options?: { loading?: React.ComponentType }) => {
    const Loading = options?.loading;
    return Loading ? Loading : () => <div data-testid="dynamic-chart" />;
  },
}));

vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} data-testid="skeleton" />,
}));

import {
  DynamicTrendLineChart,
  DynamicMilestonesBarChart,
  DynamicCategorySuccessChart,
  DynamicCompletionRateChart,
} from '@/components/goals/analytics/DynamicGoalsCharts';

describe('DynamicGoalsCharts', () => {
  it('DynamicTrendLineChart renders without crashing', () => {
    const { container } = render(<DynamicTrendLineChart data={[]} />);
    expect(container).toBeTruthy();
  });

  it('DynamicMilestonesBarChart renders without crashing', () => {
    const { container } = render(<DynamicMilestonesBarChart data={[]} />);
    expect(container).toBeTruthy();
  });

  it('DynamicCategorySuccessChart renders without crashing', () => {
    const { container } = render(<DynamicCategorySuccessChart data={{}} />);
    expect(container).toBeTruthy();
  });

  it('DynamicCompletionRateChart renders without crashing', () => {
    const { container } = render(
      <DynamicCompletionRateChart completed={0} active={0} paused={0} cancelled={0} />
    );
    expect(container).toBeTruthy();
  });
});
