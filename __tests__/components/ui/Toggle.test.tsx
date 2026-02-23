// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Toggle } from '@/components/ui/Toggle';

describe('Toggle', () => {
  const defaultProps = {
    id: 'test-toggle',
    checked: false,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<Toggle {...defaultProps} />);
    expect(container.querySelector('input[type="checkbox"]')).toBeDefined();
  });

  it('renders unchecked state', () => {
    const { container } = render(<Toggle {...defaultProps} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  it('renders checked state', () => {
    const { container } = render(<Toggle {...defaultProps} checked={true} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('calls onChange when toggled', () => {
    const { container } = render(<Toggle {...defaultProps} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.click(input);
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    const { container } = render(<Toggle {...defaultProps} disabled={true} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('renders with label when provided', () => {
    render(<Toggle {...defaultProps} label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeDefined();
  });

  it('renders with description when provided', () => {
    render(<Toggle {...defaultProps} description="Receive push notifications" />);
    expect(screen.getByText('Receive push notifications')).toBeDefined();
  });

  it('renders with id on input', () => {
    const { container } = render(<Toggle {...defaultProps} />);
    const input = container.querySelector('input');
    expect(input?.id).toBe('test-toggle');
  });
});
