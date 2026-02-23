/**
 * Unit tests for lib/utils/timezone-utils.ts
 *
 * Tests timezone utility functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUserTimezone,
  toUTC,
  fromUTC,
  formatInLocalTimezone,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
  isValidDate,
  getTimezoneAbbreviation,
  getTimezoneOffset,
  FORMATS,
  formatEventTime,
  formatEventDateTime,
} from '@/lib/utils/timezone-utils';

describe('getUserTimezone', () => {
  it('should return user timezone from Intl API', () => {
    const timezone = getUserTimezone();
    expect(timezone).toBeTruthy();
    expect(typeof timezone).toBe('string');
  });
});

describe('toUTC', () => {
  it('should convert Date to UTC ISO string', () => {
    const date = new Date('2025-01-15T10:30:00');
    const result = toUTC(date);

    expect(result).toContain('T');
    expect(result).toContain('Z');
    expect(new Date(result)).toBeInstanceOf(Date);
  });

  it('should convert date string to UTC ISO string', () => {
    const dateString = '2025-01-15T10:30:00';
    const result = toUTC(dateString);

    expect(result).toContain('T');
    expect(result).toContain('Z');
  });

  it('should ignore timezone parameter (uses browser default)', () => {
    const date = new Date('2025-01-15T10:30:00');
    const result1 = toUTC(date);
    const result2 = toUTC(date, 'America/New_York');

    expect(result1).toBe(result2);
  });
});

describe('fromUTC', () => {
  it('should convert UTC ISO string to Date', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result = fromUTC(utcString);

    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-01-15T10:30:00.000Z');
  });

  it('should ignore timezone parameter', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result1 = fromUTC(utcString);
    const result2 = fromUTC(utcString, 'America/Los_Angeles');

    expect(result1.getTime()).toBe(result2.getTime());
  });
});

describe('formatInLocalTimezone', () => {
  it('should format UTC string with default format', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result = formatInLocalTimezone(utcString);

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should format UTC string with custom format', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result = formatInLocalTimezone(utcString, 'yyyy-MM-dd');

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should format with time format', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result = formatInLocalTimezone(utcString, 'h:mm a');

    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });
});

describe('toDateTimeLocalValue', () => {
  it('should convert UTC ISO to datetime-local format', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result = toDateTimeLocalValue(utcString);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('should return empty string for empty input', () => {
    const result = toDateTimeLocalValue('');

    expect(result).toBe('');
  });

  it('should ignore timezone parameter', () => {
    const utcString = '2025-01-15T10:30:00Z';
    const result1 = toDateTimeLocalValue(utcString);
    const result2 = toDateTimeLocalValue(utcString, 'America/New_York');

    expect(result1).toBe(result2);
  });
});

describe('fromDateTimeLocalValue', () => {
  it('should convert datetime-local format to UTC ISO', () => {
    const localValue = '2025-01-15T10:30';
    const result = fromDateTimeLocalValue(localValue);

    expect(result).toContain('T');
    expect(result).toContain('Z');
  });

  it('should return empty string for empty input', () => {
    const result = fromDateTimeLocalValue('');

    expect(result).toBe('');
  });

  it('should handle datetime-local values correctly', () => {
    const localValue = '2025-12-25T14:30';
    const result = fromDateTimeLocalValue(localValue);

    const parsedDate = new Date(result);
    expect(parsedDate).toBeInstanceOf(Date);
    expect(parsedDate.toISOString()).toBe(result);
  });
});

describe('isValidDate', () => {
  it('should return true for valid date string', () => {
    expect(isValidDate('2025-01-15T10:30:00Z')).toBe(true);
    expect(isValidDate('2025-01-15')).toBe(true);
  });

  it('should return false for invalid date string', () => {
    expect(isValidDate('invalid-date')).toBe(false);
    expect(isValidDate('2025-13-45')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidDate('')).toBe(false);
  });

  it('should return false for non-date strings', () => {
    expect(isValidDate('hello world')).toBe(false);
    // Note: '12345' is actually parsed as a valid date by JavaScript (milliseconds since epoch)
    // So we test with a clearly invalid string instead
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('getTimezoneAbbreviation', () => {
  it('should return timezone abbreviation', () => {
    const abbr = getTimezoneAbbreviation();

    expect(abbr).toBeTruthy();
    expect(typeof abbr).toBe('string');
  });

  it('should return abbreviation for specific timezone', () => {
    const abbr = getTimezoneAbbreviation('America/New_York');

    expect(abbr).toBeTruthy();
    expect(typeof abbr).toBe('string');
  });
});

describe('getTimezoneOffset', () => {
  it('should return timezone offset in hours', () => {
    const offset = getTimezoneOffset();

    expect(typeof offset).toBe('number');
    expect(Number.isInteger(offset)).toBe(true);
  });

  it('should return offset for specific timezone', () => {
    const offset = getTimezoneOffset('America/New_York');

    expect(typeof offset).toBe('number');
    expect(Number.isInteger(offset)).toBe(true);
  });
});

describe('FORMATS', () => {
  it('should export format constants', () => {
    expect(FORMATS.DATE_SHORT).toBe('MMM d');
    expect(FORMATS.DATE_MEDIUM).toBe('MMM d, yyyy');
    expect(FORMATS.TIME_12H).toBe('h:mm a');
    expect(FORMATS.TIME_24H).toBe('HH:mm');
    expect(FORMATS.DATETIME_SHORT).toBe('MMM d, h:mm a');
  });
});

describe('formatEventTime', () => {
  it('should format single event time', () => {
    const startTime = '2025-01-15T10:30:00Z';
    const result = formatEventTime(startTime);

    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it('should format event time range', () => {
    const startTime = '2025-01-15T10:30:00Z';
    const endTime = '2025-01-15T12:00:00Z';
    const result = formatEventTime(startTime, endTime);

    expect(result).toContain('-');
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)/);
  });

  it('should format time consistently', () => {
    const startTime = '2025-01-15T10:30:00Z';
    const result = formatEventTime(startTime);

    // Just verify it returns a valid time format
    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });
});

describe('formatEventDateTime', () => {
  it('should format event date and time', () => {
    const startTime = '2025-01-15T10:30:00Z';
    const result = formatEventDateTime(startTime);

    expect(result).toContain('at');
    expect(result).toMatch(/\w+ \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)/);
  });

  it('should format event date and time range', () => {
    const startTime = '2025-01-15T10:30:00Z';
    const endTime = '2025-01-15T12:00:00Z';
    const result = formatEventDateTime(startTime, endTime);

    expect(result).toContain('at');
    expect(result).toContain('-');
  });
});
