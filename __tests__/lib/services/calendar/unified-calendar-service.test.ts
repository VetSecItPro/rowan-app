import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockCalendarService,
  mockTasksService,
  mockMealsService,
  mockRemindersService,
  mockGoalsService,
} = vi.hoisted(() => {
  const mockCalendarService = { getEventsWithRecurring: vi.fn(async () => []) };
  const mockTasksService = { getTasks: vi.fn(async () => []) };
  const mockMealsService = { getMeals: vi.fn(async () => []) };
  const mockRemindersService = { getReminders: vi.fn(async () => []) };
  const mockGoalsService = { getGoals: vi.fn(async () => []) };

  return {
    mockCalendarService,
    mockTasksService,
    mockMealsService,
    mockRemindersService,
    mockGoalsService,
  };
});

vi.mock('@/lib/services/calendar-service', () => ({ calendarService: mockCalendarService }));
vi.mock('@/lib/services/tasks-service', () => ({ tasksService: mockTasksService }));
vi.mock('@/lib/services/meals-service', () => ({ mealsService: mockMealsService }));
vi.mock('@/lib/services/reminders-service', () => ({ remindersService: mockRemindersService }));
vi.mock('@/lib/services/goals-service', () => ({ goalsService: mockGoalsService }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { unifiedCalendarService } from '@/lib/services/calendar/unified-calendar-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
// START_DATE is set one day before the meal's scheduled_date so that timezone
// offsets do not push the mapped local-noon meal time outside the range.
// mapMeal() does: new Date('2026-02-22') [UTC midnight] then setHours(12,0,0,0)
// [local noon]. In UTC+14 that produces 2026-02-21T22:00Z, which is still
// within this range but would be outside if START_DATE were 2026-02-22T00:00Z.
const START_DATE = new Date('2026-02-21T00:00:00Z');
const END_DATE = new Date('2026-02-28T23:59:59Z');
const SPACE_ID = 'space-123';

function makeCalendarEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    space_id: SPACE_ID,
    title: 'Team Meeting',
    start_time: '2026-02-22T10:00:00.000Z',
    end_time: '2026-02-22T11:00:00.000Z',
    all_day: false,
    is_recurring: false,
    status: 'not-started',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMeal() {
  return {
    id: 'meal-1',
    space_id: SPACE_ID,
    meal_type: 'lunch',
    name: 'Salad',
    notes: null,
    scheduled_date: '2026-02-22',
    recipe_id: null,
    recipe: null,
    assigned_to: null,
    assignee: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// getUnifiedItems
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.getUnifiedItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns combined items from all sources', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([makeCalendarEvent()]);
    mockTasksService.getTasks.mockResolvedValueOnce([]);
    mockMealsService.getMeals.mockResolvedValueOnce([makeMeal()]);
    mockRemindersService.getReminders.mockResolvedValueOnce([]);
    mockGoalsService.getGoals.mockResolvedValueOnce([]);

    const result = await unifiedCalendarService.getUnifiedItems({
      spaceId: SPACE_ID,
      startDate: START_DATE,
      endDate: END_DATE,
    });

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.counts.event).toBeGreaterThanOrEqual(1);
  });

  it('returns sorted items by start time', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([
      makeCalendarEvent({ id: 'evt-late', start_time: '2026-02-22T14:00:00Z' }),
      makeCalendarEvent({ id: 'evt-early', start_time: '2026-02-22T08:00:00Z' }),
    ]);

    const result = await unifiedCalendarService.getUnifiedItems({
      spaceId: SPACE_ID,
      startDate: START_DATE,
      endDate: END_DATE,
    });

    expect(result.items[0].startTime).toBe('2026-02-22T08:00:00Z');
    expect(result.items[1].startTime).toBe('2026-02-22T14:00:00Z');
  });

  it('includes correct type counts', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([makeCalendarEvent()]);
    mockTasksService.getTasks.mockResolvedValueOnce([]);
    mockMealsService.getMeals.mockResolvedValueOnce([]);
    mockRemindersService.getReminders.mockResolvedValueOnce([]);
    mockGoalsService.getGoals.mockResolvedValueOnce([]);

    const result = await unifiedCalendarService.getUnifiedItems({
      spaceId: SPACE_ID,
      startDate: START_DATE,
      endDate: END_DATE,
    });

    expect(result.counts.event).toBe(1);
    expect(result.counts.task).toBe(0);
    expect(result.counts.meal).toBe(0);
  });

  it('skips disabled item types', async () => {
    const result = await unifiedCalendarService.getUnifiedItems({
      spaceId: SPACE_ID,
      startDate: START_DATE,
      endDate: END_DATE,
      filters: {
        showEvents: false,
        showTasks: false,
        showMeals: false,
        showReminders: false,
        showGoals: false,
      },
    });

    expect(result.items).toHaveLength(0);
    expect(mockCalendarService.getEventsWithRecurring).not.toHaveBeenCalled();
  });

  it('collects errors from failing sources without throwing', async () => {
    mockCalendarService.getEventsWithRecurring.mockRejectedValueOnce(new Error('Calendar API down'));
    mockTasksService.getTasks.mockResolvedValueOnce([]);
    mockMealsService.getMeals.mockResolvedValueOnce([]);
    mockRemindersService.getReminders.mockResolvedValueOnce([]);
    mockGoalsService.getGoals.mockResolvedValueOnce([]);

    const result = await unifiedCalendarService.getUnifiedItems({
      spaceId: SPACE_ID,
      startDate: START_DATE,
      endDate: END_DATE,
    });

    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toMatch(/calendar events/i);
  });
});

// ---------------------------------------------------------------------------
// fetchEvents
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.fetchEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped events from calendarService', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([makeCalendarEvent()]);

    const items = await unifiedCalendarService.fetchEvents(SPACE_ID, START_DATE, END_DATE);

    expect(items).toHaveLength(1);
    expect(items[0].itemType).toBe('event');
  });

  it('throws when calendarService throws', async () => {
    mockCalendarService.getEventsWithRecurring.mockRejectedValueOnce(new Error('network error'));

    await expect(
      unifiedCalendarService.fetchEvents(SPACE_ID, START_DATE, END_DATE)
    ).rejects.toThrow('network error');
  });
});

// ---------------------------------------------------------------------------
// fetchTasks
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.fetchTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns tasks filtered to the date range', async () => {
    mockTasksService.getTasks.mockResolvedValueOnce([
      {
        id: 'task-in-range',
        title: 'Task in range',
        due_date: '2026-02-23T10:00:00Z',
        status: 'pending',
        space_id: SPACE_ID,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const items = await unifiedCalendarService.fetchTasks(SPACE_ID, START_DATE, END_DATE, false);

    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('excludes completed tasks when includeCompleted=false', async () => {
    await unifiedCalendarService.fetchTasks(SPACE_ID, START_DATE, END_DATE, false);

    expect(mockTasksService.getTasks).toHaveBeenCalledWith(
      SPACE_ID,
      expect.objectContaining({ status: expect.arrayContaining(['pending']) })
    );
  });

  it('includes all tasks when includeCompleted=true', async () => {
    mockTasksService.getTasks.mockResolvedValueOnce([]);

    await unifiedCalendarService.fetchTasks(SPACE_ID, START_DATE, END_DATE, true);

    expect(mockTasksService.getTasks).toHaveBeenCalledWith(
      SPACE_ID,
      expect.objectContaining({ status: undefined })
    );
  });
});

// ---------------------------------------------------------------------------
// fetchMeals
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.fetchMeals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns meals filtered to date range', async () => {
    mockMealsService.getMeals.mockResolvedValueOnce([makeMeal()]);

    const items = await unifiedCalendarService.fetchMeals(SPACE_ID, START_DATE, END_DATE);

    expect(mockMealsService.getMeals).toHaveBeenCalledWith(SPACE_ID);
    // Meal scheduled_date '2026-02-22' maps to local noon on that date.
    // START_DATE begins 2026-02-21 to accommodate all UTC offsets.
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// fetchReminders
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.fetchReminders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped reminders in date range', async () => {
    mockRemindersService.getReminders.mockResolvedValueOnce([
      {
        id: 'rem-1',
        title: 'Take medication',
        reminder_time: '2026-02-22T09:00:00Z',
        status: 'active',
        space_id: SPACE_ID,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const items = await unifiedCalendarService.fetchReminders(SPACE_ID, START_DATE, END_DATE, false);

    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].itemType).toBe('reminder');
  });

  it('filters out completed reminders when includeCompleted=false', async () => {
    mockRemindersService.getReminders.mockResolvedValueOnce([
      {
        id: 'rem-done',
        title: 'Done reminder',
        reminder_time: '2026-02-22T09:00:00Z',
        status: 'completed',
        space_id: SPACE_ID,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const items = await unifiedCalendarService.fetchReminders(SPACE_ID, START_DATE, END_DATE, false);

    expect(items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// fetchGoals
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.fetchGoals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped goals with target dates in range', async () => {
    mockGoalsService.getGoals.mockResolvedValueOnce([
      {
        id: 'goal-1',
        title: 'Run a 5K',
        target_date: '2026-02-25',
        status: 'active',
        space_id: SPACE_ID,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const items = await unifiedCalendarService.fetchGoals(SPACE_ID, START_DATE, END_DATE, false);

    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].itemType).toBe('goal');
  });

  it('filters out completed/cancelled goals when includeCompleted=false', async () => {
    mockGoalsService.getGoals.mockResolvedValueOnce([
      {
        id: 'goal-done',
        title: 'Old goal',
        target_date: '2026-02-25',
        status: 'completed',
        space_id: SPACE_ID,
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const items = await unifiedCalendarService.fetchGoals(SPACE_ID, START_DATE, END_DATE, false);

    expect(items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getItemsForDate
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.getItemsForDate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only items for the specified date', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([
      makeCalendarEvent({ start_time: '2026-02-22T10:00:00Z' }),
    ]);
    mockTasksService.getTasks.mockResolvedValueOnce([]);
    mockMealsService.getMeals.mockResolvedValueOnce([]);
    mockRemindersService.getReminders.mockResolvedValueOnce([]);
    mockGoalsService.getGoals.mockResolvedValueOnce([]);

    const items = await unifiedCalendarService.getItemsForDate(
      SPACE_ID,
      new Date('2026-02-22T00:00:00Z')
    );

    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// getUpcomingItems
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.getUpcomingItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches items for daysAhead days', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([]);
    mockTasksService.getTasks.mockResolvedValueOnce([]);
    mockMealsService.getMeals.mockResolvedValueOnce([]);
    mockRemindersService.getReminders.mockResolvedValueOnce([]);
    mockGoalsService.getGoals.mockResolvedValueOnce([]);

    const items = await unifiedCalendarService.getUpcomingItems(SPACE_ID, 7);

    expect(Array.isArray(items)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getMonthItemCounts
// ---------------------------------------------------------------------------
describe('unifiedCalendarService.getMonthItemCounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a Map of date keys to counts', async () => {
    mockCalendarService.getEventsWithRecurring.mockResolvedValueOnce([
      makeCalendarEvent({ start_time: '2026-02-22T10:00:00Z' }),
    ]);
    mockTasksService.getTasks.mockResolvedValueOnce([]);
    mockMealsService.getMeals.mockResolvedValueOnce([]);
    mockRemindersService.getReminders.mockResolvedValueOnce([]);
    mockGoalsService.getGoals.mockResolvedValueOnce([]);

    const counts = await unifiedCalendarService.getMonthItemCounts(SPACE_ID, 2026, 1); // month 1 = February

    expect(counts instanceof Map).toBe(true);
    expect(counts.get('2026-02-22')).toBeGreaterThanOrEqual(1);
  });
});
