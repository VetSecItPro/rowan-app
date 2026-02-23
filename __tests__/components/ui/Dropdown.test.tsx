// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Dropdown } from '@/components/ui/Dropdown';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('Dropdown', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    options,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Dropdown {...defaultProps} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('renders default placeholder', () => {
    render(<Dropdown {...defaultProps} />);
    expect(screen.getByText('Select an option')).toBeDefined();
  });

  it('renders custom placeholder', () => {
    render(<Dropdown {...defaultProps} placeholder="Choose..." />);
    expect(screen.getByText('Choose...')).toBeDefined();
  });

  it('shows selected option label', () => {
    render(<Dropdown {...defaultProps} value="b" />);
    expect(screen.getByText('Option B')).toBeDefined();
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Dropdown {...defaultProps} disabled />);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('applies custom className', () => {
    render(<Dropdown {...defaultProps} className="my-dropdown" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('my-dropdown');
  });

  it('shows aria-haspopup attribute', () => {
    render(<Dropdown {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('shows aria-expanded false initially', () => {
    render(<Dropdown {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
