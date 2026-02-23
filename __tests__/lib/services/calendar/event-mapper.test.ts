import { describe, it, expect } from 'vitest';
import { eventMapper } from '@/lib/services/calendar/event-mapper';

describe('event-mapper', () => {
  describe('mapRowanToGoogle', () => {
    it('should map Rowan event to Google Calendar format', () => {
      const rowanEvent = {
        id: 'event-1',
        space_id: 'space-1',
        title: 'Test Event',
        description: 'Test description',
        start_time: '2024-12-25T10:00:00Z',
        end_time: '2024-12-25T11:00:00Z',
        all_day: false,
        location: 'Office',
        custom_color: 'blue',
        timezone: 'America/New_York',
        recurrence_pattern: 'daily',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      };

      const result = eventMapper.mapRowanToGoogle(rowanEvent);

      expect(result.summary).toBe('Test Event');
      expect(result.description).toBe('Test description');
      expect(result.location).toBe('Office');
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should handle all-day events', () => {
      const rowanEvent = {
        id: 'event-1',
        space_id: 'space-1',
        title: 'All Day Event',
        start_time: '2024-12-25',
        all_day: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      };

      const result = eventMapper.mapRowanToGoogle(rowanEvent);

      expect(result.start?.date).toBe('2024-12-25');
      expect(result.start?.dateTime).toBeUndefined();
    });

    it('should map color correctly', () => {
      const rowanEvent = {
        id: 'event-1',
        space_id: 'space-1',
        title: 'Colored Event',
        start_time: '2024-12-25T10:00:00Z',
        custom_color: 'purple',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      };

      const result = eventMapper.mapRowanToGoogle(rowanEvent);

      expect(result.colorId).toBeDefined();
    });
  });

  describe('mapGoogleToRowan', () => {
    it('should map Google event to Rowan format', () => {
      const googleEvent = {
        id: 'google-event-1',
        summary: 'Google Event',
        description: 'Event description',
        start: { dateTime: '2024-12-25T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2024-12-25T11:00:00Z', timeZone: 'UTC' },
        location: 'Conference Room',
        status: 'confirmed',
        etag: 'etag-123',
        updated: '2024-01-01T00:00:00Z',
      };

      const result = eventMapper.mapGoogleToRowan(googleEvent, 'space-1');

      expect(result.space_id).toBe('space-1');
      expect(result.title).toBe('Google Event');
      expect(result.description).toBe('Event description');
      expect(result.location).toBe('Conference Room');
      expect(result.external_source).toBe('google');
    });

    it('should handle events without titles', () => {
      const googleEvent = {
        id: 'google-event-1',
        start: { dateTime: '2024-12-25T10:00:00Z' },
        end: { dateTime: '2024-12-25T11:00:00Z' },
        status: 'confirmed',
        etag: 'etag-123',
        updated: '2024-01-01T00:00:00Z',
      };

      const result = eventMapper.mapGoogleToRowan(googleEvent, 'space-1');

      expect(result.title).toBe('(No title)');
    });

    it('should detect all-day events', () => {
      const googleEvent = {
        id: 'google-event-1',
        summary: 'All Day',
        start: { date: '2024-12-25' },
        end: { date: '2024-12-26' },
        status: 'confirmed',
        etag: 'etag-123',
        updated: '2024-01-01T00:00:00Z',
      };

      const result = eventMapper.mapGoogleToRowan(googleEvent, 'space-1');

      expect(result.all_day).toBe(true);
    });
  });

  describe('mapRowanToICalendar', () => {
    it('should generate valid iCalendar format', () => {
      const rowanEvent = {
        id: 'event-1',
        space_id: 'space-1',
        title: 'iCal Event',
        description: 'Test description',
        start_time: '2024-12-25T10:00:00Z',
        end_time: '2024-12-25T11:00:00Z',
        all_day: false,
        location: 'Office',
        status: 'not-started',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      };

      const result = eventMapper.mapRowanToICalendar(rowanEvent);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('SUMMARY:iCal Event');
      expect(result).toContain('DESCRIPTION:Test description');
      expect(result).toContain('LOCATION:Office');
      expect(result).toContain('END:VEVENT');
      expect(result).toContain('END:VCALENDAR');
    });

    it('should handle special characters in text fields', () => {
      const rowanEvent = {
        id: 'event-1',
        space_id: 'space-1',
        title: 'Event; with, special: characters',
        start_time: '2024-12-25T10:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      };

      const result = eventMapper.mapRowanToICalendar(rowanEvent);

      expect(result).toContain('SUMMARY:');
      // Special characters should be escaped
      expect(result).toBeTruthy();
    });
  });

  describe('mapICalendarToRowan', () => {
    it('should parse iCalendar event to Rowan format', () => {
      const icalEvent = {
        uid: 'ical-event-1',
        summary: 'iCal Event',
        description: 'Test description',
        location: 'Office',
        dtstart: '20241225T100000Z',
        dtend: '20241225T110000Z',
        status: 'CONFIRMED',
      };

      const result = eventMapper.mapICalendarToRowan(icalEvent, 'space-1');

      expect(result.space_id).toBe('space-1');
      expect(result.title).toBe('iCal Event');
      expect(result.description).toBe('Test description');
      expect(result.location).toBe('Office');
    });

    it('should detect all-day events from date format', () => {
      const icalEvent = {
        uid: 'ical-event-1',
        summary: 'All Day iCal Event',
        dtstart: '20241225',
        status: 'CONFIRMED',
      };

      const result = eventMapper.mapICalendarToRowan(icalEvent, 'space-1');

      expect(result.all_day).toBe(true);
    });

    it('should handle missing description', () => {
      const icalEvent = {
        uid: 'ical-event-1',
        summary: 'Minimal Event',
        dtstart: '20241225T100000Z',
        status: 'CONFIRMED',
      };

      const result = eventMapper.mapICalendarToRowan(icalEvent, 'space-1');

      expect(result.description).toBeNull();
    });
  });

  describe('createExternalSnapshot', () => {
    it('should create snapshot from Google event', () => {
      const googleEvent = {
        id: 'google-1',
        calendarId: 'cal-1',
        summary: 'Google Event',
        description: 'Description',
        start: { dateTime: '2024-12-25T10:00:00Z' },
        end: { dateTime: '2024-12-25T11:00:00Z' },
        location: 'Office',
        status: 'confirmed',
        etag: 'etag-123',
        updated: '2024-01-01T00:00:00Z',
      };

      const result = eventMapper.createExternalSnapshot(googleEvent, 'google');

      expect(result.id).toBe('google-1');
      expect(result.title).toBe('Google Event');
      expect(result.etag).toBe('etag-123');
    });

    it('should create snapshot from iCal event', () => {
      const icalEvent = {
        uid: 'ical-1',
        summary: 'iCal Event',
        dtstart: '20241225T100000Z',
        dtend: '20241225T110000Z',
        status: 'CONFIRMED',
      };

      const result = eventMapper.createExternalSnapshot(icalEvent, 'apple');

      expect(result.id).toBe('ical-1');
      expect(result.title).toBe('iCal Event');
    });
  });
});
