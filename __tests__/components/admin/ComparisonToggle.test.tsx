// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ComparisonProvider } from '@/components/admin/ComparisonContext';
import { ComparisonToggle } from '@/components/admin/ComparisonToggle';

function renderWithProvider(ui: React.ReactElement) {
  return render(<ComparisonProvider>{ui}</ComparisonProvider>);
}

describe('ComparisonToggle', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProvider(<ComparisonToggle />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a button', () => {
    renderWithProvider(<ComparisonToggle />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('shows Compare text label', () => {
    renderWithProvider(<ComparisonToggle />);
    expect(screen.getByText('Compare')).toBeTruthy();
  });

  it('has gray background when compare is disabled', () => {
    renderWithProvider(<ComparisonToggle />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-gray-700');
  });

  it('has purple background when compare is enabled', () => {
    renderWithProvider(<ComparisonToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.className).toContain('bg-purple-600');
  });

  it('toggles to disabled state on second click', () => {
    renderWithProvider(<ComparisonToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button.className).toContain('bg-gray-700');
  });

  it('has correct title when disabled', () => {
    renderWithProvider(<ComparisonToggle />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('title')).toBe('Compare with previous period');
  });

  it('has correct title when enabled', () => {
    renderWithProvider(<ComparisonToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.getAttribute('title')).toBe('Disable period comparison');
  });
});
