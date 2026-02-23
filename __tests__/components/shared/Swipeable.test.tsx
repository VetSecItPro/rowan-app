// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
}));

import { Swipeable } from '@/components/shared/Swipeable';

describe('Swipeable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <Swipeable onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()}>
        <div>Content</div>
      </Swipeable>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders its children', () => {
    render(
      <Swipeable>
        <div>Swipeable content</div>
      </Swipeable>
    );
    expect(screen.getByText('Swipeable content')).toBeTruthy();
  });

  it('renders container with overflow-hidden class', () => {
    const { container } = render(
      <Swipeable>
        <div>Content</div>
      </Swipeable>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-hidden');
  });

  it('accepts disabled prop', () => {
    const { container } = render(
      <Swipeable disabled={true}>
        <div>Disabled content</div>
      </Swipeable>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts custom threshold prop', () => {
    const { container } = render(
      <Swipeable threshold={150}>
        <div>Content</div>
      </Swipeable>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts custom leftAction prop', () => {
    const { container } = render(
      <Swipeable
        leftAction={{ color: 'bg-blue-500', label: 'Archive' }}
      >
        <div>Content</div>
      </Swipeable>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts custom rightAction prop', () => {
    const { container } = render(
      <Swipeable
        rightAction={{ color: 'bg-green-500', label: 'Done' }}
      >
        <div>Content</div>
      </Swipeable>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders multiple children correctly', () => {
    render(
      <Swipeable>
        <div>First child</div>
        <div>Second child</div>
      </Swipeable>
    );
    expect(screen.getByText('First child')).toBeTruthy();
    expect(screen.getByText('Second child')).toBeTruthy();
  });
});
