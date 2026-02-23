/**
 * Unit tests for lib/utils.ts
 *
 * Tests:
 * - cn(): Tailwind class merging and conditional classes
 * - sanitizeSearchInput(): SQL ILIKE injection prevention, PostgREST filter safety,
 *   length limiting, empty/null handling
 */

import { describe, it, expect } from 'vitest';
import { cn, sanitizeSearchInput } from '@/lib/utils';

// ---------------------------------------------------------------------------
// cn() — clsx + tailwind-merge
// ---------------------------------------------------------------------------
describe('cn', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('merges multiple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('deduplicates conflicting Tailwind classes (tailwind-merge)', () => {
    // tailwind-merge resolves conflicts: last padding wins
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('deduplicates conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional classes with objects', () => {
    expect(cn('base', { 'active-class': true, 'inactive-class': false })).toBe('base active-class');
  });

  it('excludes falsy conditional class keys', () => {
    const result = cn('btn', { hidden: false, visible: true });
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('handles array of classes', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });

  it('handles mixed types: strings, objects, arrays', () => {
    const result = cn('base', ['extra'], { conditional: true });
    expect(result).toContain('base');
    expect(result).toContain('extra');
    expect(result).toContain('conditional');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn(undefined, null, 'class-a')).toBe('class-a');
  });

  it('handles boolean false without throwing', () => {
    expect(cn(false, 'class-b')).toBe('class-b');
  });
});

// ---------------------------------------------------------------------------
// sanitizeSearchInput()
// ---------------------------------------------------------------------------
describe('sanitizeSearchInput', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeSearchInput('')).toBe('');
  });

  it('returns empty string for non-string input (null)', () => {
    // @ts-expect-error testing runtime safety
    expect(sanitizeSearchInput(null)).toBe('');
  });

  it('returns empty string for non-string input (number)', () => {
    // @ts-expect-error testing runtime safety
    expect(sanitizeSearchInput(42)).toBe('');
  });

  it('passes through clean search text unchanged', () => {
    expect(sanitizeSearchInput('hello world')).toBe('hello world');
  });

  it('escapes SQL ILIKE wildcard %', () => {
    expect(sanitizeSearchInput('100%')).toBe('100\\%');
  });

  it('escapes SQL ILIKE wildcard _', () => {
    expect(sanitizeSearchInput('user_name')).toBe('user\\_name');
  });

  it('escapes backslash first to prevent double-escaping', () => {
    const result = sanitizeSearchInput('path\\file');
    expect(result).toBe('path\\\\file');
  });

  it('removes PostgREST filter syntax character .', () => {
    const result = sanitizeSearchInput('table.column');
    // dot is replaced with space, then collapsed
    expect(result).not.toContain('.');
  });

  it('removes PostgREST filter syntax characters , ( )', () => {
    const result = sanitizeSearchInput('or(name,eq,value)');
    expect(result).not.toContain(',');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  it('collapses multiple spaces into one', () => {
    expect(sanitizeSearchInput('too   many   spaces')).toBe('too many spaces');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeSearchInput('  trimmed  ')).toBe('trimmed');
  });

  it('limits input to 100 characters', () => {
    const long = 'a'.repeat(200);
    const result = sanitizeSearchInput(long);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('exactly 100 character input is not truncated', () => {
    const exact = 'a'.repeat(100);
    const result = sanitizeSearchInput(exact);
    expect(result.length).toBe(100);
  });

  it('handles combined injection attempt: PostgREST + SQL', () => {
    const malicious = 'name.eq.value%20or(1=1)';
    const result = sanitizeSearchInput(malicious);
    // PostgREST special chars removed, SQL wildcards escaped
    expect(result).not.toContain('.');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  it('preserves alphanumeric characters and basic punctuation', () => {
    const result = sanitizeSearchInput('buy groceries for family');
    expect(result).toBe('buy groceries for family');
  });

  it('handles unicode text safely', () => {
    const result = sanitizeSearchInput('Ünïcödé');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
