// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ErrorRetry, ErrorRetryInline, ErrorRetryFullPage } from '@/components/ui/ErrorRetry';

describe('ErrorRetry', () => {
  const defaultProps = {
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ErrorRetry {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('shows default error message', () => {
    render(<ErrorRetry {...defaultProps} />);
    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });

  it('shows custom error message', () => {
    render(<ErrorRetry {...defaultProps} message="Custom error occurred" />);
    expect(screen.getByText('Custom error occurred')).toBeDefined();
  });

  it('shows custom title', () => {
    render(<ErrorRetry {...defaultProps} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeDefined();
  });

  it('renders Try Again button', () => {
    render(<ErrorRetry {...defaultProps} />);
    expect(screen.getByText('Try Again')).toBeDefined();
  });

  it('calls onRetry when Try Again is clicked', async () => {
    render(<ErrorRetry {...defaultProps} />);
    fireEvent.click(screen.getByText('Try Again'));
    await waitFor(() => {
      expect(defaultProps.onRetry).toHaveBeenCalledOnce();
    });
  });

  it('shows network error title for network errorType', () => {
    render(<ErrorRetry {...defaultProps} errorType="network" />);
    expect(screen.getByText('Connection Problem')).toBeDefined();
  });

  it('shows server error title for server errorType', () => {
    render(<ErrorRetry {...defaultProps} errorType="server" />);
    expect(screen.getByText('Server Error')).toBeDefined();
  });

  it('applies size sm classes', () => {
    const { container } = render(<ErrorRetry {...defaultProps} size="sm" />);
    expect(container.firstChild?.['className']).toContain('p-4');
  });

  it('applies size lg classes', () => {
    const { container } = render(<ErrorRetry {...defaultProps} size="lg" />);
    expect(container.firstChild?.['className']).toContain('p-8');
  });
});

describe('ErrorRetryInline', () => {
  it('renders without crashing', () => {
    render(<ErrorRetryInline onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('shows default failed to load message', () => {
    render(<ErrorRetryInline onRetry={vi.fn()} />);
    expect(screen.getByText('Failed to load')).toBeDefined();
  });

  it('shows custom message', () => {
    render(<ErrorRetryInline onRetry={vi.fn()} message="Failed to fetch data" />);
    expect(screen.getByText('Failed to fetch data')).toBeDefined();
  });
});

describe('ErrorRetryFullPage', () => {
  it('renders without crashing', () => {
    render(<ErrorRetryFullPage onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('shows default title', () => {
    render(<ErrorRetryFullPage onRetry={vi.fn()} />);
    expect(screen.getByText('Something Went Wrong')).toBeDefined();
  });
});
