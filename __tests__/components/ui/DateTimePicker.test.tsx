// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/lib/hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}));

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: vi.fn(() => ({ isMobile: false, hasCoarsePointer: false })),
}));

import { DateTimePicker } from '@/components/ui/DateTimePicker';

describe('DateTimePicker', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DateTimePicker {...defaultProps} />);
    expect(screen.getByPlaceholderText('Select date and time...')).toBeDefined();
  });

  it('renders with custom placeholder', () => {
    render(<DateTimePicker {...defaultProps} placeholder="Pick a date" />);
    expect(screen.getByPlaceholderText('Pick a date')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<DateTimePicker {...defaultProps} label="Event Date" />);
    expect(screen.getByText('Event Date')).toBeDefined();
  });

  it('renders disabled input when disabled prop is passed', () => {
    const { container } = render(<DateTimePicker {...defaultProps} disabled />);
    const input = container.querySelector('input');
    expect(input?.hasAttribute('disabled')).toBe(true);
  });

  it('renders calendar button', () => {
    render(<DateTimePicker {...defaultProps} />);
    expect(screen.getByTitle('Open calendar')).toBeDefined();
  });

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText('Select date and time...');
    fireEvent.change(input, { target: { value: '2024-01-01T10:00' } });
    expect(onChange).toHaveBeenCalledWith('2024-01-01T10:00');
  });

  it('renders with existing value', async () => {
    await act(async () => {
      render(<DateTimePicker value="2024-06-15T10:30" onChange={vi.fn()} />);
    });
    // Component renders without crashing with a value
    expect(screen.getByTitle('Open calendar')).toBeDefined();
  });

  it('applies custom className to input', () => {
    render(<DateTimePicker {...defaultProps} className="custom-picker" />);
    const { container } = render(<DateTimePicker {...defaultProps} className="custom-picker" />);
    const input = container.querySelector('input');
    expect(input?.className).toContain('custom-picker');
  });
});
