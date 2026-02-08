/**
 * Calendar Native Bridge
 *
 * Syncs Rowan events with device calendar (iOS Calendar, Google Calendar).
 * Falls back gracefully when running in web browser.
 */

import { isNative } from './capacitor';

// Types from the plugin
type CalendarPlugin = typeof import('@ebarooni/capacitor-calendar').CapacitorCalendar;

// Dynamic import to avoid bundling issues on web
let CapacitorCalendar: CalendarPlugin | null = null;

async function getCalendarPlugin(): Promise<CalendarPlugin | null> {
  if (!isNative) return null;

  if (!CapacitorCalendar) {
    const module = await import('@ebarooni/capacitor-calendar');
    CapacitorCalendar = module.CapacitorCalendar;
  }
  return CapacitorCalendar;
}

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  isAllDay?: boolean;
}

export interface CalendarPermissionStatus {
  granted: boolean;
  canRequest: boolean;
}

/**
 * Check if calendar access is available on this platform
 */
export function isCalendarAvailable(): boolean {
  return isNative;
}

/**
 * Request calendar permissions
 */
export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  const plugin = await getCalendarPlugin();
  if (!plugin) {
    return { granted: false, canRequest: false };
  }

  try {
    const result = await plugin.requestFullCalendarAccess();
    return {
      granted: result.result === 'granted',
      canRequest: true,
    };
  } catch {
    return { granted: false, canRequest: false };
  }
}

/**
 * Check current calendar permission status
 */
export async function checkCalendarPermission(): Promise<CalendarPermissionStatus> {
  const plugin = await getCalendarPlugin();
  if (!plugin) {
    return { granted: false, canRequest: false };
  }

  try {
    const { result } = await plugin.checkAllPermissions();
    const writeAccess = result.writeCalendar;
    return {
      granted: writeAccess === 'granted',
      canRequest: writeAccess === 'prompt' || writeAccess === 'prompt-with-rationale',
    };
  } catch {
    return { granted: false, canRequest: false };
  }
}

/**
 * Add an event to the device calendar
 */
export async function addEventToCalendar(event: CalendarEvent): Promise<string | null> {
  const plugin = await getCalendarPlugin();
  if (!plugin) {
    return null;
  }

  try {
    const result = await plugin.createEvent({
      title: event.title,
      startDate: event.startDate.getTime(),
      endDate: event.endDate.getTime(),
      location: event.location,
      description: event.notes,
      isAllDay: event.isAllDay,
    });

    return result.id;
  } catch (error) {
    console.error('Failed to add calendar event:', error);
    return null;
  }
}

/**
 * Delete an event from the device calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const plugin = await getCalendarPlugin();
  if (!plugin) return false;

  try {
    await plugin.deleteEvent({ id: eventId });
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

/**
 * Get available calendars on the device
 */
export async function getDeviceCalendars(): Promise<Array<{ id: string; title: string }>> {
  const plugin = await getCalendarPlugin();
  if (!plugin) return [];

  try {
    const { result } = await plugin.listCalendars();
    return result.map((cal) => ({
      id: cal.id,
      title: cal.title,
    }));
  } catch (error) {
    console.error('Failed to list calendars:', error);
    return [];
  }
}

/**
 * Open the device calendar app
 */
export async function openDeviceCalendar(): Promise<void> {
  const plugin = await getCalendarPlugin();
  if (!plugin) {
    // Fallback: open Google Calendar in browser
    window.open('https://calendar.google.com', '_blank');
    return;
  }

  try {
    await plugin.openCalendar({ date: Date.now() });
  } catch {
    // Fallback
    window.open('https://calendar.google.com', '_blank');
  }
}
