// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { PullToRefresh } from '@/components/shared/PullToRefresh';

describe('PullToRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <div>Content</div>
      </PullToRefresh>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders its children', () => {
    render(
      <PullToRefresh onRefresh={vi.fn().mockResolvedValue(undefined)}>
        <div>Refreshable content</div>
      </PullToRefresh>
    );
    expect(screen.getByText('Refreshable content')).toBeTruthy();
  });

  it('accepts disabled prop', () => {
    const { container } = render(
      <PullToRefresh onRefresh={vi.fn()} disabled={true}>
        <div>Content</div>
      </PullToRefresh>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders container with overflow class', () => {
    const { container } = render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div>Content</div>
      </PullToRefresh>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-y-auto');
  });
});
