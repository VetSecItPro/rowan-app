// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConflictIndicator } from '@/components/calendar/ConflictIndicator';
import type { EventConflict } from '@/lib/services/conflict-detection-service';

const makeConflict = (severity: 'high' | 'medium' | 'low', message = 'Conflict'): EventConflict => ({
  eventId: 'ev-1',
  conflictingEventId: 'ev-2',
  severity,
  message,
  type: 'overlap',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
});

describe('ConflictIndicator', () => {
  it('renders nothing when no conflicts', () => {
    const { container } = render(<ConflictIndicator conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders conflict count for single conflict', () => {
    render(<ConflictIndicator conflicts={[makeConflict('high')]} />);
    expect(screen.getByText('1 conflict')).toBeTruthy();
  });

  it('renders plural for multiple conflicts', () => {
    render(<ConflictIndicator conflicts={[makeConflict('high'), makeConflict('low')]} />);
    expect(screen.getByText('2 conflicts')).toBeTruthy();
  });

  it('renders compact mode without count text', () => {
    const { container } = render(
      <ConflictIndicator conflicts={[makeConflict('high')]} compact={true} />
    );
    expect(container.querySelector('.rounded-full')).toBeTruthy();
    expect(screen.queryByText('1 conflict')).toBeNull();
  });

  it('shows tooltip with conflict messages', () => {
    render(<ConflictIndicator conflicts={[makeConflict('medium', 'Time overlap')]} />);
    const el = screen.getByTitle('Time overlap');
    expect(el).toBeTruthy();
  });

  it('uses red color for high severity', () => {
    render(<ConflictIndicator conflicts={[makeConflict('high')]} />);
    const el = screen.getByText('1 conflict').closest('div');
    expect(el?.className).toContain('bg-red-500');
  });

  it('uses orange color for medium severity', () => {
    render(<ConflictIndicator conflicts={[makeConflict('medium')]} />);
    const el = screen.getByText('1 conflict').closest('div');
    expect(el?.className).toContain('bg-orange-500');
  });

  it('uses yellow color for low severity', () => {
    render(<ConflictIndicator conflicts={[makeConflict('low')]} />);
    const el = screen.getByText('1 conflict').closest('div');
    expect(el?.className).toContain('bg-yellow-500');
  });
});
