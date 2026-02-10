import * as chrono from 'chrono-node';
import { addHours } from 'date-fns';
import { escapeRegExp } from '@/lib/utils/input-sanitization';

export interface ParsedEvent {
  title: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in minutes
  location?: string;
  category?: 'work' | 'personal' | 'family' | 'health' | 'social';
  isRecurring?: boolean;
  recurrencePattern?: string;
}

/**
 * Parse natural language text into event details
 * Examples:
 * - "Dinner tomorrow at 7pm"
 * - "Doctor appointment next Tuesday at 2pm for 1 hour"
 * - "Weekly team meeting every Monday at 10am"
 * - "Anniversary dinner this Saturday at 6:30pm at The Steakhouse"
 */
export function parseEventText(input: string): ParsedEvent {
  const result: ParsedEvent = { title: input };

  // Extract dates/times using chrono
  const parsed = chrono.parse(input);

  if (parsed.length > 0) {
    const firstParse = parsed[0];
    result.startTime = firstParse.start.date();

    if (firstParse.end) {
      result.endTime = firstParse.end.date();
    }

    // Remove date/time text from title
    result.title = input.replace(firstParse.text, '').trim();
  }

  // Extract location (pattern: "at [Location]")
  const locationMatch = input.match(/\s+at\s+([A-Z][a-zA-Z\s&']+?)(?:\s+(?:on|at|for|every|tomorrow|today|next|this|@|$))/i);
  if (locationMatch && locationMatch[1]) {
    result.location = locationMatch[1].trim();
    // Remove location from title (escape regex special chars to prevent ReDoS)
    result.title = result.title.replace(new RegExp(`\\s+at\\s+${escapeRegExp(locationMatch[1])}`, 'i'), '').trim();
  }

  // Extract duration (pattern: "for X hours/minutes")
  const durationMatch = input.match(/for\s+(\d+)\s+(hour|minute|hr|min)s?/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    result.duration = (unit.startsWith('h')) ? value * 60 : value;

    // If we have start time but no end time, calculate end time from duration
    if (result.startTime && !result.endTime && result.duration) {
      result.endTime = addHours(result.startTime, result.duration / 60);
    }

    // Remove duration from title
    result.title = result.title.replace(/for\s+\d+\s+(?:hour|minute|hr|min)s?/i, '').trim();
  }

  // Detect recurring patterns
  const recurringKeywords = ['every', 'weekly', 'daily', 'monthly', 'annually'];
  const hasRecurring = recurringKeywords.some(kw => input.toLowerCase().includes(kw));

  if (hasRecurring) {
    result.isRecurring = true;

    // Detect pattern type
    if (input.toLowerCase().includes('daily')) {
      result.recurrencePattern = 'daily';
    } else if (input.toLowerCase().includes('weekly') || input.toLowerCase().includes('every week')) {
      result.recurrencePattern = 'weekly';
    } else if (input.toLowerCase().includes('monthly') || input.toLowerCase().includes('every month')) {
      result.recurrencePattern = 'monthly';
    } else if (input.toLowerCase().includes('every monday')) {
      result.recurrencePattern = 'weekly';
    } else if (input.toLowerCase().includes('every')) {
      result.recurrencePattern = 'weekly'; // Default for "every X"
    }

    // Remove recurring keywords from title
    result.title = result.title.replace(/\b(every|weekly|daily|monthly|annually)\b/gi, '').trim();
  }

  // Predict category from keywords
  result.category = predictCategory(result.title);

  // If we have start time but no end time and no duration, add default 1 hour
  if (result.startTime && !result.endTime && !result.duration) {
    result.endTime = addHours(result.startTime, 1);
    result.duration = 60;
  }

  // Clean up title - remove extra spaces, "with", "to", etc.
  result.title = result.title
    .replace(/\s+with\s+$/i, '')
    .replace(/\s+to\s+$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Capitalize first letter
  if (result.title) {
    result.title = result.title.charAt(0).toUpperCase() + result.title.slice(1);
  }

  return result;
}

/**
 * Predict event category based on title keywords
 */
function predictCategory(title: string): 'work' | 'personal' | 'family' | 'health' | 'social' {
  const titleLower = title.toLowerCase();

  const keywords = {
    work: ['meeting', 'standup', 'review', 'presentation', 'call', 'conference', 'deadline', 'project', 'client', 'interview', 'training'],
    health: ['doctor', 'dentist', 'gym', 'workout', 'therapy', 'appointment', 'checkup', 'physical', 'exercise', 'yoga'],
    family: ['dinner', 'family', 'kids', 'school', 'parent', 'anniversary', 'birthday', 'reunion', 'visit'],
    social: ['party', 'birthday', 'wedding', 'hangout', 'drinks', 'concert', 'movie', 'game', 'brunch', 'lunch']
  };

  for (const [category, terms] of Object.entries(keywords)) {
    if (terms.some(term => titleLower.includes(term))) {
      return category as 'work' | 'health' | 'family' | 'social';
    }
  }

  return 'personal'; // Default category
}

/**
 * Get suggestions for common event patterns
 */
export function getEventSuggestions(): string[] {
  return [
    'Dinner tomorrow at 7pm',
    'Doctor appointment next Tuesday at 2pm',
    'Weekly team meeting every Monday at 10am',
    'Coffee with Sarah tomorrow at 3pm',
    'Gym session today at 6am for 1 hour',
    'Date night Friday at 7:30pm at Olive Garden',
    'Birthday party this Saturday at 2pm',
    'Dentist next Wednesday at 9am',
  ];
}

/**
 * Validate parsed event has minimum required fields
 */
export function isValidParsedEvent(parsed: ParsedEvent): boolean {
  return !!(parsed.title && parsed.title.length > 0);
}
