// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const mockUseFamilyLocation = vi.fn();

vi.mock('@/hooks/useFamilyLocation', () => ({
  useFamilyLocation: (...args: unknown[]) => mockUseFamilyLocation(...args),
}));

vi.mock('@/lib/native', () => ({
  isNative: false,
  formatDistance: vi.fn((m: number) => `${Math.round(m)}m`),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

const defaultFamilyLocationReturn = {
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

describe('FamilyMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFamilyLocation.mockReturnValue(defaultFamilyLocationReturn);
  });

  it('renders without crashing', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    const { container } = render(<FamilyMap spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders Family Location header', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText('Family Location')).toBeTruthy();
  });

  it('shows loading spinner when loading', async () => {
    mockUseFamilyLocation.mockReturnValue({ ...defaultFamilyLocationReturn, isLoading: true });
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText('Loading family locations...')).toBeTruthy();
  });

  it('shows empty state when no family members', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText('No family members are sharing their location yet.')).toBeTruthy();
  });

  it('displays member count', async () => {
    mockUseFamilyLocation.mockReturnValue({
      ...defaultFamilyLocationReturn,
      familyLocations: [
        { user_id: 'u1', name: 'Alice', minutes_ago: 2, latitude: 37.7, longitude: -122.4, avatar_url: null, battery_level: null, is_charging: false, accuracy: null, current_place: null, precision: 'exact' },
        { user_id: 'u2', name: 'Bob', minutes_ago: 10, latitude: 37.8, longitude: -122.5, avatar_url: null, battery_level: null, is_charging: false, accuracy: null, current_place: null, precision: 'exact' },
      ],
    });
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText('2 members sharing')).toBeTruthy();
  });

  it('shows error message when error is set', async () => {
    mockUseFamilyLocation.mockReturnValue({ ...defaultFamilyLocationReturn, error: 'Failed to load locations' });
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText('Failed to load locations')).toBeTruthy();
  });

  it('renders refresh button', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByTitle('Refresh locations')).toBeTruthy();
  });

  it('calls refreshFamilyLocations when refresh button is clicked', async () => {
    const refreshFamilyLocations = vi.fn().mockResolvedValue(undefined);
    mockUseFamilyLocation.mockReturnValue({ ...defaultFamilyLocationReturn, refreshFamilyLocations });
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    const refreshBtn = screen.getByTitle('Refresh locations');
    fireEvent.click(refreshBtn);
    await waitFor(() => expect(refreshFamilyLocations).toHaveBeenCalled());
  });

  it('shows desktop "View only" badge since isNative is false', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText('View only')).toBeTruthy();
  });

  it('shows app download prompt on desktop', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    render(<FamilyMap spaceId="space-1" />);
    expect(screen.getByText(/download the rowan app/i)).toBeTruthy();
  });

  it('applies custom className', async () => {
    const { FamilyMap } = await import('@/components/location/FamilyMap');
    const { container } = render(<FamilyMap spaceId="space-1" className="custom-class" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('custom-class');
  });
});
