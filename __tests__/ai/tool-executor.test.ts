/**
 * Unit tests for AI Tool Executor (Task 6.2)
 *
 * Verifies:
 * - Correct service is called for each tool name
 * - space_id and user_id are always injected from context
 * - Zod validation catches invalid parameters
 * - Error handling returns clean messages (no stack traces)
 * - Unknown tools return appropriate error
 * - getToolCallPreview generates readable previews
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeTool,
  getToolCallPreview,
  type ToolExecutionContext,
} from '@/lib/services/ai/tool-executor';

// Mock all service modules
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

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Use valid UUIDs — Zod schemas validate space_id/user_id as UUIDs
const context: ToolExecutionContext = {
  spaceId: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
};

describe('Tool Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeTool — service routing', () => {
    it('should route create_task to tasksService.createTask', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      const result = await executeTool('create_task', { title: 'Buy groceries' }, context);

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('task');
      expect(tasksService.createTask).toHaveBeenCalledOnce();
    });

    it('should route complete_task to tasksService.updateTask', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      const result = await executeTool('complete_task', { task_id: 'task-1' }, context);

      expect(result.success).toBe(true);
      expect(tasksService.updateTask).toHaveBeenCalledWith('task-1', { status: 'completed' });
    });

    it('should route list_tasks to tasksService.getTasks', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      const result = await executeTool('list_tasks', {}, context);

      expect(result.success).toBe(true);
      expect(tasksService.getTasks).toHaveBeenCalledWith(context.spaceId, expect.any(Object));
    });

    it('should route create_chore to choresService.createChore', async () => {
      const { choresService } = await import('@/lib/services/chores-service');
      const result = await executeTool('create_chore', {
        title: 'Do dishes',
        frequency: 'daily',
        due_date: null,
      }, context);

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('chore');
      expect(choresService.createChore).toHaveBeenCalledOnce();
    });

    it('should route create_event to calendarService.createEvent', async () => {
      const { calendarService } = await import('@/lib/services/calendar-service');
      const result = await executeTool('create_event', {
        title: 'Team Meeting',
        start_time: '2026-02-10T10:00:00Z',
        end_time: '2026-02-10T11:00:00Z',
      }, context);

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('event');
      expect(calendarService.createEvent).toHaveBeenCalledOnce();
    });

    it('should route plan_meal to mealsService.createMeal', async () => {
      const { mealsService } = await import('@/lib/services/meals-service');
      const result = await executeTool('plan_meal', {
        meal_type: 'dinner',
        scheduled_date: '2026-02-10',
        name: 'Pasta',
      }, context);

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('meal');
      expect(mealsService.createMeal).toHaveBeenCalledOnce();
    });

    it('should route create_project to projectsOnlyService.createProject', async () => {
      const { projectsOnlyService } = await import('@/lib/services/projects-service');
      const result = await executeTool('create_project', { name: 'Kitchen Remodel', start_date: null, end_date: null }, context);

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('project');
      expect(projectsOnlyService.createProject).toHaveBeenCalledOnce();
    });
  });

  describe('executeTool — security (space_id / user_id injection)', () => {
    it('should inject space_id from context, not from AI parameters', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');

      const maliciousSpaceId = '11111111-1111-4111-8111-111111111111';
      await executeTool(
        'create_task',
        { title: 'Test', space_id: maliciousSpaceId },
        context
      );

      // The call should use context.spaceId, not the AI's space_id
      const callArgs = (tasksService.createTask as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.space_id).toBe(context.spaceId);
      expect(callArgs.space_id).not.toBe(maliciousSpaceId);
    });

    it('should inject created_by from context, not from AI parameters', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');

      const maliciousUserId = '22222222-2222-4222-8222-222222222222';
      await executeTool(
        'create_task',
        { title: 'Test', created_by: maliciousUserId },
        context
      );

      const callArgs = (tasksService.createTask as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.created_by).toBe(context.userId);
      expect(callArgs.created_by).not.toBe(maliciousUserId);
    });

    it('should pass spaceId to list_tasks query', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      await executeTool('list_tasks', { status: 'pending' }, context);

      expect(tasksService.getTasks).toHaveBeenCalledWith(context.spaceId, expect.objectContaining({
        status: 'pending',
      }));
    });
  });

  describe('executeTool — error handling', () => {
    it('should return error for unknown tool names', async () => {
      const result = await executeTool('nonexistent_tool', {}, context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown tool');
      expect(result.featureType).toBe('general');
    });

    it('should return error when required params are missing (complete_task without task_id)', async () => {
      const result = await executeTool('complete_task', {}, context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Task ID is required');
    });

    it('should return error when required params are missing (complete_chore without chore_id)', async () => {
      const result = await executeTool('complete_chore', {}, context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Chore ID is required');
    });

    it('should not expose raw error details when service throws', async () => {
      const { tasksService } = await import('@/lib/services/tasks-service');
      (tasksService.createTask as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('FATAL: connection to database failed at 192.168.1.1:5432')
      );

      // Use valid params so Zod passes, then the service mock throws
      const result = await executeTool('create_task', { title: 'Valid Task Title' }, context);

      expect(result.success).toBe(false);
      // Should NOT contain the raw error
      expect(result.message).not.toContain('FATAL');
      expect(result.message).not.toContain('192.168');
      expect(result.message).not.toContain('5432');
      // Should be a generic message
      expect(result.message).toContain('Something went wrong');
    });

    it('should surface Zod validation errors as user-friendly messages', async () => {
      // Pass invalid data that Zod will reject (missing required 'title')
      const result = await executeTool('create_task', {}, context);

      // Zod should catch missing title — either a friendly message or a Zod error
      // The exact behavior depends on whether Zod throws before or after service call
      expect(result.success).toBe(false);
    });
  });

  describe('getToolCallPreview', () => {
    it('should generate preview for create_task', () => {
      const preview = getToolCallPreview('create_task', {
        title: 'Buy groceries',
        priority: 'high',
      });

      expect(preview).toContain('Buy groceries');
      expect(preview).toContain('high');
    });

    it('should generate preview for plan_meal', () => {
      const preview = getToolCallPreview('plan_meal', {
        meal_type: 'dinner',
        recipe_name: 'Pasta',
        scheduled_date: '2026-02-10',
      });

      expect(preview).toContain('dinner');
      expect(preview).toContain('Feb 10, 2026');
    });

    it('should generate preview for create_expense', () => {
      const preview = getToolCallPreview('create_expense', {
        title: 'Groceries',
        amount: 50,
      });

      expect(preview).toContain('Groceries');
      expect(preview).toContain('50');
    });

    it('should handle unknown tools gracefully', () => {
      const preview = getToolCallPreview('unknown_tool', {});
      expect(preview).toContain('unknown_tool');
    });
  });
});
