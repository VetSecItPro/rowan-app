import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTaskViaApi, UsageLimitError } from '@/lib/api/tasks-client';
import type { CreateTaskInput } from '@/lib/validations/task-schemas';

const baseInput: CreateTaskInput = {
  space_id: 'space-1',
  title: 'Test task',
  created_by: 'user-1',
  status: 'pending',
  priority: 'medium',
  description: null,
  assigned_to: null,
  due_date: null,
  category: null,
  quick_note: null,
  tags: null,
  calendar_sync: false,
};

describe('createTaskViaApi', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns task on 200', async () => {
    const task = { id: 't-1', title: 'Test task', space_id: 'space-1' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: task }),
    });

    const result = await createTaskViaApi(baseInput);
    expect(result).toEqual(task);
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
  });

  it('throws UsageLimitError on 429 with details', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Daily task creation limit reached',
        currentUsage: 10,
        limit: 10,
        remaining: 0,
        upgradeUrl: '/pricing',
      }),
    });

    await expect(createTaskViaApi(baseInput)).rejects.toBeInstanceOf(UsageLimitError);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        currentUsage: 10,
        limit: 10,
        remaining: 0,
        upgradeUrl: '/pricing',
      }),
    });

    try {
      await createTaskViaApi(baseInput);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UsageLimitError);
      expect((err as UsageLimitError).details).toEqual({
        currentUsage: 10,
        limit: 10,
        remaining: 0,
        upgradeUrl: '/pricing',
      });
    }
  });

  it('falls back to defaults when 429 body is malformed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => {
        throw new Error('not json');
      },
    });

    try {
      await createTaskViaApi(baseInput);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UsageLimitError);
      expect((err as UsageLimitError).details.upgradeUrl).toBe('/pricing');
    }
  });

  it('throws generic Error on 401', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(createTaskViaApi(baseInput)).rejects.toThrow('Unauthorized');
  });

  it('throws generic Error on 500', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error', message: 'DB unreachable' }),
    });

    await expect(createTaskViaApi(baseInput)).rejects.toThrow('DB unreachable');
  });

  it('uses status code in message when body has no error/message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({}),
    });

    await expect(createTaskViaApi(baseInput)).rejects.toThrow('Task create failed: 502');
  });
});
