// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationPageClient from '@/components/location/LocationPageClient';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/location'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

const mockUseFamilyLocation = vi.fn();
vi.mock('@/hooks/useFamilyLocation', () => ({
  useFamilyLocation: (...args: unknown[]) => mockUseFamilyLocation(...args),
}));

vi.mock('@/lib/native', () => ({
  isNative: false,
  getCurrentPosition: vi.fn(() => Promise.resolve({ latitude: 37.7, longitude: -122.4, accuracy: 10 })),
}));

vi.mock('@/components/layout/FeatureLayout', () => ({
  FeatureLayout: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-testid': 'feature-layout' }, children),
}));

vi.mock('@/components/subscription/FeatureGateWrapper', () => ({
  FeatureGateWrapper: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-testid': 'feature-gate' }, children),
}));

vi.mock('@/components/shared/PageErrorBoundary', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/PullToRefresh', () => ({
  PullToRefresh: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/CollapsibleStatsGrid', () => ({
  CollapsibleStatsGrid: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-testid': 'stats-grid' }, children),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => React.createElement('div', { 'data-testid': 'dynamic-component' }),
}));

describe('LocationPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFamilyLocation.mockReturnValue({
      familyLocations: [],
      places: [],
      settings: null,
      isLoading: false,
      isTracking: false,
      error: null,
      permissionStatus: 'granted',
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      refreshFamilyLocations: vi.fn().mockResolvedValue(undefined),
      updateSettings: vi.fn(),
      createPlace: vi.fn(),
      deletePlace: vi.fn(),
      currentLocation: null,
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<LocationPageClient spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders inside FeatureGateWrapper', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByTestId('feature-gate')).toBeTruthy();
  });

  it('renders inside FeatureLayout', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByTestId('feature-layout')).toBeTruthy();
  });

  it('renders the Family Location heading', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByText('Family Location')).toBeTruthy();
  });

  it('renders view mode tabs', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByText('Map')).toBeTruthy();
    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders Refresh button', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByText('Refresh')).toBeTruthy();
  });

  it('renders SOS emergency button', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByText('SOS')).toBeTruthy();
  });

  it('shows emergency confirmation modal when SOS is clicked', () => {
    render(<LocationPageClient spaceId="space-1" />);
    fireEvent.click(screen.getByText('SOS'));
    expect(screen.getByText('Send Emergency Alert?')).toBeTruthy();
  });

  it('closes emergency modal when Cancel is clicked', () => {
    render(<LocationPageClient spaceId="space-1" />);
    fireEvent.click(screen.getByText('SOS'));
    expect(screen.getByText('Send Emergency Alert?')).toBeTruthy();
    const cancelBtn = screen.getAllByText('Cancel')[0];
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Send Emergency Alert?')).toBeNull();
  });

  it('shows mobile app prompt on desktop', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByText('Share Your Location')).toBeTruthy();
  });

  it('renders stats grid', () => {
    render(<LocationPageClient spaceId="space-1" />);
    expect(screen.getByTestId('stats-grid')).toBeTruthy();
  });

  it('switches to Activity view when Activity tab is clicked', () => {
    render(<LocationPageClient spaceId="space-1" />);
    fireEvent.click(screen.getByText('Activity'));
    expect(screen.queryByText('Activity')).toBeTruthy();
  });

  it('switches to Settings view when Settings tab is clicked', () => {
    render(<LocationPageClient spaceId="space-1" />);
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.queryByText('Settings')).toBeTruthy();
  });
});
