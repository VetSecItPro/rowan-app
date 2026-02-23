// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FirstSpaceOnboarding } from '@/components/ui/FirstSpaceOnboarding';

describe('FirstSpaceOnboarding', () => {
  it('renders without crashing', () => {
    render(<FirstSpaceOnboarding />);
    expect(screen.getByText('Welcome to Rowan')).toBeDefined();
  });

  it('renders the heading', () => {
    render(<FirstSpaceOnboarding />);
    expect(screen.getByRole('heading', { name: 'Welcome to Rowan' })).toBeDefined();
  });

  it('renders descriptive paragraph text', () => {
    render(<FirstSpaceOnboarding />);
    expect(screen.getByText('Create your first space to get started organizing your life.')).toBeDefined();
  });

  it('renders a create space button', () => {
    render(<FirstSpaceOnboarding />);
    expect(screen.getByRole('button', { name: 'Create Your First Space' })).toBeDefined();
  });
});
