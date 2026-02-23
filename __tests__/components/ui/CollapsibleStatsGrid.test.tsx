// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckSquare } from 'lucide-react';

import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';

describe('CollapsibleStatsGrid', () => {
  const defaultProps = {
    icon: CheckSquare,
    title: 'Task Stats',
    summary: '5 pending · 3 active',
    iconGradient: 'bg-blue-600',
    children: (
      <>
        <div data-testid="stat-card-1">Card 1</div>
        <div data-testid="stat-card-2">Card 2</div>
      </>
    ),
  };

  it('renders without crashing', () => {
    render(<CollapsibleStatsGrid {...defaultProps} />);
    expect(screen.getByText('Task Stats')).toBeDefined();
  });

  it('shows title and summary in header', () => {
    render(<CollapsibleStatsGrid {...defaultProps} />);
    expect(screen.getByText('Task Stats')).toBeDefined();
    expect(screen.getByText('5 pending · 3 active')).toBeDefined();
  });

  it('is collapsed by default', () => {
    render(<CollapsibleStatsGrid {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands when toggle is clicked', () => {
    render(<CollapsibleStatsGrid {...defaultProps} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('starts expanded when defaultCollapsed is false', () => {
    render(<CollapsibleStatsGrid {...defaultProps} defaultCollapsed={false} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders children', () => {
    render(<CollapsibleStatsGrid {...defaultProps} />);
    // Children are rendered (but may be hidden via CSS on mobile)
    expect(screen.getAllByTestId(/stat-card/).length).toBeGreaterThan(0);
  });
});
