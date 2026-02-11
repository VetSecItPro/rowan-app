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
import {
  createConversation,
  getConversation,
  addMessage,
  recordUsage,
  checkBudget,
} from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import {
  detectPIIInUserInput,
  sanitizeContextForLLM,
} from '@/lib/services/ai/ai-privacy-service';
import type { SpaceContext } from '@/lib/services/ai/system-prompt';
import type { AIToolCall, AIToolResult } from '@/lib/types/ai';

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

    // -- Feature flag check -----------------------------------------------
    if (!featureFlags.isAICompanionEnabled()) {
      return new Response(
        JSON.stringify({ error: 'AI companion is not enabled' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // -- Budget check (non-blocking, soft limit) --------------------------
    const budgetResult = await checkBudget(supabase, user.id, 'free').catch(() => null);
    if (budgetResult && !budgetResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Daily AI usage limit reached. Resets at midnight UTC.',
          reset_at: budgetResult.reset_at,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // -- Resolve conversation (create if "new") ---------------------------
    let activeConversationId = conversationId;
    if (conversationId === 'new' || !conversationId) {
      const conv = await createConversation(supabase, {
        user_id: user.id,
        space_id: spaceId,
      });
      activeConversationId = conv.id;
    } else {
      // Verify conversation exists and belongs to this user
      const existing = await getConversation(supabase, conversationId);
      if (!existing) {
        // Conversation not found — create a new one
        const conv = await createConversation(supabase, {
          user_id: user.id,
          space_id: spaceId,
        });
        activeConversationId = conv.id;
      }
    }

    // -- PII detection (warn but don't block) ------------------------------
    const piiResult = detectPIIInUserInput(message);

    // -- Build space context for system prompt ----------------------------
    const rawSpaceContext = await buildSpaceContext(supabase, spaceId, user);
    const spaceContext = sanitizeContextForLLM(rawSpaceContext);

    // -- Stream response via SSE ------------------------------------------
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const startTime = Date.now();

        // Collectors for persistence
        let fullAssistantText = '';
        const toolCalls: AIToolCall[] = [];
        const toolResults: AIToolResult[] = [];

        try {
          // Send conversation ID as first event so client knows it
          const idEvent = `data: ${JSON.stringify({
            type: 'conversation_id',
            data: activeConversationId,
          })}\n\n`;
          controller.enqueue(encoder.encode(idEvent));

          // Warn about PII if detected (non-blocking)
          if (piiResult.hasPII && piiResult.warningMessage) {
            const piiWarning = `data: ${JSON.stringify({
              type: 'text',
              data: `> ⚠️ ${piiResult.warningMessage}\n\n`,
            })}\n\n`;
            controller.enqueue(encoder.encode(piiWarning));
          }

          const events = chatOrchestratorService.processMessage({
            message,
            conversationId: activeConversationId,
            context: { spaceId, userId: user.id },
            spaceContext,
            confirmAction,
          });

          for await (const event of events) {
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));

            // Collect data for persistence
            if (event.type === 'text' && typeof event.data === 'string') {
              fullAssistantText += event.data;
            } else if (event.type === 'tool_call' && typeof event.data === 'object') {
              const tc = event.data as { id: string; toolName: string; parameters: Record<string, unknown> };
              toolCalls.push({ id: tc.id, name: tc.toolName, parameters: tc.parameters });
            } else if (event.type === 'result' && typeof event.data === 'object') {
              const tr = event.data as { id: string; toolName: string; success: boolean; data?: Record<string, unknown>; message: string };
              toolResults.push({ id: tr.id, name: tr.toolName, success: tr.success, data: tr.data });
            }
          }

          // -- Persist messages (fire-and-forget, don't block stream) ------
          const latencyMs = Date.now() - startTime;
          persistMessages(
            supabase,
            activeConversationId,
            user.id,
            spaceId,
            message,
            fullAssistantText,
            toolCalls,
            toolResults,
            latencyMs
          ).catch((err) => {
            logger.warn('[API] Failed to persist AI messages', {
              component: 'api-route',
              action: 'persist_messages',
              error: err instanceof Error ? err.message : String(err),
            });
          });
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

/**
 * Persist user + assistant messages and record usage.
 * Runs asynchronously after the stream to avoid blocking the response.
 */
async function persistMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string,
  spaceId: string,
  userMessage: string,
  assistantText: string,
  toolCalls: AIToolCall[],
  toolResults: AIToolResult[],
  latencyMs: number
): Promise<void> {
  // Estimate tokens (~4 chars per token as rough approximation)
  const estimatedInputTokens = Math.ceil(userMessage.length / 4);
  const estimatedOutputTokens = Math.ceil(assistantText.length / 4);

  // Persist user message
  await addMessage(supabase, {
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
    input_type: 'text',
    input_tokens: estimatedInputTokens,
  });

  // Persist assistant response (if any text was generated)
  if (assistantText) {
    await addMessage(supabase, {
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantText,
      tool_calls_json: toolCalls.length > 0 ? toolCalls : null,
      tool_results_json: toolResults.length > 0 ? toolResults : null,
      output_tokens: estimatedOutputTokens,
      model_used: 'gemini-2.0-flash',
      latency_ms: latencyMs,
    });
  }

  // Record daily usage
  await recordUsage(supabase, {
    user_id: userId,
    space_id: spaceId,
    date: new Date().toISOString().split('T')[0],
    input_tokens: estimatedInputTokens,
    output_tokens: estimatedOutputTokens,
    conversation_count: 0, // Only count 1 for new conversations
    tool_calls_count: toolCalls.length,
  });
}
