// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Label } from '@/components/ui/label';

describe('Label', () => {
  it('renders without crashing', () => {
    render(<Label>My Label</Label>);
    expect(screen.getByText('My Label')).toBeDefined();
  });

  it('renders as label element', () => {
    const { container } = render(<Label>Label text</Label>);
    expect(container.querySelector('label')).toBeDefined();
  });

  it('associates with form control via htmlFor', () => {
    render(<Label htmlFor="my-input">Name</Label>);
    const label = screen.getByText('Name');
    expect(label.getAttribute('for')).toBe('my-input');
  });

  it('applies custom className', () => {
    render(<Label className="custom-label">Label</Label>);
    expect(screen.getByText('Label').className).toContain('custom-label');
  });
});
