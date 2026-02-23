// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(() => ({ isOnline: true, quality: 'good' })),
}));

vi.mock('@/lib/hooks/useOfflineQueue', () => ({
  useOfflineQueue: vi.fn(() => ({ pendingCount: 0, failedCount: 0, isProcessing: false })),
}));

import { NetworkStatus, OfflineQueueBadge } from '@/components/ui/NetworkStatus';

describe('NetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NetworkStatus />);
    expect(container).toBeDefined();
  });

  it('returns null when online with no pending/failed', () => {
    const { container } = render(<NetworkStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline banner when offline', async () => {
    const { useNetworkStatus } = await import('@/hooks/useNetworkStatus');
    (useNetworkStatus as ReturnType<typeof vi.fn>).mockReturnValueOnce({ isOnline: false, quality: 'none' });
    render(<NetworkStatus />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('shows offline message when offline', async () => {
    const { useNetworkStatus } = await import('@/hooks/useNetworkStatus');
    (useNetworkStatus as ReturnType<typeof vi.fn>).mockReturnValue({ isOnline: false, quality: 'none' });
    render(<NetworkStatus />);
    expect(screen.getByText(/offline/i)).toBeDefined();
  });

  it('shows pending changes count when offline with pending', async () => {
    const { useNetworkStatus } = await import('@/hooks/useNetworkStatus');
    const { useOfflineQueue } = await import('@/lib/hooks/useOfflineQueue');
    (useNetworkStatus as ReturnType<typeof vi.fn>).mockReturnValue({ isOnline: false, quality: 'none' });
    (useOfflineQueue as ReturnType<typeof vi.fn>).mockReturnValue({ pendingCount: 3, failedCount: 0, isProcessing: false });
    render(<NetworkStatus />);
    expect(screen.getByText(/3 change/)).toBeDefined();
  });
});

describe('OfflineQueueBadge', () => {
  it('renders without crashing when pending count > 0', () => {
    render(<OfflineQueueBadge pendingCount={2} isProcessing={false} />);
    expect(screen.getByText('2 pending')).toBeDefined();
  });

  it('returns null when pending count is 0', () => {
    const { container } = render(<OfflineQueueBadge pendingCount={0} isProcessing={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows processing spinner when isProcessing', () => {
    const { container } = render(<OfflineQueueBadge pendingCount={1} isProcessing={true} />);
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });
});
