/**
 * POST /api/ai/chat
 *
 * Streaming chat endpoint for the Rowan AI Assistant.
 * Accepts a user message (or confirmation action), runs it through the
 * chat orchestrator, and streams Server-Sent Events back to the client.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import { extractIP } from '@/lib/ratelimit-fallback';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import { validateAndSanitizeChatMessage } from '@/lib/validations/chat-schemas';
import { chatOrchestratorService } from '@/lib/services/ai/chat-orchestrator-service';
import type { SpaceContext } from '@/lib/services/ai/system-prompt';

export const maxDuration = 60; // Allow up to 60s for AI responses

export async function POST(req: NextRequest) {
  try {
    // -- Rate limiting ----------------------------------------------------
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // -- Authentication ---------------------------------------------------
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    setSentryUser(user);

    // -- Validate input ---------------------------------------------------
    const body = await req.json();
    let parsed;
    try {
      parsed = validateAndSanitizeChatMessage(body);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, conversationId, spaceId, confirmAction } = parsed;

    // -- Verify space access ----------------------------------------------
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this space' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // -- Build space context for system prompt ----------------------------
    const spaceContext = await buildSpaceContext(supabase, spaceId, user);

    // -- Stream response via SSE ------------------------------------------
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const events = chatOrchestratorService.processMessage({
            message,
            conversationId,
            context: { spaceId, userId: user.id },
            spaceContext,
            confirmAction,
          });

          for await (const event of events) {
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        } catch (error) {
          logger.error('[API] /api/ai/chat stream error:', error, {
            component: 'api-route',
            action: 'api_request',
          });

          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            data: { message: 'Stream interrupted', retryable: true },
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));

          const doneEvent = `data: ${JSON.stringify({ type: 'done', data: '' })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });
  } catch (error) {
    logger.error('[API] /api/ai/chat POST error:', error, {
      component: 'api-route',
      action: 'api_request',
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build space context for the AI system prompt.
 * Fetches space info, members, and recent activity in parallel.
 */
async function buildSpaceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  user: { id: string; email?: string; user_metadata?: { name?: string } }
): Promise<SpaceContext> {
  // Fetch all context data in parallel for speed
  const [spaceResult, membersResult, tasksResult, choresResult, shoppingResult, eventsResult] =
    await Promise.all([
      // Space name
      supabase.from('spaces').select('name').eq('id', spaceId).single(),

      // Members with display names
      supabase
        .from('space_members')
        .select(`user_id, role, user_profiles:user_id ( name, email )`)
        .eq('space_id', spaceId)
        .order('joined_at', { ascending: true }),

      // Recent tasks (last 10 active)
      supabase
        .from('tasks')
        .select('title, status, due_date, assigned_to')
        .eq('space_id', spaceId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10),

      // Active chores
      supabase
        .from('chores')
        .select('title, frequency, assigned_to')
        .eq('space_id', spaceId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10),

      // Active shopping lists with item counts
      supabase
        .from('shopping_lists')
        .select('title, id')
        .eq('space_id', spaceId)
        .limit(5),

      // Upcoming events (next 7 days)
      supabase
        .from('calendar_events')
        .select('title, start_time')
        .eq('space_id', spaceId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: true })
        .limit(10),
    ]);

  type MemberRow = {
    user_id: string;
    role: string;
    user_profiles: { name: string | null; email: string | null } | null;
  };

  const memberList = ((membersResult.data as MemberRow[] | null) ?? []).map((m) => ({
    id: m.user_id,
    displayName: m.user_profiles?.name || m.user_profiles?.email || 'Unknown',
    role: m.role,
  }));

  // Type aliases for Supabase query results
  type TaskRow = { title: string; status: string; due_date: string | null; assigned_to: string | null };
  type ChoreRow = { title: string; frequency: string; assigned_to: string | null };
  type ShoppingListRow = { title: string; id: string };
  type EventRow = { title: string; start_time: string | null };

  // Count items per shopping list
  const shoppingLists = await Promise.all(
    ((shoppingResult.data as ShoppingListRow[] | null) ?? []).map(async (list) => {
      const { count } = await supabase
        .from('shopping_items')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', list.id)
        .eq('purchased', false);
      return { title: list.title, item_count: count ?? 0 };
    })
  );

  const tasks = (tasksResult.data as TaskRow[] | null) ?? [];
  const chores = (choresResult.data as ChoreRow[] | null) ?? [];
  const events = (eventsResult.data as EventRow[] | null) ?? [];

  return {
    spaceId,
    spaceName: spaceResult.data?.name ?? 'My Space',
    members: memberList,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userName:
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'there',
    userId: user.id,
    recentTasks: tasks.map((t) => ({
      title: t.title,
      status: t.status,
      due_date: t.due_date,
      assigned_to: t.assigned_to,
    })),
    recentChores: chores.map((c) => ({
      title: c.title,
      frequency: c.frequency,
      assigned_to: c.assigned_to,
    })),
    activeShoppingLists: shoppingLists.filter((l) => l.item_count > 0),
    upcomingEvents: events.map((e) => ({
      title: e.title,
      start_time: e.start_time,
    })),
  };
}
