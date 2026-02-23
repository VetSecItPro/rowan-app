// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders without crashing', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeDefined();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild?.['className']).toContain('bg-primary');
  });

  it('applies secondary variant classes', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    expect(container.firstChild?.['className']).toContain('bg-secondary');
  });

  it('applies destructive variant classes', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild?.['className']).toContain('bg-destructive');
  });

  it('applies outline variant classes', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild?.['className']).toContain('text-foreground');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-badge">Custom</Badge>);
    expect(container.firstChild?.['className']).toContain('custom-badge');
  });
});
