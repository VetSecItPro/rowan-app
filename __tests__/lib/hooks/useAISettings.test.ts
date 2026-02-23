/**
 * Unit tests for lib/hooks/useAISettings.ts
 *
 * Tests AI settings management:
 * - Settings persistence
 * - Provider selection
 * - Model configuration
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock fetch
global.fetch = vi.fn();

// Mock csrfFetch
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn((url, options) => fetch(url, options)),
}));

// Import after mocks
import { useAISettings } from '@/lib/hooks/useAISettings';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

describe('useAISettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          ai_enabled: true,
          voice_enabled: false,
          proactive_suggestions: true,
          morning_briefing: false,
          preferred_voice_lang: 'en-US',
          ai_onboarding_seen: false,
        },
      }),
    });
  });

  it('should load AI settings when enabled', async () => {
    const { result } = renderHook(() => useAISettings(true));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeDefined();
    expect(result.current.settings.ai_enabled).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/ai/settings');
  });

  it('should not query when disabled', async () => {
    const { result } = renderHook(() => useAISettings(false));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should update settings optimistically', async () => {
    const { result } = renderHook(() => useAISettings(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    (csrfFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    act(() => {
      result.current.updateSetting({ voice_enabled: true });
    });

    expect(result.current.settings.voice_enabled).toBe(true);
  });
});
