import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tasksService } from '@/lib/services/tasks-service';
import type { Task } from '@/lib/types';

// Mock Supabase client using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(),
    rpc: vi.fn(),
  };

  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/services/enhanced-notification-service', () => ({
  enhancedNotificationService: {
    sendTaskAssignmentNotification: vi.fn(),
  },
}));

vi.mock('@/lib/cache', () => ({
  cacheAside: vi.fn((key, fn) => fn()),
  cacheKeys: {
    taskStats: vi.fn(() => 'task-stats-key'),
  },
  CACHE_TTL: {
    SHORT: 60,
  },
}));

describe('tasks-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch all tasks for a space', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          space_id: 'space-123',
          title: 'Test Task',
          priority: 'high',
          status: 'pending',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockTasks,
          error: null,
        }),
      });

      const result = await tasksService.getTasks('space-123');

      expect(result).toEqual(mockTasks);
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should apply status filter', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqSpy,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await tasksService.getTasks('space-123', { status: 'completed' });

      expect(eqSpy).toHaveBeenCalledWith('status', 'completed');
    });

    it('should apply priority filter', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqSpy,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await tasksService.getTasks('space-123', { priority: 'urgent' });

      expect(eqSpy).toHaveBeenCalledWith('priority', 'urgent');
    });

    it('should apply search filter', async () => {
      const orSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: orSpy,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await tasksService.getTasks('space-123', { search: 'test query' });

      expect(orSpy).toHaveBeenCalled();
    });

    it('should apply sorting', async () => {
      const orderSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: orderSpy,
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await tasksService.getTasks('space-123', { sort: 'due_date', order: 'asc' });

      expect(orderSpy).toHaveBeenCalledWith('due_date', { ascending: true });
    });

    it('should enforce maximum limit for security', async () => {
      const limitSpy = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: limitSpy,
      });

      await tasksService.getTasks('space-123', { limit: 10000 });

      // Should cap at DEFAULT_MAX_LIMIT (500)
      expect(limitSpy).toHaveBeenCalledWith(500);
    });

    it('should throw error on database failure', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      await expect(tasksService.getTasks('space-123')).rejects.toThrow('Failed to fetch tasks');
    });
  });

  describe('getTaskById', () => {
    it('should fetch a single task by ID', async () => {
      const mockTask: Task = {
        id: 'task-1',
        space_id: 'space-123',
        title: 'Test Task',
        priority: 'high',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTask,
          error: null,
        }),
      });

      const result = await tasksService.getTaskById('task-1');

      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      const result = await tasksService.getTaskById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'OTHER_ERROR', message: 'Database error' },
        }),
      });

      await expect(tasksService.getTaskById('task-1')).rejects.toThrow('Failed to fetch task');
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const newTask = {
        space_id: 'space-123',
        title: 'New Task',
        priority: 'medium' as const,
        status: 'pending' as const,
        created_by: 'user-123',
      };

      const createdTask: Task = {
        ...newTask,
        id: 'task-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createdTask,
          error: null,
        }),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await tasksService.createTask(newTask);

      expect(result).toEqual(createdTask);
    });

    it('should throw error on creation failure', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      });

      await expect(
        tasksService.createTask({
          space_id: 'space-123',
          title: 'New Task',
          priority: 'medium',
          status: 'pending',
          created_by: 'user-123',
        })
      ).rejects.toThrow('Failed to create task');
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updates = { status: 'completed' as const };
      const updatedTask: Task = {
        id: 'task-1',
        space_id: 'space-123',
        title: 'Test Task',
        priority: 'high',
        status: 'completed',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        completed_at: '2025-01-02T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedTask,
          error: null,
        }),
      });

      const result = await tasksService.updateTask('task-1', updates);

      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeTruthy();
    });

    it('should set completed_at when marking as completed', async () => {
      const updateSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        update: updateSpy,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'task-1',
            status: 'completed',
            completed_at: expect.any(String),
          },
          error: null,
        }),
      });

      await tasksService.updateTask('task-1', { status: 'completed' });

      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall.completed_at).toBeTruthy();
    });

    it('should clear completed_at when changing from completed', async () => {
      const updateSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        update: updateSpy,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'task-1',
            status: 'pending',
            completed_at: null,
          },
          error: null,
        }),
      });

      await tasksService.updateTask('task-1', { status: 'pending' });

      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall.completed_at).toBeNull();
    });

    it('should throw error on update failure', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      await expect(
        tasksService.updateTask('task-1', { status: 'completed' })
      ).rejects.toThrow('Failed to update task');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      await expect(tasksService.deleteTask('task-1')).resolves.not.toThrow();
    });

    it('should throw error on deletion failure', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Delete failed' },
        }),
      });

      await expect(tasksService.deleteTask('task-1')).rejects.toThrow('Failed to delete task');
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      const mockStats = {
        total: 100,
        completed: 50,
        inProgress: 20,
        pending: 25,
        blocked: 3,
        onHold: 2,
        byPriority: {
          low: 30,
          medium: 40,
          high: 25,
          urgent: 5,
        },
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await tasksService.getTaskStats('space-123');

      expect(result).toEqual(mockStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_task_stats', { p_space_id: 'space-123' });
    });

    it('should return default stats on error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      await expect(tasksService.getTaskStats('space-123')).rejects.toThrow('Failed to get task stats');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      const mockOverdueTasks: Task[] = [
        {
          id: 'task-1',
          space_id: 'space-123',
          title: 'Overdue Task',
          priority: 'high',
          status: 'pending',
          due_date: '2024-12-01',
          created_at: '2024-11-01T00:00:00Z',
          updated_at: '2024-11-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockOverdueTasks,
          error: null,
        }),
      });

      const result = await tasksService.getOverdueTasks('space-123');

      expect(result).toEqual(mockOverdueTasks);
    });
  });

  describe('subscribeToTasks', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel);

      const callback = vi.fn();
      tasksService.subscribeToTasks('space-123', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('tasks:space-123');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });
});
