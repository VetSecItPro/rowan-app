/**
 * Unit tests for lib/utils/input-sanitization.ts
 *
 * Tests SQL injection prevention via LIKE/ILIKE wildcard escaping
 * and input length limiting for ReDoS prevention.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchInput,
  sanitizeSearchInputStrict,
  isValidSearchQuery,
} from '@/lib/utils/input-sanitization';

describe('sanitizeSearchInput', () => {
  it('should return empty string for null/undefined/empty', () => {
    // @ts-expect-error testing runtime safety
    expect(sanitizeSearchInput(null)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizeSearchInput(undefined)).toBe('');
    expect(sanitizeSearchInput('')).toBe('');
  });

  it('should return non-string inputs as empty string', () => {
    // @ts-expect-error testing runtime safety
    expect(sanitizeSearchInput(123)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizeSearchInput({})).toBe('');
  });

  it('should pass through clean text unchanged', () => {
    expect(sanitizeSearchInput('hello world')).toBe('hello world');
    expect(sanitizeSearchInput('Buy groceries')).toBe('Buy groceries');
  });

  it('should trim whitespace', () => {
    expect(sanitizeSearchInput('  hello  ')).toBe('hello');
  });

  it('should escape SQL LIKE wildcard %', () => {
    expect(sanitizeSearchInput('100%')).toBe('100\\%');
    expect(sanitizeSearchInput('%admin%')).toBe('\\%admin\\%');
  });

  it('should escape SQL LIKE wildcard _', () => {
    expect(sanitizeSearchInput('user_name')).toBe('user\\_name');
    expect(sanitizeSearchInput('_prefix')).toBe('\\_prefix');
  });

  it('should escape both wildcards in mixed input', () => {
    expect(sanitizeSearchInput('50% off_sale')).toBe('50\\% off\\_sale');
  });

  it('should truncate to default max length (100)', () => {
    const longInput = 'a'.repeat(200);
    const result = sanitizeSearchInput(longInput);
    expect(result).toHaveLength(100);
  });

  it('should truncate to custom max length', () => {
    const longInput = 'a'.repeat(50);
    const result = sanitizeSearchInput(longInput, 20);
    expect(result).toHaveLength(20);
  });

  it('should handle ReDoS attack patterns safely', () => {
    // Extremely long repeated patterns that could cause ReDoS
    const malicious = '%'.repeat(1000);
    const result = sanitizeSearchInput(malicious, 100);
    // Should truncate first, then escape
    expect(result.length).toBeLessThanOrEqual(200); // Each % becomes \% (2 chars)
  });
});

describe('sanitizeSearchInputStrict', () => {
  it('should return empty string if result is too short', () => {
    expect(sanitizeSearchInputStrict('', 1)).toBe('');
    expect(sanitizeSearchInputStrict(' ', 1)).toBe('');
  });

  it('should return sanitized string if long enough', () => {
    expect(sanitizeSearchInputStrict('hello', 3)).toBe('hello');
  });

  it('should respect custom minLength', () => {
    expect(sanitizeSearchInputStrict('ab', 3)).toBe('');
    expect(sanitizeSearchInputStrict('abc', 3)).toBe('abc');
  });

  it('should still escape SQL wildcards', () => {
    expect(sanitizeSearchInputStrict('50%', 1)).toBe('50\\%');
  });
});

describe('isValidSearchQuery', () => {
  it('should return false for empty/whitespace input', () => {
    expect(isValidSearchQuery('')).toBe(false);
    expect(isValidSearchQuery('   ')).toBe(false);
  });

  it('should return true for valid input', () => {
    expect(isValidSearchQuery('hello')).toBe(true);
    expect(isValidSearchQuery('a')).toBe(true);
  });

  it('should respect custom minLength', () => {
    expect(isValidSearchQuery('ab', 3)).toBe(false);
    expect(isValidSearchQuery('abc', 3)).toBe(true);
  });

  it('should count escaped characters correctly', () => {
    // "%" becomes "\%" (3 chars after escape)
    expect(isValidSearchQuery('%', 1)).toBe(true);
  });
});
