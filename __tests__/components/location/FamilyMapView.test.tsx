// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

const mockUseFamilyLocation = vi.fn();
vi.mock('@/hooks/useFamilyLocation', () => ({
  useFamilyLocation: (...args: unknown[]) => mockUseFamilyLocation(...args),
}));

vi.mock('@/lib/native', () => ({
  isNative: false,
  formatDistance: vi.fn((m: number) => `${Math.round(m)}m`),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => React.createElement('div', { 'data-testid': 'map-component' }),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: React.PropsWithChildren) => React.createElement('div', { 'data-testid': 'map-container' }, children),
  TileLayer: () => null,
  Marker: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  Popup: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  Circle: () => null,
  useMap: vi.fn(() => ({ setView: vi.fn() })),
}));

const defaultReturn = {
  familyLocations: [],
  places: [],
  currentLocation: null,
  isLoading: false,
  isTracking: false,
  error: null,
  permissionStatus: 'granted',
  startTracking: vi.fn(),
  stopTracking: vi.fn(),
  refreshFamilyLocations: vi.fn(),
  settings: null,
  updateSettings: vi.fn(),
  createPlace: vi.fn(),
  deletePlace: vi.fn(),
};

describe('FamilyMapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFamilyLocation.mockReturnValue(defaultReturn);
  });

  it('renders without crashing', async () => {
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    const { container } = render(<FamilyMapView spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading state initially (mapReady starts false)', async () => {
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    render(<FamilyMapView spaceId="space-1" />);
    // Initially shows loading because mapReady=false
    expect(screen.getByText('Loading map...')).toBeTruthy();
  });

  it('renders Family Map header after map is ready', async () => {
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    render(<FamilyMapView spaceId="space-1" />);
    // After requestAnimationFrame fires, mapReady becomes true
    await waitFor(() => {
      expect(screen.getByText('Family Map')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('shows loading spinner when isLoading is true', async () => {
    mockUseFamilyLocation.mockReturnValue({ ...defaultReturn, isLoading: true });
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    const { container } = render(<FamilyMapView spaceId="space-1" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('shows member count after map is ready', async () => {
    mockUseFamilyLocation.mockReturnValue({
      ...defaultReturn,
      familyLocations: [
        { user_id: 'u1', name: 'Alice', minutes_ago: 2, latitude: 37.7, longitude: -122.4, avatar_url: null, battery_level: null, is_charging: false, accuracy: null, current_place: null, precision: 'exact' },
      ],
    });
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    render(<FamilyMapView spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText(/1 member/)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('shows error message after map is ready', async () => {
    mockUseFamilyLocation.mockReturnValue({ ...defaultReturn, error: 'Location error occurred' });
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    render(<FamilyMapView spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Location error occurred')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('accepts className prop', async () => {
    const { FamilyMapView } = await import('@/components/location/FamilyMapView');
    const { container } = render(<FamilyMapView spaceId="space-1" className="test-class" />);
    expect(container.firstChild).toBeTruthy();
  });
});
