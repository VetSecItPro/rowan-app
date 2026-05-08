import type { CreateTaskInput } from '@/lib/validations/task-schemas';
import type { Task } from '@/lib/types';

export interface UsageLimitDetails {
  currentUsage: number;
  limit: number;
  remaining: number;
  upgradeUrl: string;
}

export class UsageLimitError extends Error {
  readonly details: UsageLimitDetails;

  constructor(details: UsageLimitDetails) {
    super('Daily task creation limit reached');
    this.name = 'UsageLimitError';
    this.details = details;
  }
}

/**
 * Client-side task creation that goes through the rate-limited API gate.
 *
 * Why this exists: tasksService.createTask hits Supabase directly from the
 * browser and bypasses /api/tasks's rate-limit gate. UI callers must use this
 * helper so free-tier daily limits are enforced uniformly across the app.
 */
export async function createTaskViaApi(input: CreateTaskInput): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as Partial<UsageLimitDetails>;
    throw new UsageLimitError({
      currentUsage: body.currentUsage ?? 0,
      limit: body.limit ?? 0,
      remaining: body.remaining ?? 0,
      upgradeUrl: body.upgradeUrl ?? '/pricing',
    });
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.message ?? body.error ?? `Task create failed: ${res.status}`);
  }

  const json = (await res.json()) as { success: boolean; data: Task };
  return json.data;
}
