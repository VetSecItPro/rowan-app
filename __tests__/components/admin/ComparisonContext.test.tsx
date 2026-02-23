// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ComparisonProvider, useComparison } from '@/components/admin/ComparisonContext';

function TestConsumer() {
  const { compareEnabled, toggleCompare, setCompareEnabled } = useComparison();
  return (
    <div>
      <span data-testid="status">{compareEnabled ? 'enabled' : 'disabled'}</span>
      <button onClick={toggleCompare} data-testid="toggle">Toggle</button>
      <button onClick={() => setCompareEnabled(true)} data-testid="enable">Enable</button>
      <button onClick={() => setCompareEnabled(false)} data-testid="disable">Disable</button>
    </div>
  );
}

describe('ComparisonContext', () => {
  it('provides default compareEnabled as false', () => {
    render(
      <ComparisonProvider>
        <TestConsumer />
      </ComparisonProvider>
    );
    expect(screen.getByTestId('status').textContent).toBe('disabled');
  });

  it('toggles compareEnabled when toggleCompare is called', () => {
    render(
      <ComparisonProvider>
        <TestConsumer />
      </ComparisonProvider>
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('status').textContent).toBe('enabled');
  });

  it('toggles back to false on second toggle', () => {
    render(
      <ComparisonProvider>
        <TestConsumer />
      </ComparisonProvider>
    );
    fireEvent.click(screen.getByTestId('toggle'));
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('status').textContent).toBe('disabled');
  });

  it('sets compareEnabled to true via setCompareEnabled', () => {
    render(
      <ComparisonProvider>
        <TestConsumer />
      </ComparisonProvider>
    );
    fireEvent.click(screen.getByTestId('enable'));
    expect(screen.getByTestId('status').textContent).toBe('enabled');
  });

  it('sets compareEnabled to false via setCompareEnabled', () => {
    render(
      <ComparisonProvider>
        <TestConsumer />
      </ComparisonProvider>
    );
    fireEvent.click(screen.getByTestId('enable'));
    fireEvent.click(screen.getByTestId('disable'));
    expect(screen.getByTestId('status').textContent).toBe('disabled');
  });

  it('renders children', () => {
    render(
      <ComparisonProvider>
        <span data-testid="child">child content</span>
      </ComparisonProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});
