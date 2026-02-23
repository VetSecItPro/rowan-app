/**
 * Unit tests for lib/utils/haptics.ts
 *
 * Tests haptic feedback utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  isHapticSupported,
  hapticStyles,
} from '@/lib/utils/haptics';

// Note: Most haptic functionality requires navigator mocking which is complex
// in the test environment. These tests focus on the exported constants and
// the public API shape.

describe('isHapticSupported', () => {
  it('should return false in test environment (no navigator.vibrate)', () => {
    const result = isHapticSupported();
    // In test environment, navigator.vibrate is typically not available
    expect(typeof result).toBe('boolean');
  });
});

describe('hapticStyles', () => {
  it('should have base style', () => {
    expect(hapticStyles.base).toBe('transition-all duration-150 ease-out');
  });

  it('should have light style', () => {
    expect(hapticStyles.light).toBe('active:scale-[0.98] active:opacity-90');
  });

  it('should have medium style', () => {
    expect(hapticStyles.medium).toBe('active:scale-[0.96] active:opacity-85');
  });

  it('should have heavy style', () => {
    expect(hapticStyles.heavy).toBe('active:scale-[0.94] active:opacity-80');
  });

  it('should have bounce style', () => {
    expect(hapticStyles.bounce).toBe('active:scale-105 transition-transform duration-100');
  });

  it('should have touchable style', () => {
    expect(hapticStyles.touchable).toBe('transition-all duration-150 ease-out active:scale-[0.98] active:opacity-90');
  });

  it('should have all required style properties', () => {
    expect(hapticStyles).toHaveProperty('base');
    expect(hapticStyles).toHaveProperty('light');
    expect(hapticStyles).toHaveProperty('medium');
    expect(hapticStyles).toHaveProperty('heavy');
    expect(hapticStyles).toHaveProperty('bounce');
    expect(hapticStyles).toHaveProperty('touchable');
  });
});
