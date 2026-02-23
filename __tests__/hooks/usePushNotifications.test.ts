/**
 * Unit tests for hooks/usePushNotifications.ts
 *
 * Tests availability check, permission request, registration, and unregistration.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const mockIsPushAvailable = vi.fn();
const mockRequestPushPermissions = vi.fn();
const mockRegisterForPush = vi.fn();
const mockSetupNotificationListeners = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/lib/native/push-notifications', () => ({
  isPushAvailable: () => mockIsPushAvailable(),
  requestPushPermissions: () => mockRequestPushPermissions(),
  registerForPush: () => mockRegisterForPush(),
  setupNotificationListeners: (...args: unknown[]) => mockSetupNotificationListeners(...args),
}));

vi.mock('@/lib/native', () => ({
  isNative: false,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPushAvailable.mockReturnValue(true);
    mockRequestPushPermissions.mockResolvedValue(true);
    mockRegisterForPush.mockResolvedValue({ token: 'push-token-123', platform: 'web' });
    mockSetupNotificationListeners.mockReturnValue(() => {});
  });

  it('should return initial state', () => {
    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isPermissionGranted).toBe(false);
    expect(result.current.isRegistered).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return isAvailable false when push not supported', () => {
    mockIsPushAvailable.mockReturnValue(false);

    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    expect(result.current.isAvailable).toBe(false);
  });

  it('requestPermissions should return false when push not available', async () => {
    mockIsPushAvailable.mockReturnValue(false);

    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    const granted = await act(async () => result.current.requestPermissions());

    expect(granted).toBe(false);
    expect(result.current.error).toBe('Push notifications not available on this platform');
  });

  it('requestPermissions should call native API and update state when available', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    const granted = await act(async () => result.current.requestPermissions());

    expect(granted).toBe(true);
    expect(result.current.isPermissionGranted).toBe(true);
    expect(mockRequestPushPermissions).toHaveBeenCalledTimes(1);
  });

  it('requestPermissions should set error when permission denied', async () => {
    mockRequestPushPermissions.mockResolvedValue(false);

    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    const granted = await act(async () => result.current.requestPermissions());

    expect(granted).toBe(false);
    expect(result.current.error).toBe('Push notification permission denied');
  });

  it('register should set token and isRegistered on success', async () => {
    // Mock the fetch for backend registration
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    const success = await act(async () => result.current.register());

    expect(success).toBe(true);
    expect(result.current.token).toBe('push-token-123');
    expect(result.current.isRegistered).toBe(true);
  });

  it('register should return false when spaceId is empty', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: '' })
    );

    const success = await act(async () => result.current.register());

    expect(success).toBe(false);
    expect(result.current.error).toBe('Space ID is required');
  });

  it('unregister should return true immediately when no token', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    const success = await act(async () => result.current.unregister());

    expect(success).toBe(true);
  });

  it('should expose requestPermissions, register, and unregister as functions', () => {
    const { result } = renderHook(() =>
      usePushNotifications({ spaceId: 'space-1' })
    );

    expect(typeof result.current.requestPermissions).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.unregister).toBe('function');
  });
});
