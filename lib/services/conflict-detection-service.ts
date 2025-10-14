import { CalendarEvent } from './calendar-service';
import { differenceInMinutes, parseISO, addMinutes } from 'date-fns';

export interface EventConflict {
  event1: CalendarEvent;
  event2: CalendarEvent;
  type: 'overlap' | 'travel-time' | 'back-to-back';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: EventConflict[];
  suggestions: string[];
}

/**
 * Detect conflicts between calendar events
 */
export const conflictDetectionService = {
  /**
   * Check if two events overlap in time
   */
  doEventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    const start1 = parseISO(event1.start_time);
    const end1 = event1.end_time ? parseISO(event1.end_time) : addMinutes(start1, 60);
    const start2 = parseISO(event2.start_time);
    const end2 = event2.end_time ? parseISO(event2.end_time) : addMinutes(start2, 60);

    // Events overlap if one starts before the other ends
    return start1 < end2 && start2 < end1;
  },

  /**
   * Calculate time gap between two events (in minutes)
   * Returns negative if events overlap
   */
  getTimeBetweenEvents(event1: CalendarEvent, event2: CalendarEvent): number {
    const end1 = event1.end_time ? parseISO(event1.end_time) : addMinutes(parseISO(event1.start_time), 60);
    const start2 = parseISO(event2.start_time);

    return differenceInMinutes(start2, end1);
  },

  /**
   * Estimate travel time based on locations (simplified)
   * In a real app, this would use a maps API
   */
  estimateTravelTime(location1?: string, location2?: string): number {
    if (!location1 || !location2) return 0;
    if (location1 === location2) return 0;

    // Simple heuristic: different locations = 30 min travel time
    // In production, use Google Maps Distance Matrix API
    return 30;
  },

  /**
   * Check for conflicts with a specific event
   */
  checkEventConflicts(
    targetEvent: CalendarEvent,
    allEvents: CalendarEvent[]
  ): ConflictCheckResult {
    const conflicts: EventConflict[] = [];
    const suggestions: string[] = [];

    // Filter out the target event itself and completed events
    const otherEvents = allEvents.filter(
      e => e.id !== targetEvent.id && e.status !== 'completed'
    );

    for (const otherEvent of otherEvents) {
      // Check for direct time overlap
      if (this.doEventsOverlap(targetEvent, otherEvent)) {
        conflicts.push({
          event1: targetEvent,
          event2: otherEvent,
          type: 'overlap',
          severity: 'high',
          message: `Overlaps with "${otherEvent.title}"`,
        });
        continue; // No need to check travel time if already overlapping
      }

      // Check for travel time conflicts
      const timeBetween = this.getTimeBetweenEvents(otherEvent, targetEvent);
      const travelTime = this.estimateTravelTime(otherEvent.location, targetEvent.location);

      if (timeBetween > 0 && timeBetween < travelTime) {
        conflicts.push({
          event1: otherEvent,
          event2: targetEvent,
          type: 'travel-time',
          severity: 'medium',
          message: `Only ${timeBetween} minutes after "${otherEvent.title}" - may need ${travelTime} minutes to travel`,
        });
      }

      // Check for back-to-back events (helpful warning)
      if (timeBetween >= 0 && timeBetween <= 15) {
        conflicts.push({
          event1: otherEvent,
          event2: targetEvent,
          type: 'back-to-back',
          severity: 'low',
          message: `Scheduled right after "${otherEvent.title}" - consider adding buffer time`,
        });
      }
    }

    // Generate suggestions
    if (conflicts.length > 0) {
      const hasHighSeverity = conflicts.some(c => c.severity === 'high');
      const hasTravelIssues = conflicts.some(c => c.type === 'travel-time');

      if (hasHighSeverity) {
        suggestions.push('Consider rescheduling to avoid overlapping events');
      }

      if (hasTravelIssues) {
        suggestions.push('Add extra time for travel between locations');
      }

      if (conflicts.length > 2) {
        suggestions.push('This time slot seems very busy - consider spreading events throughout the day');
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      suggestions,
    };
  },

  /**
   * Find all conflicts in a list of events
   */
  findAllConflicts(events: CalendarEvent[]): Map<string, EventConflict[]> {
    const conflictMap = new Map<string, EventConflict[]>();

    // Only check non-completed events
    const activeEvents = events.filter(e => e.status !== 'completed');

    for (let i = 0; i < activeEvents.length; i++) {
      for (let j = i + 1; j < activeEvents.length; j++) {
        const event1 = activeEvents[i];
        const event2 = activeEvents[j];

        if (this.doEventsOverlap(event1, event2)) {
          // Add conflict to both events
          const conflict: EventConflict = {
            event1,
            event2,
            type: 'overlap',
            severity: 'high',
            message: 'Time overlap detected',
          };

          if (!conflictMap.has(event1.id)) {
            conflictMap.set(event1.id, []);
          }
          if (!conflictMap.has(event2.id)) {
            conflictMap.set(event2.id, []);
          }

          conflictMap.get(event1.id)!.push(conflict);
          conflictMap.get(event2.id)!.push(conflict);
        }
      }
    }

    return conflictMap;
  },

  /**
   * Get conflict severity color classes
   */
  getConflictColorClasses(severity: 'high' | 'medium' | 'low'): {
    border: string;
    bg: string;
    text: string;
    icon: string;
  } {
    switch (severity) {
      case 'high':
        return {
          border: 'border-red-500 dark:border-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-600 dark:text-red-400',
        };
      case 'medium':
        return {
          border: 'border-orange-500 dark:border-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          text: 'text-orange-700 dark:text-orange-300',
          icon: 'text-orange-600 dark:text-orange-400',
        };
      case 'low':
        return {
          border: 'border-yellow-500 dark:border-yellow-400',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: 'text-yellow-600 dark:text-yellow-400',
        };
    }
  },

  /**
   * Get suggested buffer time based on event types
   */
  getSuggestedBufferTime(event: CalendarEvent): number {
    // Suggest buffer time in minutes
    if (event.category === 'work') return 15; // Meetings need buffer
    if (event.category === 'health') return 30; // Medical appointments need extra time
    if (event.location) return 30; // Events with locations need travel time
    return 10; // Default buffer
  },

  /**
   * Find available time slots (gaps between events)
   */
  findAvailableSlots(
    events: CalendarEvent[],
    date: Date,
    minDuration: number = 60 // minutes
  ): Array<{ start: Date; end: Date }> {
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0); // 9 AM
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0); // 5 PM

    // Get events for this day, sorted by start time
    const dayEvents = events
      .filter(e => {
        const eventDate = parseISO(e.start_time);
        return eventDate.toDateString() === date.toDateString() && e.status !== 'completed';
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

    const availableSlots: Array<{ start: Date; end: Date }> = [];
    let currentTime = dayStart;

    for (const event of dayEvents) {
      const eventStart = parseISO(event.start_time);
      const eventEnd = event.end_time ? parseISO(event.end_time) : addMinutes(eventStart, 60);

      // Check if there's a gap before this event
      const gap = differenceInMinutes(eventStart, currentTime);
      if (gap >= minDuration) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(eventStart),
        });
      }

      // Move current time to after this event
      currentTime = eventEnd > currentTime ? eventEnd : currentTime;
    }

    // Check if there's time left at the end of the day
    const endGap = differenceInMinutes(dayEnd, currentTime);
    if (endGap >= minDuration) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(dayEnd),
      });
    }

    return availableSlots;
  },
};
