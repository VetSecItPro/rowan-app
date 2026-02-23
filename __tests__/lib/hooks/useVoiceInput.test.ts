/**
 * Unit tests for lib/hooks/useVoiceInput.ts
 *
 * Tests voice input functionality:
 * - Recording state
 * - Transcription
 * - Error handling
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Import after mocks
import { useVoiceInput } from '@/lib/hooks/useVoiceInput';

describe('useVoiceInput', () => {
  beforeEach(() => {
    // Web Speech API is not available in jsdom
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.state).toBe('idle');
  });

  it('should indicate lack of support in test environment', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isSupported).toBe(false);
  });

  it('should have start and stop functions', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(typeof result.current.startListening).toBe('function');
    expect(typeof result.current.stopListening).toBe('function');
  });

  it('should accept options', () => {
    const onResult = () => {};
    const { result } = renderHook(() =>
      useVoiceInput({
        onResult,
        language: 'en-GB',
        silenceTimeout: 5000,
      })
    );

    expect(result.current.isSupported).toBe(false);
  });
});
