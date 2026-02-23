// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CircularProgress, MultiRingProgress } from '@/components/goals/CircularProgress';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('CircularProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container).toBeTruthy();
  });

  it('shows 0% initially (before animation fires)', () => {
    render(<CircularProgress value={75} />);
    // Before timer fires, progress starts at 0
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('shows correct percentage after animation timer', async () => {
    render(<CircularProgress value={75} />);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('renders SVG element', () => {
    const { container } = render(<CircularProgress value={40} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('hides percentage when showPercentage is false', async () => {
    render(<CircularProgress value={50} showPercentage={false} />);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('renders label when showPercentage is false', async () => {
    render(<CircularProgress value={50} showPercentage={false} label="Custom" />);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('renders subLabel when provided', () => {
    render(<CircularProgress value={50} subLabel="sub text" />);
    expect(screen.getByText('sub text')).toBeTruthy();
  });

  it('accepts custom size', () => {
    const { container } = render(<CircularProgress value={30} size={200} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('200');
  });

  it('renders gradient defs', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container.querySelector('defs')).toBeTruthy();
  });
});

describe('MultiRingProgress', () => {
  it('renders without crashing', () => {
    const rings = [
      { value: 60, color: '#3b82f6', label: 'Tasks' },
      { value: 40, color: '#10b981', label: 'Goals' },
    ];
    const { container } = render(<MultiRingProgress rings={rings} />);
    expect(container).toBeTruthy();
  });

  it('renders progress label text', () => {
    const rings = [{ value: 50, color: '#3b82f6', label: 'Tasks' }];
    render(<MultiRingProgress rings={rings} />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  it('renders each ring as SVG', () => {
    const rings = [
      { value: 60, color: '#3b82f6', label: 'Tasks' },
      { value: 40, color: '#10b981', label: 'Goals' },
    ];
    const { container } = render(<MultiRingProgress rings={rings} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });
});
