import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateTaskInput } from '@/lib/validations/task-schemas';

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

import { createTaskViaApi, UsageLimitError } from '@/lib/api/tasks-client';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

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
  const csrfFetchMock = vi.mocked(csrfFetch);

  beforeEach(() => {
    csrfFetchMock.mockReset();
  });

  it('returns task on 200', async () => {
    const task = { id: 't-1', title: 'Test task', space_id: 'space-1' };
    csrfFetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: task }),
    } as Response);

    const result = await createTaskViaApi(baseInput);
    expect(result).toEqual(task);
    expect(csrfFetchMock).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('throws UsageLimitError on 429 with details', async () => {
    csrfFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Daily task creation limit reached',
        currentUsage: 10,
        limit: 10,
        remaining: 0,
        upgradeUrl: '/pricing',
      }),
    } as Response);

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
    csrfFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => {
        throw new Error('not json');
      },
    } as Response);

    try {
      await createTaskViaApi(baseInput);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UsageLimitError);
      expect((err as UsageLimitError).details.upgradeUrl).toBe('/pricing');
    }
  });

  it('throws generic Error on 401', async () => {
    csrfFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    await expect(createTaskViaApi(baseInput)).rejects.toThrow('Unauthorized');
  });

  it('throws generic Error on 500', async () => {
    csrfFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error', message: 'DB unreachable' }),
    } as Response);

    await expect(createTaskViaApi(baseInput)).rejects.toThrow('DB unreachable');
  });

  it('uses status code in message when body has no error/message', async () => {
    csrfFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({}),
    } as Response);

    await expect(createTaskViaApi(baseInput)).rejects.toThrow('Task create failed: 502');
  });
});
