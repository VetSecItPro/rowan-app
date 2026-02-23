// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CountdownCard } from '@/components/calendar/CountdownCard';
import type { CountdownItem } from '@/lib/services/calendar/countdown-service';

const makeCountdown = (overrides: Partial<CountdownItem> = {}): CountdownItem => ({
  id: 'countdown-1',
  label: 'Team Meeting',
  daysRemaining: 5,
  isToday: false,
  targetDate: new Date('2024-02-15T12:00:00'),
  source: 'event',
  ...overrides,
});

describe('CountdownCard', () => {
  it('renders without crashing', () => {
    render(<CountdownCard countdown={makeCountdown()} />);
    expect(screen.getByText('Team Meeting')).toBeTruthy();
  });

  it('shows days remaining', () => {
    render(<CountdownCard countdown={makeCountdown({ daysRemaining: 5 })} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('shows Today when isToday is true', () => {
    render(<CountdownCard countdown={makeCountdown({ isToday: true, daysRemaining: 0 })} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows singular day when daysRemaining is 1', () => {
    render(<CountdownCard countdown={makeCountdown({ daysRemaining: 1 })} />);
    expect(screen.getByText('day')).toBeTruthy();
  });

  it('shows emoji for important date', () => {
    render(
      <CountdownCard
        countdown={makeCountdown({
          source: 'important_date',
          emoji: '🎂',
          dateType: 'birthday',
          daysRemaining: 10,
        })}
      />
    );
    expect(screen.getByText('🎂')).toBeTruthy();
  });

  it('calls onClick when button clicked', () => {
    const onClick = vi.fn();
    render(<CountdownCard countdown={makeCountdown()} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows the formatted date', () => {
    render(<CountdownCard countdown={makeCountdown({ targetDate: new Date('2024-02-15T12:00:00') })} />);
    // Date is rendered via toLocaleDateString which produces "Feb 15" format
    expect(document.body.textContent).toMatch(/Feb/i);
  });
});
