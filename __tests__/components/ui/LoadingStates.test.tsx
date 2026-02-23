// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AuthLoadingState, DashboardSkeleton, SpacesLoadingState } from '@/components/ui/LoadingStates';

describe('AuthLoadingState', () => {
  it('renders without crashing', () => {
    const { container } = render(<AuthLoadingState />);
    expect(container.firstChild).toBeDefined();
  });

  it('shows loading authentication text', () => {
    render(<AuthLoadingState />);
    expect(screen.getByText('Loading authentication...')).toBeDefined();
  });
});

describe('DashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeDefined();
  });

  it('shows Loading... text', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });
});

describe('SpacesLoadingState', () => {
  it('renders without crashing', () => {
    const { container } = render(<SpacesLoadingState />);
    expect(container.firstChild).toBeDefined();
  });

  it('shows loading spaces text', () => {
    render(<SpacesLoadingState />);
    expect(screen.getByText('Loading your spaces...')).toBeDefined();
  });
});
