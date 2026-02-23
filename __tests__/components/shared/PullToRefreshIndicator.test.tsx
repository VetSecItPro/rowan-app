// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PullToRefreshIndicator } from '@/components/shared/PullToRefreshIndicator';

describe('PullToRefreshIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <PullToRefreshIndicator isVisible={false} isRefreshing={false} pullProgress={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing when visible', () => {
    const { container } = render(
      <PullToRefreshIndicator isVisible={true} isRefreshing={false} pullProgress={0.5} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows Pull to refresh text when not yet at threshold', () => {
    render(
      <PullToRefreshIndicator isVisible={true} isRefreshing={false} pullProgress={0.5} />
    );
    expect(screen.getByText('Pull to refresh')).toBeTruthy();
  });

  it('shows Release to refresh when progress is at 1', () => {
    render(
      <PullToRefreshIndicator isVisible={true} isRefreshing={false} pullProgress={1} />
    );
    expect(screen.getByText('Release to refresh')).toBeTruthy();
  });

  it('shows Refreshing text when isRefreshing is true', () => {
    render(
      <PullToRefreshIndicator isVisible={true} isRefreshing={true} pullProgress={1} />
    );
    expect(screen.getByText('Refreshing...')).toBeTruthy();
  });
});
