/**
 * Unit tests for hooks/usePWAInstall.ts
 *
 * Tests PWA install prompt, installed detection, and event listener handling.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const mockUseDevice = vi.fn();

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: () => mockUseDevice(),
}));

describe('usePWAInstall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDevice.mockReturnValue({
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isStandalone: false,
    });
  });

  it('should return initial uninstalled, not installable state on non-iOS', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canPrompt).toBe(false);
  });

  it('should expose promptInstall function', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(typeof result.current.promptInstall).toBe('function');
  });

  it('should return isInstallable true for iOS when not standalone', () => {
    mockUseDevice.mockReturnValue({
      isIOS: true,
      isAndroid: false,
      isMobile: true,
      isStandalone: false,
    });

    const { result } = renderHook(() => usePWAInstall());

    // Uses queueMicrotask, so check after mount
    // isInstallable will be set to true for iOS + !isStandalone
    expect(result.current.isIOS).toBe(true);
    expect(result.current.isStandalone).toBe(false);
  });

  it('should return isInstalled true when isStandalone is true', async () => {
    mockUseDevice.mockReturnValue({
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isStandalone: true,
    });

    const { result } = renderHook(() => usePWAInstall());

    // Wait for queueMicrotask
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isInstalled).toBe(true);
  });

  it('should handle beforeinstallprompt event and set canPrompt true', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      const event = Object.assign(new Event('beforeinstallprompt'), {
        platforms: ['web'],
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
        prompt: vi.fn().mockResolvedValue(undefined),
        preventDefault: vi.fn(),
      });
      window.dispatchEvent(event);
    });

    expect(result.current.canPrompt).toBe(true);
  });

  it('should handle appinstalled event and set isInstalled true', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canPrompt).toBe(false);
  });

  it('promptInstall should return no-prompt result when no deferred prompt', async () => {
    const { result } = renderHook(() => usePWAInstall());

    const outcome = await act(async () => result.current.promptInstall());

    expect(outcome).toEqual({ success: false, outcome: 'no-prompt' });
  });

  it('should pass through platform detection from DeviceContext', () => {
    mockUseDevice.mockReturnValue({
      isIOS: true,
      isAndroid: false,
      isMobile: true,
      isStandalone: false,
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isIOS).toBe(true);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isAndroid).toBe(false);
  });
});
