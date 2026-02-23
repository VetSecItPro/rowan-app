// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Select } from '@/components/ui/select';

describe('Select', () => {
  it('renders without crashing', () => {
    render(
      <Select>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('renders options', () => {
    render(
      <Select>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    );
    expect(screen.getByText('Option A')).toBeDefined();
    expect(screen.getByText('Option B')).toBeDefined();
  });

  it('calls onValueChange when value changes', () => {
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(
      <Select onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Select disabled><option value="">--</option></Select>);
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true);
  });

  it('applies custom className', () => {
    render(<Select className="my-select"><option value="">--</option></Select>);
    expect(screen.getByRole('combobox').className).toContain('my-select');
  });
});
