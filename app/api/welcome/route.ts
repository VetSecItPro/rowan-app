import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import DOMPurify from 'isomorphic-dompurify';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { z } from 'zod';

/**
 * Strip HTML tags from text — same defence used in /api/user/profile.
 * Welcome flow accepts plain-text display name + household name only.
 */
function stripHtml(input: string): string {
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  return sanitized
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * POST /api/welcome
 *
 * Finalize the post-signup welcome step. Two flavors:
 *   { skip: true }  → just stamp welcome_completed_at, no edits.
 *   { name, spaceName } → update users.name + spaces.name (if owner) and stamp.
 *
 * Why one route instead of reusing /api/user/profile + a new spaces PATCH:
 *   - /api/user/profile requires `email` in the body (would force the welcome
 *     UI to know the email) and triggers email-change verification logic that
 *     is irrelevant here.
 *   - There is no existing PATCH on /api/spaces; rename only happens through
 *     the spaces-service which uses the browser supabase client.
 *   - Keeping welcome's two writes in one transaction-shaped handler also
 *     means a single CSRF check, single rate limit, single audit event.
 */
const WelcomeSchema = z.union([
  z.object({ skip: z.literal(true) }),
  z.object({
    name: z.string().min(1).max(100),
    spaceName: z.string().min(1).max(100),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    setSentryUser(user);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = WelcomeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Path 1 — user clicked "Skip". Mark complete with no edits.
    if ('skip' in parsed.data) {
      // nosemgrep: supabase-missing-space-id-filter — `users` is global per-user table; .eq('id', user.id) is canonical
      const { error: stampError } = await supabase
        .from('users')
        .update({ welcome_completed_at: nowIso, updated_at: nowIso })
        .eq('id', user.id);

      if (stampError) {
        logger.error('[API] /api/welcome skip stamp failed', stampError, {
          component: 'WelcomeAPI',
          action: 'SKIP',
          userId: user.id,
        });
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
      }

      return NextResponse.json({ success: true, skipped: true });
    }

    // Path 2 — user submitted edits. Sanitize + persist both.
    const cleanName = stripHtml(parsed.data.name);
    const cleanSpaceName = stripHtml(parsed.data.spaceName);

    if (cleanName.length === 0 || cleanSpaceName.length === 0) {
      return NextResponse.json(
        { error: 'Name and household name cannot be empty' },
        { status: 400 }
      );
    }

    // Update display name + welcome stamp in a single users row touch.
    // nosemgrep: supabase-missing-space-id-filter — `users` is global per-user table; .eq('id', user.id) is canonical
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        name: cleanName,
        welcome_completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', user.id);

    if (userUpdateError) {
      logger.error('[API] /api/welcome users update failed', userUpdateError, {
        component: 'WelcomeAPI',
        action: 'UPDATE_USER',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Update household name only if the user owns a space they belong to.
    // Invited partners hit /welcome only as a fallback; they shouldn't be
    // editing the inviter's household name. RLS would reject the update
    // anyway, but the ownership check lets us short-circuit cleanly.
    // nosemgrep: supabase-missing-space-id-filter — space_members is user-scoped via .eq('user_id', user.id); RLS enforces user can only see own membership rows
    const { data: ownedMembership } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle();

    if (ownedMembership?.space_id) {
      // nosemgrep: supabase-missing-space-id-filter — `spaces` IS the tenant root; .eq('id', spaceId) is canonical (same pattern as seed-first-day-service.ts merged in PR #324)
      const { error: spaceUpdateError } = await supabase
        .from('spaces')
        .update({ name: cleanSpaceName, updated_at: nowIso })
        .eq('id', ownedMembership.space_id);

      if (spaceUpdateError) {
        // Profile already saved — don't fail the whole flow, just log.
        logger.error('[API] /api/welcome space rename failed', spaceUpdateError, {
          component: 'WelcomeAPI',
          action: 'UPDATE_SPACE',
          userId: user.id,
          spaceId: ownedMembership.space_id,
        });
      }
    }

    logger.info('[API] /api/welcome completed', {
      component: 'WelcomeAPI',
      action: 'COMPLETE',
      userId: user.id,
      hasOwnedSpace: !!ownedMembership?.space_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/welcome', method: 'POST' },
    });
    logger.error('[API] /api/welcome error', error, {
      component: 'WelcomeAPI',
      action: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
