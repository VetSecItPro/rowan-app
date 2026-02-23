import { describe, it, expect } from 'vitest';
import { unifiedCalendarMapper } from '@/lib/services/calendar/unified-calendar-mapper';

// ---------------------------------------------------------------------------
// Minimal fixture factories
// ---------------------------------------------------------------------------
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    space_id: 'space-1',
    title: 'Team Meeting',
    description: 'Weekly sync',
    start_time: '2026-02-22T10:00:00.000Z',
    end_time: '2026-02-22T11:00:00.000Z',
    location: 'Room A',
    category: 'work',
    status: 'not-started' as const,
    assigned_to: 'user-1',
    created_by: 'user-2',
    is_recurring: false,
    custom_color: '#ff0000',
    event_type: 'meeting',
    recurrence_pattern: null,
    timezone: 'UTC',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    all_day: false,
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    space_id: 'space-1',
    title: 'Buy groceries',
    description: 'Milk, eggs, bread',
    due_date: '2026-02-22T14:00:00.000Z',
    status: 'pending' as const,
    priority: 'high' as const,
    category: 'personal',
    assigned_to: 'user-1',
    created_by: 'user-1',
    is_recurring: false,
    estimated_hours: 1,
    tags: ['shopping'],
    quick_note: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'meal-1',
    space_id: 'space-1',
    meal_type: 'dinner' as const,
    name: 'Spaghetti',
    notes: 'Family favourite',
    scheduled_date: '2026-02-22',
    recipe_id: 'recipe-1',
    recipe: null,
    assigned_to: 'user-1',
    assignee: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reminder-1',
    space_id: 'space-1',
    title: 'Pick up dry cleaning',
    description: null,
    reminder_time: '2026-02-22T09:00:00.000Z',
    status: 'active' as const,
    priority: 'medium' as const,
    category: 'personal',
    location: null,
    assigned_to: 'user-1',
    created_by: 'user-1',
    emoji: '👔',
    reminder_type: 'one-time',
    repeat_pattern: null,
    repeat_days: null,
    snooze_until: null,
    completed_at: null,
    assignee: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: 'goal-1',
    space_id: 'space-1',
    title: 'Run a 5K',
    description: 'Train for 5K race',
    category: 'health',
    status: 'active' as const,
    progress: 30,
    visibility: 'shared' as const,
    priority: 'p2' as const,
    is_pinned: false,
    target_date: '2026-03-15',
    assigned_to: 'user-1',
    created_by: 'user-1',
    milestones: [],
    assignee: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapEvent
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.mapEvent', () => {
  it('maps CalendarEvent to UnifiedCalendarItem with correct fields', () => {
    const event = makeEvent();
     
    const item = unifiedCalendarMapper.mapEvent(event as any);

    expect(item.id).toBe('event-evt-1');
    expect(item.originalId).toBe('evt-1');
    expect(item.itemType).toBe('event');
    expect(item.title).toBe('Team Meeting');
    expect(item.startTime).toBe('2026-02-22T10:00:00.000Z');
    expect(item.location).toBe('Room A');
    expect(item.originalItem).toBe(event);
  });

  it('preserves metadata fields', () => {
    const event = makeEvent();
     
    const item = unifiedCalendarMapper.mapEvent(event as any);

    expect(item.metadata?.event_type).toBe('meeting');
    expect(item.metadata?.timezone).toBe('UTC');
  });
});

// ---------------------------------------------------------------------------
// mapTask
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.mapTask', () => {
  it('maps task with due_date to UnifiedCalendarItem', () => {
    const task = makeTask();
     
    const item = unifiedCalendarMapper.mapTask(task as any);

    expect(item).not.toBeNull();
    expect(item!.id).toBe('task-task-1');
    expect(item!.itemType).toBe('task');
    expect(item!.title).toBe('Buy groceries');
    expect(item!.priority).toBe('high');
  });

  it('returns null for task without due_date', () => {
    const task = makeTask({ due_date: null });
     
    const item = unifiedCalendarMapper.mapTask(task as any);
    expect(item).toBeNull();
  });

  it('marks task as all-day when due_date has no time component', () => {
    const task = makeTask({ due_date: '2026-02-22T00:00:00' });
     
    const item = unifiedCalendarMapper.mapTask(task as any);
    expect(item!.isAllDay).toBe(true);
  });

  it('marks task as not all-day when due_date has a specific time', () => {
    const task = makeTask({ due_date: '2026-02-22T14:30:00' });
     
    const item = unifiedCalendarMapper.mapTask(task as any);
    expect(item!.isAllDay).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapMeal
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.mapMeal', () => {
  it('maps meal to UnifiedCalendarItem with correct itemType', () => {
    const meal = makeMeal();
     
    const item = unifiedCalendarMapper.mapMeal(meal as any);

    expect(item.id).toBe('meal-meal-1');
    expect(item.itemType).toBe('meal');
    expect(item.title).toBe('Spaghetti');
    expect(item.isAllDay).toBe(false);
  });

  it('generates meal name from meal_type when name not set', () => {
    const meal = makeMeal({ name: null });
     
    const item = unifiedCalendarMapper.mapMeal(meal as any);

    expect(item.title).toMatch(/dinner/i);
  });

  it('sets endTime one hour after startTime', () => {
    const meal = makeMeal();
     
    const item = unifiedCalendarMapper.mapMeal(meal as any);

    const start = new Date(item.startTime).getTime();
    const end = new Date(item.endTime!).getTime();
    expect(end - start).toBe(60 * 60 * 1000); // exactly 1 hour
  });
});

// ---------------------------------------------------------------------------
// mapReminder
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.mapReminder', () => {
  it('maps reminder with reminder_time to UnifiedCalendarItem', () => {
    const reminder = makeReminder();
     
    const item = unifiedCalendarMapper.mapReminder(reminder as any);

    expect(item).not.toBeNull();
    expect(item!.itemType).toBe('reminder');
    expect(item!.title).toBe('Pick up dry cleaning');
    expect(item!.isAllDay).toBe(false);
  });

  it('returns null when reminder has no reminder_time', () => {
    const reminder = makeReminder({ reminder_time: null });
     
    const item = unifiedCalendarMapper.mapReminder(reminder as any);
    expect(item).toBeNull();
  });

  it('sets isRecurring based on repeat_pattern presence', () => {
    const recurringReminder = makeReminder({ repeat_pattern: 'weekly' });
     
    const item = unifiedCalendarMapper.mapReminder(recurringReminder as any);
    expect(item!.isRecurring).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mapGoal
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.mapGoal', () => {
  it('maps goal with target_date to UnifiedCalendarItem', () => {
    const goal = makeGoal();
     
    const item = unifiedCalendarMapper.mapGoal(goal as any);

    expect(item).not.toBeNull();
    expect(item!.itemType).toBe('goal');
    expect(item!.title).toBe('Run a 5K');
    expect(item!.isAllDay).toBe(true);
  });

  it('returns null when goal has no target_date', () => {
    const goal = makeGoal({ target_date: null });
     
    const item = unifiedCalendarMapper.mapGoal(goal as any);
    expect(item).toBeNull();
  });

  it('maps priority p1 to urgent', () => {
    const goal = makeGoal({ priority: 'p1' });
     
    const item = unifiedCalendarMapper.mapGoal(goal as any);
    expect(item!.priority).toBe('urgent');
  });

  it('maps priority p4 to low', () => {
    const goal = makeGoal({ priority: 'p4' });
     
    const item = unifiedCalendarMapper.mapGoal(goal as any);
    expect(item!.priority).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Batch mapping methods
// ---------------------------------------------------------------------------
describe('mapTasks (batch)', () => {
  it('filters out tasks without due dates', () => {
    const tasks = [
      makeTask({ due_date: '2026-02-22T10:00:00Z' }),
      makeTask({ id: 'task-2', due_date: null }),
      makeTask({ id: 'task-3', due_date: '2026-02-23T10:00:00Z' }),
    ];
     
    const items = unifiedCalendarMapper.mapTasks(tasks as any);
    expect(items).toHaveLength(2);
  });
});

describe('mapGoals (batch)', () => {
  it('filters out goals without target_date', () => {
    const goals = [
      makeGoal({ target_date: '2026-03-15' }),
      makeGoal({ id: 'goal-2', target_date: null }),
    ];
     
    const items = unifiedCalendarMapper.mapGoals(goals as any);
    expect(items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// sortByStartTime
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.sortByStartTime', () => {
  it('sorts items in ascending order by default', () => {
    const event1 = makeEvent({ start_time: '2026-02-22T12:00:00Z' });
    const event2 = makeEvent({ id: 'evt-2', start_time: '2026-02-22T08:00:00Z' });
     
    const items = [unifiedCalendarMapper.mapEvent(event1 as any), unifiedCalendarMapper.mapEvent(event2 as any)];
    const sorted = unifiedCalendarMapper.sortByStartTime(items);

    expect(sorted[0].startTime).toBe('2026-02-22T08:00:00Z');
    expect(sorted[1].startTime).toBe('2026-02-22T12:00:00Z');
  });

  it('sorts items in descending order when ascending=false', () => {
    const event1 = makeEvent({ start_time: '2026-02-22T08:00:00Z' });
    const event2 = makeEvent({ id: 'evt-2', start_time: '2026-02-22T12:00:00Z' });
     
    const items = [unifiedCalendarMapper.mapEvent(event1 as any), unifiedCalendarMapper.mapEvent(event2 as any)];
    const sorted = unifiedCalendarMapper.sortByStartTime(items, false);

    expect(sorted[0].startTime).toBe('2026-02-22T12:00:00Z');
  });

  it('does not mutate the original array', () => {
    const event1 = makeEvent({ start_time: '2026-02-22T12:00:00Z' });
    const event2 = makeEvent({ id: 'evt-2', start_time: '2026-02-22T08:00:00Z' });
     
    const items = [unifiedCalendarMapper.mapEvent(event1 as any), unifiedCalendarMapper.mapEvent(event2 as any)];
    const original = [...items];
    unifiedCalendarMapper.sortByStartTime(items);

    expect(items[0].startTime).toBe(original[0].startTime);
  });
});

// ---------------------------------------------------------------------------
// filterByDateRange
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.filterByDateRange', () => {
  it('includes items within the date range', () => {
    const event = makeEvent({ start_time: '2026-02-22T10:00:00Z', end_time: '2026-02-22T11:00:00Z' });
     
    const items = [unifiedCalendarMapper.mapEvent(event as any)];
    const filtered = unifiedCalendarMapper.filterByDateRange(
      items,
      new Date('2026-02-22T00:00:00Z'),
      new Date('2026-02-22T23:59:59Z')
    );

    expect(filtered).toHaveLength(1);
  });

  it('excludes items outside the date range', () => {
    const event = makeEvent({ start_time: '2026-02-25T10:00:00Z', end_time: '2026-02-25T11:00:00Z' });
     
    const items = [unifiedCalendarMapper.mapEvent(event as any)];
    const filtered = unifiedCalendarMapper.filterByDateRange(
      items,
      new Date('2026-02-22T00:00:00Z'),
      new Date('2026-02-22T23:59:59Z')
    );

    expect(filtered).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// groupByDate
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.groupByDate', () => {
  it('groups items by date key', () => {
    const event1 = makeEvent({ start_time: '2026-02-22T10:00:00Z' });
    const event2 = makeEvent({ id: 'evt-2', start_time: '2026-02-22T14:00:00Z' });
    const event3 = makeEvent({ id: 'evt-3', start_time: '2026-02-23T10:00:00Z' });
     
    const items = [event1, event2, event3].map(e => unifiedCalendarMapper.mapEvent(e as any));
    const groups = unifiedCalendarMapper.groupByDate(items);

    expect(groups.size).toBe(2);
    expect(groups.get('2026-02-22')).toHaveLength(2);
    expect(groups.get('2026-02-23')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// countByType
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.countByType', () => {
  it('counts items by their itemType', () => {
    const event = makeEvent();
    const task = makeTask();
     
    const items = [unifiedCalendarMapper.mapEvent(event as any), unifiedCalendarMapper.mapTask(task as any)!];
    const counts = unifiedCalendarMapper.countByType(items);

    expect(counts.event).toBe(1);
    expect(counts.task).toBe(1);
    expect(counts.meal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseItemId
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.parseItemId', () => {
  it('parses event ID correctly', () => {
    const result = unifiedCalendarMapper.parseItemId('event-evt-1');
    expect(result.type).toBe('event');
    expect(result.id).toBe('evt-1');
  });

  it('parses task ID with UUID correctly', () => {
    const result = unifiedCalendarMapper.parseItemId('task-550e8400-e29b-41d4-a716-446655440000');
    expect(result.type).toBe('task');
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

// ---------------------------------------------------------------------------
// isAllDayEvent
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.isAllDayEvent', () => {
  it('returns true when start is midnight local time and duration >= 24 hours', () => {
    // Use strings without the Z suffix so new Date() parses them as local time.
    // This ensures getHours() === 0 regardless of the test runner's timezone.
    const result = unifiedCalendarMapper.isAllDayEvent(
      '2026-02-22T00:00:00',
      '2026-02-23T00:00:00'
    );
    expect(result).toBe(true);
  });

  it('returns false when duration is less than 24 hours', () => {
    const result = unifiedCalendarMapper.isAllDayEvent(
      '2026-02-22T10:00:00.000Z',
      '2026-02-22T11:00:00.000Z'
    );
    expect(result).toBe(false);
  });

  it('returns true when endTime is undefined', () => {
    const result = unifiedCalendarMapper.isAllDayEvent('2026-02-22T10:00:00Z');
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// capitalizeFirst
// ---------------------------------------------------------------------------
describe('unifiedCalendarMapper.capitalizeFirst', () => {
  it('capitalizes the first letter', () => {
    expect(unifiedCalendarMapper.capitalizeFirst('dinner')).toBe('Dinner');
    expect(unifiedCalendarMapper.capitalizeFirst('breakfast')).toBe('Breakfast');
  });

  it('handles empty string gracefully', () => {
    expect(unifiedCalendarMapper.capitalizeFirst('')).toBe('');
  });
});
