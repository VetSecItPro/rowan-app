/**
 * Tests for AI Tool Executor (lib/services/ai/tool-executor.ts)
 * Verifies security enforcement, service routing, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeTool,
  getToolCallPreview,
  type ToolExecutionContext,
} from '@/lib/services/ai/tool-executor';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/tasks-service', () => ({
  tasksService: {
    createTask: vi.fn().mockResolvedValue({ id: 'task-1', title: 'Test Task' }),
    updateTask: vi.fn().mockResolvedValue(undefined),
    getTasks: vi.fn().mockResolvedValue([
      { id: 'task-1', title: 'Test Task', status: 'pending', priority: 'medium', due_date: null, assigned_to: null },
    ]),
  },
}));

vi.mock('@/lib/services/chores-service', () => ({
  choresService: {
    createChore: vi.fn().mockResolvedValue({ id: 'chore-1', title: 'Test Chore', frequency: 'weekly', assigned_to: null }),
    updateChore: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    createEvent: vi.fn().mockResolvedValue({ id: 'event-1', title: 'Test Event', start_time: '2026-02-10T10:00:00Z' }),
    updateEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/reminders-service', () => ({
  remindersService: {
    createReminder: vi.fn().mockResolvedValue({ id: 'reminder-1', title: 'Test Reminder' }),
    updateReminder: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    createList: vi.fn().mockResolvedValue({ id: 'list-1', title: 'Groceries' }),
    createItem: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Milk' }),
  },
}));

vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    createMeal: vi.fn().mockResolvedValue({ id: 'meal-1', meal_type: 'dinner', name: 'Pasta', scheduled_date: '2026-02-10' }),
  },
}));

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    createGoal: vi.fn().mockResolvedValue({ id: 'goal-1', title: 'Save Money' }),
    updateGoal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    createExpense: vi.fn().mockResolvedValue({ id: 'expense-1', title: 'Groceries', amount: 50 }),
  },
}));

vi.mock('@/lib/services/projects-service', () => ({
  projectsOnlyService: {
    createProject: vi.fn().mockResolvedValue({ id: 'project-1', name: 'Kitchen Remodel' }),
  },
}));

vi.mock('@/lib/services/messages-service', () => ({
  messagesService: {
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
  },
}));

vi.mock('@/lib/services/rewards/rewards-service', () => ({
  rewardsService: {
    getRewards: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/rewards/points-service', () => ({
  pointsService: {
    getUserPoints: vi.fn().mockResolvedValue({ total_points: 100 }),
  },
}));

vi.mock('@/lib/services/bills-service', () => ({
  billsService: {
    getBills: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/task-subtasks-service', () => ({
  taskSubtasksService: {
    createSubtask: vi.fn().mockResolvedValue({ id: 'subtask-1' }),
  },
}));

vi.mock('@/lib/services/project-milestones-service', () => ({
  projectMilestonesService: {
    createMilestone: vi.fn().mockResolvedValue({ id: 'milestone-1' }),
  },
}));

vi.mock('@/lib/services/spending-insights-service', () => ({
  getCategorySpending: vi.fn().mockResolvedValue([]),
  getSpendingInsights: vi.fn().mockResolvedValue({}),
  getBudgetVariances: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/task-comments-service', () => ({
  taskCommentsService: {
    addComment: vi.fn().mockResolvedValue({ id: 'comment-1' }),
  },
}));

vi.mock('@/lib/services/chore-rotation-service', () => ({
  choreRotationService: {
    getRotation: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/goals/goal-service', () => ({
  goalService: {
    getGoals: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/goals/checkin-service', () => ({
  checkinService: {
    createCheckIn: vi.fn().mockResolvedValue({ id: 'checkin-1' }),
  },
}));

vi.mock('@/lib/services/project-tracking-service', () => ({
  getProjectLineItems: vi.fn().mockResolvedValue([]),
  createLineItem: vi.fn().mockResolvedValue({ id: 'line-1' }),
  updateLineItem: vi.fn().mockResolvedValue(undefined),
  deleteLineItem: vi.fn().mockResolvedValue(undefined),
  markLineItemPaid: vi.fn().mockResolvedValue(undefined),
  getVendors: vi.fn().mockResolvedValue([]),
  createVendor: vi.fn().mockResolvedValue({ id: 'vendor-1' }),
  updateVendor: vi.fn().mockResolvedValue(undefined),
  deleteVendor: vi.fn().mockResolvedValue(undefined),
  getProjectStats: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/services/recurring-expenses-service', () => ({
  getRecurringPatterns: vi.fn().mockResolvedValue([]),
  confirmPattern: vi.fn().mockResolvedValue(undefined),
  ignorePattern: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/expense-splitting-service', () => ({
  getPartnershipBalance: vi.fn().mockResolvedValue({ balance: 0 }),
  createSettlement: vi.fn().mockResolvedValue({ id: 'settlement-1' }),
}));

vi.mock('@/lib/services/rewards/late-penalty-service', () => ({
  getUserPenalties: vi.fn().mockResolvedValue([]),
  forgivePenalty: vi.fn().mockResolvedValue(undefined),
  getSpacePenaltySettings: vi.fn().mockResolvedValue({}),
  updateSpacePenaltySettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/validations/task-schemas', () => ({
  createTaskSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/chore-schemas', () => ({
  createChoreSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/calendar-event-schemas', () => ({
  createCalendarEventSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/reminder-schemas', () => ({
  createReminderSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/shopping-schemas', () => ({
  createShoppingItemSchema: {
    parse: vi.fn((data) => data),
  },
  createShoppingListSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/meal-schemas', () => ({
  createMealSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/goal-schemas', () => ({
  createGoalSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/expense-schemas', () => ({
  createExpenseSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/validations/project-schemas', () => ({
  createProjectSchema: {
    parse: vi.fn((data) => data),
  },
}));

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

const context: ToolExecutionContext = {
  spaceId: SPACE_ID,
  userId: USER_ID,
  supabase: {} as ToolExecutionContext['supabase'],
};

describe('executeTool()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('security: space_id always from context', () => {
    it('should inject spaceId from context, not from AI params for create_task', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');

      await executeTool(
        'create_task',
        {
          title: 'Hack the system',
          space_id: 'attacker-space-id', // AI tries to inject this
        },
        context
      );

      const callArg = vi.mocked(tasksService.createTask).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg?.space_id).toBe(SPACE_ID);
      expect(callArg?.space_id).not.toBe('attacker-space-id');
    });

    it('should inject userId from context, not from AI params', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');

      await executeTool(
        'create_task',
        {
          title: 'Test Task',
          created_by: 'attacker-user-id', // AI tries to inject this
        },
        context
      );

      const callArg = vi.mocked(tasksService.createTask).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg?.created_by).toBe(USER_ID);
    });
  });

  describe('create_task', () => {
    it('should call tasksService.createTask and return success', async () => {
      const result = await executeTool('create_task', { title: 'Buy groceries' }, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Created task');
      expect(result.data?.id).toBe('task-1');
      expect(result.featureType).toBe('task');
    });
  });

  describe('complete_task', () => {
    it('should call tasksService.updateTask with status=completed', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      const result = await executeTool('complete_task', { task_id: 'task-abc' }, context);

      expect(result.success).toBe(true);
      expect(vi.mocked(tasksService.updateTask)).toHaveBeenCalledWith(
        'task-abc',
        { status: 'completed' },
        context.supabase
      );
    });

    it('should return failure when task_id is missing', async () => {
      const result = await executeTool('complete_task', {}, context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Task ID');
    });
  });

  describe('list_tasks', () => {
    it('should call tasksService.getTasks and return task list', async () => {
      const result = await executeTool('list_tasks', {}, context);

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('task');
    });
  });

  describe('create_event', () => {
    it('should call calendarService.createEvent and return success', async () => {
      const { calendarService } = await import('@/lib/services/calendar-service');

      const result = await executeTool(
        'create_event',
        { title: 'Team meeting', start_time: '2026-02-25T10:00:00Z' },
        context
      );

      expect(result.success).toBe(true);
      expect(vi.mocked(calendarService.createEvent)).toHaveBeenCalled();
    });
  });

  describe('unknown tool', () => {
    it('should return failure for unknown tool name', async () => {
      const result = await executeTool('non_existent_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return failure when service throws, without leaking stack trace', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      vi.mocked(tasksService.createTask).mockRejectedValueOnce(new Error('DB connection failed'));

      const result = await executeTool('create_task', { title: 'Test' }, context);

      expect(result.success).toBe(false);
      expect(result.message).not.toContain('DB connection failed');
      expect(result.message).not.toContain('stack');
    });
  });
});

describe('getToolCallPreview()', () => {
  it('should return a readable preview for create_task', () => {
    const preview = getToolCallPreview('create_task', { title: 'Buy milk' });

    expect(typeof preview).toBe('string');
    expect(preview.length).toBeGreaterThan(0);
  });

  it('should return a readable preview for complete_task', () => {
    const preview = getToolCallPreview('complete_task', { task_id: 'abc' });

    expect(typeof preview).toBe('string');
  });

  it('should return a readable preview for unknown tools', () => {
    const preview = getToolCallPreview('unknown_tool', { foo: 'bar' });

    expect(typeof preview).toBe('string');
  });

  it('should return a string even with empty params', () => {
    const preview = getToolCallPreview('list_tasks', {});

    expect(typeof preview).toBe('string');
  });
});
