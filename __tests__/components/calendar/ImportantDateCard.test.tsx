// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportantDateCard } from '@/components/calendar/ImportantDateCard';
import type { ImportantDateWithMeta } from '@/lib/types/important-dates';

const makeDate = (overrides: Partial<ImportantDateWithMeta> = {}): ImportantDateWithMeta => ({
  id: 'date-1',
  space_id: 'space-1',
  title: 'Mom Birthday',
  person_name: 'Mom',
  date_type: 'birthday',
  emoji: '🎂',
  month: 3,
  day: 15,
  year: null,
  notes: null,
  days_until: 10,
  years: 60,
  is_today: false,
  next_occurrence: '2024-03-15',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

describe('ImportantDateCard', () => {
  it('renders without crashing', () => {
    render(<ImportantDateCard date={makeDate()} />);
    expect(screen.getByText('Mom')).toBeTruthy();
  });

  it('shows the emoji', () => {
    render(<ImportantDateCard date={makeDate({ emoji: '🎂' })} />);
    expect(screen.getByText('🎂')).toBeTruthy();
  });

  it('shows days until', () => {
    render(<ImportantDateCard date={makeDate({ days_until: 10 })} />);
    expect(screen.getByText('10 days')).toBeTruthy();
  });

  it('shows "Today!" when is_today is true', () => {
    render(<ImportantDateCard date={makeDate({ is_today: true, days_until: 0 })} />);
    expect(screen.getByText('Today!')).toBeTruthy();
  });

  it('shows years turning for birthday', () => {
    render(<ImportantDateCard date={makeDate({ date_type: 'birthday', years: 25 })} />);
    expect(screen.getByText('Turning 25')).toBeTruthy();
  });

  it('calls onClick when button clicked', () => {
    const onClick = vi.fn();
    render(<ImportantDateCard date={makeDate()} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows the formatted date', () => {
    render(<ImportantDateCard date={makeDate({ next_occurrence: '2024-03-15' })} />);
    expect(screen.getByText(/Mar/)).toBeTruthy();
  });
});
