// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

describe('Alert', () => {
  it('renders without crashing', () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('renders children', () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText('Alert message')).toBeDefined();
  });

  it('applies default variant', () => {
    const { container } = render(<Alert>Default</Alert>);
    expect(container.firstChild?.['className']).toContain('bg-background');
  });

  it('applies destructive variant', () => {
    const { container } = render(<Alert variant="destructive">Error</Alert>);
    expect(container.firstChild?.['className']).toContain('border-destructive');
  });

  it('applies custom className', () => {
    const { container } = render(<Alert className="my-alert">Content</Alert>);
    expect(container.firstChild?.['className']).toContain('my-alert');
  });
});

describe('AlertTitle', () => {
  it('renders without crashing', () => {
    render(<AlertTitle>Title</AlertTitle>);
    expect(screen.getByText('Title')).toBeDefined();
  });
});

describe('AlertDescription', () => {
  it('renders without crashing', () => {
    render(<AlertDescription>Description text</AlertDescription>);
    expect(screen.getByText('Description text')).toBeDefined();
  });
});

describe('Alert composition', () => {
  it('renders full alert composition', () => {
    render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please check your input</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Warning')).toBeDefined();
    expect(screen.getByText('Please check your input')).toBeDefined();
  });
});
