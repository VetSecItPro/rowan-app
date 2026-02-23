/**
 * Unit tests for lib/hooks/useValidatedSearchParams.ts
 *
 * Tests URL parameter validation:
 * - Zod schema validation
 * - Type safety
 * - Error handling
 * - Multiple values for same key
 * - Pre-built schemas
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { z } from 'zod';
import {
  useValidatedSearchParams,
  TokenParamsSchema,
  AuthCallbackParamsSchema,
  LoginParamsSchema,
} from '@/lib/hooks/useValidatedSearchParams';

// Mock next/navigation
const mockUseSearchParams = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

describe('useValidatedSearchParams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when searchParams is not available', () => {
    mockUseSearchParams.mockReturnValue(null);

    const schema = z.object({ id: z.string() });
    const { result } = renderHook(() => useValidatedSearchParams(schema));

    expect(result.current.params).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.raw).toBeNull();
  });

  it('should validate and return valid parameters', () => {
    const mockParams = new URLSearchParams('id=123&name=test');
    mockUseSearchParams.mockReturnValue(mockParams);

    const schema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const { result } = renderHook(() => useValidatedSearchParams(schema));

    expect(result.current.params).toEqual({ id: '123', name: 'test' });
    expect(result.current.error).toBeNull();
    expect(result.current.raw).toBe(mockParams);
  });

  it('should return error for invalid parameters', () => {
    const mockParams = new URLSearchParams('id=abc');
    mockUseSearchParams.mockReturnValue(mockParams);

    const schema = z.object({
      id: z.string().regex(/^\d+$/),
    });

    const { result } = renderHook(() => useValidatedSearchParams(schema));

    expect(result.current.params).toBeNull();
    expect(result.current.error).toBeInstanceOf(z.ZodError);
    expect(result.current.raw).toBe(mockParams);
  });

  it('should handle optional parameters', () => {
    const mockParams = new URLSearchParams('id=123');
    mockUseSearchParams.mockReturnValue(mockParams);

    const schema = z.object({
      id: z.string(),
      name: z.string().optional(),
    });

    const { result } = renderHook(() => useValidatedSearchParams(schema));

    expect(result.current.params).toEqual({ id: '123' });
    expect(result.current.error).toBeNull();
  });

  it('should handle multiple values for same key', () => {
    const mockParams = new URLSearchParams();
    mockParams.append('tag', 'urgent');
    mockParams.append('tag', 'work');
    mockUseSearchParams.mockReturnValue(mockParams);

    const schema = z.object({
      tag: z.array(z.string()),
    });

    const { result } = renderHook(() => useValidatedSearchParams(schema));

    expect(result.current.params).toEqual({ tag: ['urgent', 'work'] });
  });

  it('should handle empty search params', () => {
    const mockParams = new URLSearchParams('');
    mockUseSearchParams.mockReturnValue(mockParams);

    const schema = z.object({
      id: z.string().optional(),
    });

    const { result } = renderHook(() => useValidatedSearchParams(schema));

    expect(result.current.params).toEqual({});
    expect(result.current.error).toBeNull();
  });
});

describe('TokenParamsSchema', () => {
  it('should validate valid token', () => {
    const result = TokenParamsSchema.safeParse({ token: 'abc123-xyz' });
    expect(result.success).toBe(true);
  });

  it('should reject token that is too long', () => {
    const longToken = 'a'.repeat(501);
    const result = TokenParamsSchema.safeParse({ token: longToken });
    expect(result.success).toBe(false);
  });

  it('should reject token with invalid characters', () => {
    const result = TokenParamsSchema.safeParse({ token: 'abc@123' });
    expect(result.success).toBe(false);
  });

  it('should allow missing token (optional)', () => {
    const result = TokenParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('AuthCallbackParamsSchema', () => {
  it('should validate complete auth callback params', () => {
    const result = AuthCallbackParamsSchema.safeParse({
      access_token: 'token123',
      refresh_token: 'refresh456',
      type: 'recovery',
    });
    expect(result.success).toBe(true);
  });

  it('should validate error params', () => {
    const result = AuthCallbackParamsSchema.safeParse({
      error: 'invalid_request',
      error_description: 'Token expired',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid type', () => {
    const result = AuthCallbackParamsSchema.safeParse({
      type: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });

  it('should allow empty object', () => {
    const result = AuthCallbackParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('LoginParamsSchema', () => {
  it('should validate redirect param', () => {
    const result = LoginParamsSchema.safeParse({
      redirect: '/dashboard',
    });
    expect(result.success).toBe(true);
  });

  it('should validate boolean flags', () => {
    const result = LoginParamsSchema.safeParse({
      registered: 'true',
      verified: 'true',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid boolean values', () => {
    const result = LoginParamsSchema.safeParse({
      registered: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('should allow all optional params missing', () => {
    const result = LoginParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
