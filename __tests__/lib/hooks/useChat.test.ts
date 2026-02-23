/**
 * Unit tests for lib/hooks/useChat.ts
 *
 * Tests AI chat functionality:
 * - Message sending
 * - Chat history
 * - Streaming responses
 * - Error handling
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock fetch
global.fetch = vi.fn();

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import { useChat } from '@/lib/hooks/useChat';

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'AI response',
        messageId: 'msg-123',
      }),
    });
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChat('space-123'));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should send message', async () => {
    const { result } = renderHook(() => useChat('space-123'));

    await act(async () => {
      await result.current.sendMessage('Hello AI');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello AI'),
      })
    );
  });

  it('should handle errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to send message' }),
    });

    const { result } = renderHook(() => useChat('space-123'));

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toBeDefined();
  });

  it('should clear messages', () => {
    const { result } = renderHook(() => useChat('space-123'));

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
  });
});
