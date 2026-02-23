// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CircularProgress } from '@/components/ui/CircularProgress';

describe('CircularProgress', () => {
  it('renders without crashing', () => {
    const { container } = render(<CircularProgress progress={50} />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders an SVG element', () => {
    const { container } = render(<CircularProgress progress={75} />);
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('shows percentage text when showPercentage is true', () => {
    render(<CircularProgress progress={42} showPercentage={true} />);
    expect(screen.getByText('42%')).toBeDefined();
  });

  it('hides percentage text when showPercentage is false', () => {
    render(<CircularProgress progress={42} showPercentage={false} />);
    expect(screen.queryByText('42%')).toBeNull();
  });

  it('rounds progress to nearest integer for display', () => {
    render(<CircularProgress progress={33.7} />);
    expect(screen.getByText('34%')).toBeDefined();
  });

  it('applies custom size', () => {
    const { container } = render(<CircularProgress progress={50} size={96} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('96');
    expect(svg?.getAttribute('height')).toBe('96');
  });

  it('applies custom className to container', () => {
    const { container } = render(<CircularProgress progress={50} className="my-progress" />);
    expect(container.firstChild?.['className']).toContain('my-progress');
  });

  it('renders two circle elements (bg + progress)', () => {
    const { container } = render(<CircularProgress progress={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });
});
