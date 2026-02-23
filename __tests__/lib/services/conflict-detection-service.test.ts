import { describe, it, expect } from 'vitest';
import { conflictDetectionService } from '@/lib/services/conflict-detection-service';
import type { CalendarEvent } from '@/lib/services/calendar-service';

// ── helpers ───────────────────────────────────────────────────────────────────
function makeEvent(overrides: Partial<CalendarEvent> & { id: string; start_time: string }): CalendarEvent {
  return {
    title: 'Test Event',
    space_id: 'space-1',
    created_by: 'user-1',
    status: 'scheduled',
    end_time: null,
    location: undefined,
    category: undefined,
    ...overrides,
  } as CalendarEvent;
}

/**
 * Build a local-time ISO string for the given date with hour/minute set.
 * This ensures the event's date matches the test date regardless of timezone.
 */
function localISO(date: Date, hours: number, minutes = 0): string {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

describe('conflict-detection-service', () => {
  // ── doEventsOverlap ─────────────────────────────────────────────────────────
  describe('doEventsOverlap', () => {
    it('returns true when events overlap in time', () => {
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:30:00Z' });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z' });

      expect(conflictDetectionService.doEventsOverlap(e1, e2)).toBe(true);
    });

    it('returns false when events do not overlap', () => {
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T09:00:00Z', end_time: '2026-01-01T10:00:00Z' });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z' });

      expect(conflictDetectionService.doEventsOverlap(e1, e2)).toBe(false);
    });

    it('uses 60-minute default duration when end_time is null', () => {
      // e1 runs from 10:00 to 11:00 (default), e2 starts at 10:30 - should overlap
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', end_time: null });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T10:30:00Z', end_time: '2026-01-01T11:30:00Z' });

      expect(conflictDetectionService.doEventsOverlap(e1, e2)).toBe(true);
    });
  });

  // ── getTimeBetweenEvents ────────────────────────────────────────────────────
  describe('getTimeBetweenEvents', () => {
    it('returns positive minutes gap between sequential events', () => {
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:00:00Z' });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T11:30:00Z', end_time: '2026-01-01T12:00:00Z' });

      expect(conflictDetectionService.getTimeBetweenEvents(e1, e2)).toBe(30);
    });

    it('returns negative value when events overlap', () => {
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:30:00Z' });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z' });

      expect(conflictDetectionService.getTimeBetweenEvents(e1, e2)).toBe(-30);
    });
  });

  // ── estimateTravelTime ──────────────────────────────────────────────────────
  describe('estimateTravelTime', () => {
    it('returns 0 when no locations provided', () => {
      expect(conflictDetectionService.estimateTravelTime()).toBe(0);
    });

    it('returns 0 when same location', () => {
      expect(conflictDetectionService.estimateTravelTime('Office', 'Office')).toBe(0);
    });

    it('returns 30 for different locations', () => {
      expect(conflictDetectionService.estimateTravelTime('Office', 'Home')).toBe(30);
    });
  });

  // ── checkEventConflicts ─────────────────────────────────────────────────────
  describe('checkEventConflicts', () => {
    it('detects overlap conflicts', () => {
      const target = makeEvent({ id: 'target', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:30:00Z', title: 'Meeting' });
      const other = makeEvent({ id: 'other', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z', title: 'Lunch' });

      const result = conflictDetectionService.checkEventConflicts(target, [target, other]);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts[0].type).toBe('overlap');
      expect(result.conflicts[0].severity).toBe('high');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('returns no conflicts when events do not overlap', () => {
      const target = makeEvent({ id: 'target', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:00:00Z' });
      const other = makeEvent({ id: 'other', start_time: '2026-01-01T13:00:00Z', end_time: '2026-01-01T14:00:00Z' });

      const result = conflictDetectionService.checkEventConflicts(target, [target, other]);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('excludes completed events from conflict checks', () => {
      const target = makeEvent({ id: 'target', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:30:00Z' });
      const completed = makeEvent({ id: 'done', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z', status: 'completed' });

      const result = conflictDetectionService.checkEventConflicts(target, [target, completed]);

      expect(result.hasConflicts).toBe(false);
    });
  });

  // ── findAllConflicts ────────────────────────────────────────────────────────
  describe('findAllConflicts', () => {
    it('returns a map with conflicts for overlapping events', () => {
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:30:00Z' });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z' });

      const result = conflictDetectionService.findAllConflicts([e1, e2]);

      expect(result.has('e1')).toBe(true);
      expect(result.has('e2')).toBe(true);
    });

    it('returns empty map when no conflicts', () => {
      const e1 = makeEvent({ id: 'e1', start_time: '2026-01-01T09:00:00Z', end_time: '2026-01-01T10:00:00Z' });
      const e2 = makeEvent({ id: 'e2', start_time: '2026-01-01T11:00:00Z', end_time: '2026-01-01T12:00:00Z' });

      const result = conflictDetectionService.findAllConflicts([e1, e2]);

      expect(result.size).toBe(0);
    });
  });

  // ── getConflictColorClasses ─────────────────────────────────────────────────
  describe('getConflictColorClasses', () => {
    it('returns red classes for high severity', () => {
      const classes = conflictDetectionService.getConflictColorClasses('high');

      expect(classes.border).toContain('red');
      expect(classes.bg).toContain('red');
    });

    it('returns orange classes for medium severity', () => {
      const classes = conflictDetectionService.getConflictColorClasses('medium');

      expect(classes.border).toContain('orange');
    });

    it('returns yellow classes for low severity', () => {
      const classes = conflictDetectionService.getConflictColorClasses('low');

      expect(classes.border).toContain('yellow');
    });
  });

  // ── getSuggestedBufferTime ──────────────────────────────────────────────────
  describe('getSuggestedBufferTime', () => {
    it('returns 15 minutes for work events', () => {
      const event = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', category: 'work' });

      expect(conflictDetectionService.getSuggestedBufferTime(event)).toBe(15);
    });

    it('returns 30 minutes for health events', () => {
      const event = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', category: 'health' });

      expect(conflictDetectionService.getSuggestedBufferTime(event)).toBe(30);
    });

    it('returns 30 minutes for events with location', () => {
      const event = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z', location: 'Downtown' });

      expect(conflictDetectionService.getSuggestedBufferTime(event)).toBe(30);
    });

    it('returns 10 minutes default', () => {
      const event = makeEvent({ id: 'e1', start_time: '2026-01-01T10:00:00Z' });

      expect(conflictDetectionService.getSuggestedBufferTime(event)).toBe(10);
    });
  });

  // ── findAvailableSlots ──────────────────────────────────────────────────────
  // NOTE: findAvailableSlots uses local time (9am-5pm). Events must match the
  // local date of the `date` parameter to be included. We use localISO() to
  // build timezone-safe event times.
  describe('findAvailableSlots', () => {
    it('returns slots array (may be empty or non-empty depending on events)', () => {
      // Test that the function returns an array without throwing
      const date = new Date(2026, 0, 15); // Jan 15 2026, local time
      const e1 = makeEvent({
        id: 'e1',
        start_time: localISO(date, 11),
        end_time: localISO(date, 12),
      });

      const slots = conflictDetectionService.findAvailableSlots([e1], date, 60);

      expect(Array.isArray(slots)).toBe(true);
    });

    it('finds gap before event that starts after 10am local', () => {
      const date = new Date(2026, 0, 15); // Jan 15 2026, local time
      // Event from 14:00-16:00 local - leaves gap from 9-14 and 16-17
      const e1 = makeEvent({
        id: 'e1',
        start_time: localISO(date, 14),
        end_time: localISO(date, 16),
      });

      const slots = conflictDetectionService.findAvailableSlots([e1], date, 60);

      // Should find at least one 60+ minute gap (9am-2pm = 300 minutes)
      expect(slots.length).toBeGreaterThan(0);
    });

    it('returns empty array when minDuration exceeds available gaps', () => {
      const date = new Date(2026, 0, 15);
      // Two events that together eat most of the 9-17 window, leaving only small gaps
      const e1 = makeEvent({ id: 'e1', start_time: localISO(date, 9), end_time: localISO(date, 12, 30) });
      const e2 = makeEvent({ id: 'e2', start_time: localISO(date, 13), end_time: localISO(date, 17) });

      // Gap is 12:30-13:00 = 30 min; requiring 60 min should yield empty
      const slots = conflictDetectionService.findAvailableSlots([e1, e2], date, 60);

      expect(slots).toHaveLength(0);
    });
  });
});
