// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { SkeletonLoader, SkeletonCard, SkeletonTable, SkeletonText } from '@/components/shared/SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonLoader />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a single skeleton by default', () => {
    const { container } = render(<SkeletonLoader />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBe(1);
  });

  it('renders multiple skeletons based on count prop', () => {
    const { container } = render(<SkeletonLoader count={3} />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBe(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonLoader className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('applies custom height class', () => {
    const { container } = render(<SkeletonLoader height="h-40" />);
    const item = container.querySelector('.animate-pulse');
    expect(item?.className).toContain('h-40');
  });

  it('applies custom width class', () => {
    const { container } = render(<SkeletonLoader width="w-64" />);
    const item = container.querySelector('.animate-pulse');
    expect(item?.className).toContain('w-64');
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with animate-pulse class', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector('.animate-pulse');
    expect(card).toBeTruthy();
  });
});

describe('SkeletonTable', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders 5 rows by default', () => {
    const { container } = render(<SkeletonTable />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBe(5);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBe(3);
  });
});

describe('SkeletonText', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonText />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBe(5);
  });

  it('applies shorter width class to last line', () => {
    const { container } = render(<SkeletonText lines={2} />);
    const items = container.querySelectorAll('.animate-pulse');
    const lastItem = items[items.length - 1] as HTMLElement;
    expect(lastItem.className).toContain('w-2/3');
  });
});
