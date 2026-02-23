// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Textarea } from '@/components/ui/textarea';

describe('Textarea', () => {
  it('renders without crashing', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('renders with placeholder', () => {
    render(<Textarea placeholder="Enter description..." />);
    expect(screen.getByPlaceholderText('Enter description...')).toBeDefined();
  });

  it('renders with value', () => {
    render(<Textarea value="Some text" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Some text')).toBeDefined();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new text' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-textarea" />);
    expect(screen.getByRole('textbox').className).toContain('custom-textarea');
  });

  it('renders with rows attribute', () => {
    const { container } = render(<Textarea rows={5} />);
    const textarea = container.querySelector('textarea');
    expect(textarea?.rows).toBe(5);
  });
});
