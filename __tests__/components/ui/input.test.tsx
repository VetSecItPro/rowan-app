// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders without crashing', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeDefined();
  });

  it('renders with value', () => {
    render(<Input value="test value" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('test value')).toBeDefined();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
  });

  it('applies custom className', () => {
    render(<Input className="my-input" />);
    expect(screen.getByRole('textbox').className).toContain('my-input');
  });

  it('renders as password type', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('password');
  });

  it('renders as email type', () => {
    const { container } = render(<Input type="email" />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('email');
  });
});
