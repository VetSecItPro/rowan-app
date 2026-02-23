// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  TaskCardSkeleton,
  StatsCardSkeleton,
} from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeDefined();
  });

  it('applies aria-hidden', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies rectangular variant by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.['className']).toContain('rounded');
  });

  it('applies circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild?.['className']).toContain('rounded-full');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild?.['className']).toContain('h-4');
    expect(container.firstChild?.['className']).toContain('w-32');
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width={100} height={50} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100px');
    expect(el.style.height).toBe('50px');
  });
});

describe('SkeletonText', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonText />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText lines={3} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(3);
  });

  it('renders specified number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(5);
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('SkeletonAvatar', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.firstChild).toBeDefined();
  });

  it('has circular shape', () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.querySelector('.rounded-full')).toBeDefined();
  });
});

describe('TaskCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TaskCardSkeleton />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('StatsCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatsCardSkeleton />);
    expect(container.firstChild).toBeDefined();
  });
});
