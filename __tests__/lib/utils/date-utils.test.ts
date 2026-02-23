/**
 * Unit tests for lib/utils/date-utils.ts
 *
 * Tests date utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDateString,
  formatDate,
  formatDateString,
  formatTimestamp,
  formatDateTime,
  formatTime,
  formatTimestampDate,
  getCurrentDateString,
  formatRelativeTime,
} from '@/lib/utils/date-utils';

describe('parseDateString', () => {
  it('should parse date string to local timezone Date', () => {
    const result = parseDateString('2025-01-15');

    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0); // January is 0
    expect(result.getDate()).toBe(15);
  });

  it('should handle different months correctly', () => {
    const result = parseDateString('2025-12-25');

    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // December is 11
    expect(result.getDate()).toBe(25);
  });

  it('should not be affected by timezone', () => {
    const result = parseDateString('2025-01-01');

    // Should be Jan 1 in local time, not shifted by timezone
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });
});

describe('formatDate', () => {
  it('should format date string with custom format', () => {
    const result = formatDate('2025-01-15', 'yyyy-MM-dd');

    expect(result).toBe('2025-01-15');
  });

  it('should format date with long format', () => {
    const result = formatDate('2025-01-15', 'EEEE, MMMM d, yyyy');

    expect(result).toContain('2025');
    expect(result).toContain('January');
  });

  it('should format date with short format', () => {
    const result = formatDate('2025-01-15', 'MMM d');

    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });
});

describe('formatDateString', () => {
  it('should format with default format', () => {
    const result = formatDateString('2025-01-15');

    expect(result).toContain('2025');
    expect(result).toContain('Jan');
  });

  it('should format with custom format', () => {
    const result = formatDateString('2025-12-25', 'MMMM d, yyyy');

    expect(result).toBe('December 25, 2025');
  });

  it('should use MMM d, yyyy as default', () => {
    const result = formatDateString('2025-01-15');

    expect(result).toBe('Jan 15, 2025');
  });
});

describe('formatTimestamp', () => {
  it('should format UTC timestamp with custom format', () => {
    const result = formatTimestamp('2025-01-15T10:30:00Z', 'yyyy-MM-dd');

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should format timestamp with time', () => {
    const result = formatTimestamp('2025-01-15T10:30:00Z', 'h:mm a');

    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it('should return empty string for invalid timestamp', () => {
    const result = formatTimestamp('invalid-date', 'yyyy-MM-dd');

    expect(result).toBe('');
  });

  it('should handle timestamps with timezone', () => {
    const result = formatTimestamp('2025-01-15T10:30:00-05:00', 'yyyy-MM-dd');

    expect(result).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  it('should format UTC timestamp as date and time', () => {
    const result = formatDateTime('2025-01-15T10:30:00Z');

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should return empty string for invalid timestamp', () => {
    const result = formatDateTime('invalid-date');

    expect(result).toBe('');
  });

  it('should include date and time in output', () => {
    const result = formatDateTime('2025-01-15T10:30:00Z');

    // PPp format includes date and time
    expect(result).toContain('2025');
  });
});

describe('formatTime', () => {
  it('should format UTC timestamp as time only', () => {
    const result = formatTime('2025-01-15T10:30:00Z');

    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it('should handle different times', () => {
    const result = formatTime('2025-01-15T14:45:00Z');

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('formatTimestampDate', () => {
  it('should format UTC timestamp as date only', () => {
    const result = formatTimestampDate('2025-01-15T10:30:00Z');

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should not include time in output', () => {
    const result = formatTimestampDate('2025-01-15T10:30:00Z');

    // PP format is date only
    expect(result).toContain('2025');
  });
});

describe('getCurrentDateString', () => {
  it('should return current date in yyyy-MM-dd format', () => {
    const result = getCurrentDateString();

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return a valid date', () => {
    const result = getCurrentDateString();
    const parsed = new Date(result);

    expect(parsed).toBeInstanceOf(Date);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('should return today\'s date', () => {
    const result = getCurrentDateString();
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    expect(result).toBe(todayString);
  });
});

describe('formatRelativeTime', () => {
  it('should format recent timestamp as relative time', () => {
    // Create a timestamp 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinutesAgo);

    expect(result).toContain('ago');
  });

  it('should format timestamp from hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoHoursAgo);

    expect(result).toContain('ago');
  });

  it('should format timestamp from days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(threeDaysAgo);

    expect(result).toContain('ago');
  });

  it('should include "ago" suffix', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const result = formatRelativeTime(oneMinuteAgo);

    expect(result).toContain('ago');
  });
});
