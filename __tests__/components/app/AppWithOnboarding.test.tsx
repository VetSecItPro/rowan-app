// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockRefreshSpaces = vi.fn();
const mockCreateSpace = vi.fn(() => Promise.resolve({ success: true }));

const mockUseAuthWithSpaces = vi.fn(() => ({
  isAuthenticated: true,
  authLoading: false,
  spacesLoading: false,
  hasZeroSpaces: false,
  currentSpace: { id: 'space-1', name: 'Test Space' },
  refreshSpaces: mockRefreshSpaces,
  isReady: true,
  user: { id: 'user-1', email: 'user@example.com' },
  createSpace: mockCreateSpace,
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: () => mockUseAuthWithSpaces(),
}));

vi.mock('@/components/ui/LoadingStates', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading...</div>,
  SpacesLoadingState: () => <div data-testid="spaces-loading">Spaces loading...</div>,
}));

import { AppWithOnboarding } from '@/components/app/AppWithOnboarding';

describe('AppWithOnboarding', () => {
  it('renders children when authenticated and space exists', () => {
    render(
      <AppWithOnboarding>
        <div data-testid="app-content">App Content</div>
      </AppWithOnboarding>
    );
    expect(screen.getByTestId('app-content')).toBeTruthy();
  });

  it('shows DashboardSkeleton when authLoading is true', () => {
    mockUseAuthWithSpaces.mockReturnValueOnce({
      isAuthenticated: false,
      authLoading: true,
      spacesLoading: false,
      hasZeroSpaces: false,
      currentSpace: null,
      refreshSpaces: mockRefreshSpaces,
      isReady: false,
      user: null,
      createSpace: mockCreateSpace,
    });
    render(
      <AppWithOnboarding>
        <div data-testid="app-content">App Content</div>
      </AppWithOnboarding>
    );
    expect(screen.getByTestId('dashboard-skeleton')).toBeTruthy();
  });

  it('renders children when not authenticated (public routes)', () => {
    mockUseAuthWithSpaces.mockReturnValueOnce({
      isAuthenticated: false,
      authLoading: false,
      spacesLoading: false,
      hasZeroSpaces: false,
      currentSpace: null,
      refreshSpaces: mockRefreshSpaces,
      isReady: false,
      user: null,
      createSpace: mockCreateSpace,
    });
    render(
      <AppWithOnboarding>
        <div data-testid="public-content">Login Page</div>
      </AppWithOnboarding>
    );
    expect(screen.getByTestId('public-content')).toBeTruthy();
  });

  it('shows SpacesLoadingState when authenticated but no current space and hasZeroSpaces is false', () => {
    mockUseAuthWithSpaces.mockReturnValueOnce({
      isAuthenticated: true,
      authLoading: false,
      spacesLoading: false,
      hasZeroSpaces: false,
      currentSpace: null,
      refreshSpaces: mockRefreshSpaces,
      isReady: false,
      user: { id: 'user-1', email: 'user@example.com' },
      createSpace: mockCreateSpace,
    });
    render(
      <AppWithOnboarding>
        <div data-testid="app-content">App Content</div>
      </AppWithOnboarding>
    );
    expect(screen.getByTestId('spaces-loading')).toBeTruthy();
  });

  it('shows provisioning screen when authenticated, no space, hasZeroSpaces is true', () => {
    mockUseAuthWithSpaces.mockReturnValueOnce({
      isAuthenticated: true,
      authLoading: false,
      spacesLoading: false,
      hasZeroSpaces: true,
      currentSpace: null,
      refreshSpaces: mockRefreshSpaces,
      isReady: false,
      user: { id: 'user-1', email: 'user@example.com' },
      createSpace: mockCreateSpace,
    });
    render(
      <AppWithOnboarding>
        <div data-testid="app-content">App Content</div>
      </AppWithOnboarding>
    );
    expect(screen.getByText('Finalizing your workspace')).toBeTruthy();
    expect(screen.getByText('Retry space lookup')).toBeTruthy();
  });

  it('shows Refreshing... when retry button is clicked', async () => {
    mockRefreshSpaces.mockResolvedValueOnce(undefined);
    mockUseAuthWithSpaces.mockReturnValue({
      isAuthenticated: true,
      authLoading: false,
      spacesLoading: false,
      hasZeroSpaces: true,
      currentSpace: null,
      refreshSpaces: mockRefreshSpaces,
      isReady: false,
      user: { id: 'user-1', email: 'user@example.com' },
      createSpace: mockCreateSpace,
    });
    render(
      <AppWithOnboarding>
        <div data-testid="app-content">App Content</div>
      </AppWithOnboarding>
    );
    const retryBtn = screen.getByText('Retry space lookup');
    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(mockRefreshSpaces).toHaveBeenCalled();
    });
  });

  it('renders nothing (children) when spacesLoading is true and authenticated', () => {
    mockUseAuthWithSpaces.mockReturnValueOnce({
      isAuthenticated: true,
      authLoading: false,
      spacesLoading: true,
      hasZeroSpaces: false,
      currentSpace: { id: 'space-1', name: 'Test' },
      refreshSpaces: mockRefreshSpaces,
      isReady: false,
      user: { id: 'user-1', email: 'user@example.com' },
      createSpace: mockCreateSpace,
    });
    render(
      <AppWithOnboarding>
        <div data-testid="app-content">App Content</div>
      </AppWithOnboarding>
    );
    expect(screen.getByTestId('app-content')).toBeTruthy();
  });
});
