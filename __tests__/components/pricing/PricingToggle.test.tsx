// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingToggle } from '@/components/pricing/PricingToggle';

describe('PricingToggle', () => {
  it('renders without crashing', () => {
    const { container } = render(<PricingToggle value="monthly" onChange={vi.fn()} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders Monthly button', () => {
    render(<PricingToggle value="monthly" onChange={vi.fn()} />);
    expect(screen.getByTestId('pricing-monthly-button')).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
  });

  it('renders Annual button', () => {
    render(<PricingToggle value="monthly" onChange={vi.fn()} />);
    expect(screen.getByTestId('pricing-annual-button')).toBeTruthy();
    expect(screen.getByText('Annual')).toBeTruthy();
  });

  it('renders "2 months free" badge', () => {
    render(<PricingToggle value="monthly" onChange={vi.fn()} />);
    expect(screen.getByText(/2 months free/i)).toBeTruthy();
  });

  it('calls onChange with "monthly" when Monthly button is clicked', () => {
    const onChange = vi.fn();
    render(<PricingToggle value="annual" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('pricing-monthly-button'));
    expect(onChange).toHaveBeenCalledWith('monthly');
  });

  it('calls onChange with "annual" when Annual button is clicked', () => {
    const onChange = vi.fn();
    render(<PricingToggle value="monthly" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('pricing-annual-button'));
    expect(onChange).toHaveBeenCalledWith('annual');
  });

  it('applies active style to Monthly button when value=monthly', () => {
    render(<PricingToggle value="monthly" onChange={vi.fn()} />);
    const btn = screen.getByTestId('pricing-monthly-button');
    expect(btn.className).toContain('text-emerald-400');
  });

  it('applies active style to Annual button when value=annual', () => {
    render(<PricingToggle value="annual" onChange={vi.fn()} />);
    const btn = screen.getByTestId('pricing-annual-button');
    expect(btn.className).toContain('text-emerald-400');
  });
});
