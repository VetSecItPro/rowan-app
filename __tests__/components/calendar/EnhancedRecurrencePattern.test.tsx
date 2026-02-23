// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedRecurrencePattern } from '@/components/calendar/EnhancedRecurrencePattern';

describe('EnhancedRecurrencePattern', () => {
  const defaultProps = {
    value: null,
    onChange: vi.fn(),
    enabled: false,
    onEnabledChange: vi.fn(),
  };

  it('renders without crashing in disabled state', () => {
    render(<EnhancedRecurrencePattern {...defaultProps} />);
    expect(screen.getByText('Recurring event')).toBeTruthy();
  });

  it('shows checkbox when disabled', () => {
    render(<EnhancedRecurrencePattern {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('calls onEnabledChange when checkbox toggled', () => {
    const onEnabledChange = vi.fn();
    render(<EnhancedRecurrencePattern {...defaultProps} onEnabledChange={onEnabledChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  it('shows pattern options when enabled', () => {
    render(
      <EnhancedRecurrencePattern
        {...defaultProps}
        enabled={true}
        value={{ pattern: 'weekly', interval: 1, days_of_week: [] }}
      />
    );
    expect(screen.getByText('Repeat every')).toBeTruthy();
    expect(screen.getByText('Repeat on')).toBeTruthy();
  });

  it('shows day buttons for weekly pattern', () => {
    render(
      <EnhancedRecurrencePattern
        {...defaultProps}
        enabled={true}
        value={{ pattern: 'weekly', interval: 1, days_of_week: [] }}
      />
    );
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
  });

  it('shows end recurrence options', () => {
    render(
      <EnhancedRecurrencePattern
        {...defaultProps}
        enabled={true}
        value={{ pattern: 'weekly', interval: 1 }}
      />
    );
    expect(screen.getByText('End recurrence')).toBeTruthy();
    expect(screen.getByText('Never')).toBeTruthy();
    expect(screen.getByText('On date')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
  });

  it('shows pattern summary', () => {
    render(
      <EnhancedRecurrencePattern
        {...defaultProps}
        enabled={true}
        value={{ pattern: 'weekly', interval: 1, days_of_week: [1] }}
      />
    );
    expect(screen.getByText('Summary:')).toBeTruthy();
  });
});
