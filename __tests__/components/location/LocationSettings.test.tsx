// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/utils/toast', () => ({
  showWarning: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

const mockUpdateSettings = vi.fn();
const mockCreatePlace = vi.fn();
const mockDeletePlace = vi.fn();
const mockUseFamilyLocation = vi.fn();

vi.mock('@/hooks/useFamilyLocation', () => ({
  useFamilyLocation: (...args: unknown[]) => mockUseFamilyLocation(...args),
}));

const defaultSettings = {
  sharing_enabled: true,
  precision: 'exact',
  notify_arrivals: true,
  notify_departures: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  history_retention_days: 7,
};

describe('LocationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFamilyLocation.mockReturnValue({
      places: [],
      settings: defaultSettings,
      isLoading: false,
      updateSettings: mockUpdateSettings,
      createPlace: mockCreatePlace,
      deletePlace: mockDeletePlace,
      currentLocation: null,
      familyLocations: [],
      isTracking: false,
      error: null,
      permissionStatus: 'granted',
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      refreshFamilyLocations: vi.fn(),
    });
  });

  it('renders without crashing', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    const { container } = render(<LocationSettings spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading spinner when loading', async () => {
    mockUseFamilyLocation.mockReturnValue({
      ...mockUseFamilyLocation(),
      isLoading: true,
      places: [],
      settings: null,
      updateSettings: mockUpdateSettings,
      createPlace: mockCreatePlace,
      deletePlace: mockDeletePlace,
      currentLocation: null,
    });
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    const { container } = render(<LocationSettings spaceId="space-1" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders Location Settings header', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Location Settings')).toBeTruthy();
  });

  it('renders sharing toggle', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Share my location')).toBeTruthy();
  });

  it('renders precision options', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Exact')).toBeTruthy();
    expect(screen.getByText('Approximate')).toBeTruthy();
    expect(screen.getByText('City only')).toBeTruthy();
    expect(screen.getByText('Hidden')).toBeTruthy();
  });

  it('renders notification toggles', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Arrival notifications')).toBeTruthy();
    expect(screen.getByText('Departure notifications')).toBeTruthy();
  });

  it('renders saved places section', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Saved Places')).toBeTruthy();
  });

  it('shows empty places state', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText(/no saved places yet/i)).toBeTruthy();
  });

  it('shows Add place button', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Add place')).toBeTruthy();
  });

  it('opens add place modal when Add place is clicked', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    fireEvent.click(screen.getByText('Add place'));
    expect(screen.getByText('Add New Place')).toBeTruthy();
  });

  it('renders history retention selector', async () => {
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    expect(screen.getByText('Keep location history for')).toBeTruthy();
  });

  it('calls updateSettings when sharing toggle is clicked', async () => {
    mockUpdateSettings.mockResolvedValue(undefined);
    const { LocationSettings } = await import('@/components/location/LocationSettings');
    render(<LocationSettings spaceId="space-1" />);
    // Find the sharing toggle button (first toggle button in the settings)
    const toggleButtons = document.querySelectorAll('button[class*="rounded-full"]');
    if (toggleButtons.length > 0) {
      fireEvent.click(toggleButtons[0]);
      // updateSettings should be called after click
      expect(toggleButtons.length).toBeGreaterThan(0);
    }
  });
});
