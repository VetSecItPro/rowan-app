/**
 * Seed First-Day Content Service
 *
 * On first signup completion (i.e. when a brand-new space is provisioned for
 * an owner), seeds a tiny amount of starter content so the dashboard is not
 * a blank canvas:
 *   - 1 calendar event ("Welcome to Rowan ...") tomorrow at 9am
 *   - 1 task ("Try the AI assistant") due today
 *   - 1 monthly goal ("Get organized this month") with 3 milestones
 *
 * The whole flow is best-effort — failures are logged and swallowed so they
 * never block signup / space creation. Invited partners join an existing
 * (already-populated) space via a different code path and never reach this
 * function, so the "do not seed for invitees" requirement is satisfied
 * structurally.
 *
 * Idempotency: a `seeded_first_day_at` ISO timestamp is written to
 * `spaces.settings`. If that flag is already set, this function is a no-op.
 *
 * Disable for tests: set `process.env.DISABLE_SEED_FIRST_DAY = '1'`.
 *
 * @module seed-first-day-service
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { calendarService } from '@/lib/services/calendar-service';
import { tasksService } from '@/lib/services/tasks-service';
import { goalService } from '@/lib/services/goals';
import { logger } from '@/lib/logger';

export interface SeedFirstDayContentInput {
  userId: string;
  spaceId: string;
  /** User display name; first name will be used for greeting if provided. */
  userName?: string | null;
}

export interface SeedFirstDayContentResult {
  seeded: boolean;
  reason?: 'already_seeded' | 'disabled' | 'partial' | 'error';
  itemsCreated?: { eventId?: string; taskId?: string; goalId?: string; milestoneIds?: string[] };
}

function tomorrowAt9am(): { start: string; end: string } {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayDateOnly(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function firstName(userName?: string | null): string {
  if (!userName) return 'there';
  const trimmed = userName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

/**
 * Seed initial first-day content for a brand-new space owner.
 * Non-blocking: caller should not await-and-throw on failure.
 * Idempotent: re-running is a no-op once `seeded_first_day_at` is set.
 */
export async function seedFirstDayContent(
  input: SeedFirstDayContentInput,
  supabaseClient?: SupabaseClient
): Promise<SeedFirstDayContentResult> {
  // Honour test-environment opt-out.
  if (process.env.DISABLE_SEED_FIRST_DAY === '1') {
    return { seeded: false, reason: 'disabled' };
  }

  const supabase = supabaseClient ?? createClient();
  const { userId, spaceId } = input;
  const name = firstName(input.userName);

  // Idempotency: read current settings, bail if already seeded.
  // We must not double-seed if createSpace ever runs twice for the same space.
  try {
    // nosemgrep: supabase-missing-space-id-filter — `spaces` IS the tenant root table; filter is .eq('id', spaceId) which is the space identity itself
    const { data: spaceRow, error: spaceErr } = await supabase
      .from('spaces')
      .select('settings')
      .eq('id', spaceId)
      .single();

    if (spaceErr) {
      logger.warn('seedFirstDayContent: failed to read space settings (continuing best-effort)', {
        component: 'seed-first-day-service',
        action: 'idempotency_check',
        details: { spaceId, error: spaceErr.message },
      });
    } else {
      const settings = (spaceRow?.settings ?? {}) as Record<string, unknown>;
      if (settings.seeded_first_day_at) {
        return { seeded: false, reason: 'already_seeded' };
      }
    }
  } catch (err) {
    logger.warn('seedFirstDayContent: idempotency check threw (continuing)', {
      component: 'seed-first-day-service',
      action: 'idempotency_check',
      details: { spaceId, error: err instanceof Error ? err.message : String(err) },
    });
  }

  const created: NonNullable<SeedFirstDayContentResult['itemsCreated']> = {};
  let anyFailure = false;

  // 1. Welcome calendar event — tomorrow 9am, 30min.
  try {
    const { start, end } = tomorrowAt9am();
    const event = await calendarService.createEvent(
      {
        space_id: spaceId,
        title: `Welcome to Rowan, ${name}!`,
        description:
          'This is your space. Tap to edit or delete. Tomorrow morning is a good time to plan your week.',
        start_time: start,
        end_time: end,
        event_type: 'reminder',
        category: 'family',
      },
      supabase
    );
    created.eventId = event?.id;
  } catch (err) {
    anyFailure = true;
    logger.warn('seedFirstDayContent: welcome event failed', {
      component: 'seed-first-day-service',
      action: 'seed_event',
      details: { spaceId, error: err instanceof Error ? err.message : String(err) },
    });
  }

  // 2. Starter task — "Try the AI assistant", due today.
  try {
    const task = await tasksService.createTask(
      {
        space_id: spaceId,
        title: 'Try the AI assistant',
        description:
          'Click the chat icon (bottom-right) and ask Rowan to add a task, plan a meal, or set a goal.',
        status: 'pending',
        priority: 'medium',
        due_date: todayDateOnly(),
        created_by: userId,
        calendar_sync: false,
        assigned_to: null,
        category: null,
        quick_note: null,
        tags: null,
      },
      supabase
    );
    created.taskId = task?.id;
  } catch (err) {
    anyFailure = true;
    logger.warn('seedFirstDayContent: starter task failed', {
      component: 'seed-first-day-service',
      action: 'seed_task',
      details: { spaceId, error: err instanceof Error ? err.message : String(err) },
    });
  }

  // 3. Starter goal + 3 milestones — "Get organized this month".
  // goalService.createGoal calls auth.getUser() on the passed client; the
  // server client carries the same authed user context so this works.
  try {
    const goal = await goalService.createGoal(
      {
        space_id: spaceId,
        title: 'Get organized this month',
        description:
          'A starter goal so you can see how Rowan tracks progress. Edit or delete anytime.',
        category: 'monthly',
        status: 'active',
        progress: 0,
        visibility: 'shared',
      },
      supabase
    );
    created.goalId = goal?.id;

    if (goal?.id) {
      const milestoneTitles = [
        'Add 5 tasks',
        'Set up first recurring chore',
        'Plan one week of meals',
      ];
      // Direct insert (milestoneService.createMilestone does not accept a
      // server client; we already have the authed server client in scope and
      // RLS enforces space membership).
      const rows = milestoneTitles.map((title) => ({
        goal_id: goal.id,
        title,
        type: 'count' as const,
        target_value: 1,
        current_value: 0,
        completed: false,
      }));
      // nosemgrep: supabase-missing-space-id-filter — goal_milestones is space-scoped via FK to goals.id (RLS on goal_milestones requires the parent goal to belong to a space the user is in)
      const { data: milestones, error: msErr } = await supabase
        .from('goal_milestones')
        .insert(rows)
        .select('id');
      if (msErr) throw msErr;
      created.milestoneIds = (milestones ?? []).map((m: { id: string }) => m.id);
    }
  } catch (err) {
    anyFailure = true;
    logger.warn('seedFirstDayContent: starter goal failed', {
      component: 'seed-first-day-service',
      action: 'seed_goal',
      details: { spaceId, error: err instanceof Error ? err.message : String(err) },
    });
  }

  // Persist idempotency flag + provenance on the space, so a future
  // "remove all seeded content" Settings action can clean these up by ID.
  try {
    // nosemgrep: supabase-missing-space-id-filter — re-read of `spaces` settings before update; `spaces` IS the tenant root, filter is .eq('id', spaceId)
    const { data: currentRow } = await supabase
      .from('spaces')
      .select('settings')
      .eq('id', spaceId)
      .single();
    const currentSettings = ((currentRow?.settings ?? {}) as Record<string, unknown>) || {};
    const newSettings = {
      ...currentSettings,
      seeded_first_day_at: new Date().toISOString(),
      seeded_first_day_items: created,
      seeded_first_day_for_user: userId,
    };
    // nosemgrep: supabase-missing-space-id-filter — updating `spaces` by id is the canonical pattern for the tenant root; RLS enforces user is owner/member
    const { error: updErr } = await supabase
      .from('spaces')
      .update({ settings: newSettings })
      .eq('id', spaceId);
    if (updErr) {
      logger.warn('seedFirstDayContent: failed to persist seeded flag', {
        component: 'seed-first-day-service',
        action: 'persist_flag',
        details: { spaceId, error: updErr.message },
      });
    }
  } catch (err) {
    logger.warn('seedFirstDayContent: persist flag threw', {
      component: 'seed-first-day-service',
      action: 'persist_flag',
      details: { spaceId, error: err instanceof Error ? err.message : String(err) },
    });
  }

  return {
    seeded: !anyFailure,
    reason: anyFailure ? 'partial' : undefined,
    itemsCreated: created,
  };
}
