// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { ProgressiveContentLoader, EnhancedModalSkeleton } from '@/components/ui/ProgressiveLoader';

describe('ProgressiveContentLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(
      <ProgressiveContentLoader>
        <div>Content</div>
      </ProgressiveContentLoader>
    );
    expect(screen.getByText('Initializing...')).toBeDefined();
  });

  it('renders children', () => {
    render(
      <ProgressiveContentLoader>
        <p>Child content</p>
      </ProgressiveContentLoader>
    );
    expect(screen.getByText('Child content')).toBeDefined();
  });

  it('shows first stage text initially', () => {
    render(
      <ProgressiveContentLoader stages={['Step 1', 'Step 2', 'Step 3']}>
        <div />
      </ProgressiveContentLoader>
    );
    expect(screen.getByText('Step 1')).toBeDefined();
  });

  it('advances to next stage after delay', async () => {
    render(
      <ProgressiveContentLoader stages={['Step 1', 'Step 2', 'Step 3']} stageDelay={500}>
        <div />
      </ProgressiveContentLoader>
    );
    expect(screen.getByText('Step 1')).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText('Step 2')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProgressiveContentLoader className="my-loader">
        <div />
      </ProgressiveContentLoader>
    );
    expect((container.firstChild as HTMLElement).className).toContain('my-loader');
  });
});

describe('EnhancedModalSkeleton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<EnhancedModalSkeleton title="meal creator" />);
    expect(screen.getByText(/meal creator/i)).toBeDefined();
  });

  it('renders with custom size', () => {
    const { container } = render(<EnhancedModalSkeleton title="test" size="lg" />);
    expect(container.querySelector('.max-w-4xl')).toBeDefined();
  });
});
