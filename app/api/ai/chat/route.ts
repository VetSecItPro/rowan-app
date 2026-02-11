/**
 * POST /api/ai/chat
 *
 * Streaming chat endpoint for the Rowan AI Assistant.
 * Accepts a user message (or confirmation action), runs it through the
 * chat orchestrator, and streams Server-Sent Events back to the client.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit, checkAIChatRateLimit } from '@/lib/ratelimit';
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
} from '@/lib/services/ai/conversation-persistence-service';
import { featureFlags } from '@/lib/constants/feature-flags';
import { validateAIAccess, buildAIAccessDeniedResponse } from '@/lib/services/ai/ai-access-guard';
import {
  detectPIIInUserInput,
  sanitizeContextForLLM,
} from '@/lib/services/ai/ai-privacy-service';
import { sanitizeUserInput } from '@/lib/services/ai/ai-input-sanitizer';
import { aiContextService } from '@/lib/services/ai/ai-context-service';
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

    const { message, conversationId, spaceId, confirmAction, voiceDurationSeconds } = parsed;

    // -- Verify space access ----------------------------------------------
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this space' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // -- AI access check (subscription tier + budget) ---------------------
    const aiAccess = await validateAIAccess(supabase, user.id, spaceId);
    if (!aiAccess.allowed) {
      return buildAIAccessDeniedResponse(aiAccess);
    }

    // -- Per-user rate limiting (tier-based) --------------------------------
    const { success: aiRateOk } = await checkAIChatRateLimit(user.id, aiAccess.tier);
    if (!aiRateOk) {
      return new Response(
        JSON.stringify({ error: 'You\'re sending messages too fast. Please slow down.' }),
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

    // -- Input sanitization (prompt injection + HTML/script stripping) ------
    const sanitized = sanitizeUserInput(message, user.id);
    if (sanitized.wasBlocked) {
      return new Response(
        JSON.stringify({ error: sanitized.blockReason ?? 'Message blocked for safety reasons.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const safeMessage = sanitized.wasModified ? sanitized.sanitized : message;

    // -- PII detection (warn but don't block) ------------------------------
    const piiResult = detectPIIInUserInput(safeMessage);

    // -- Build space context for system prompt ----------------------------
    const rawSpaceContext = await aiContextService.buildFullContext(supabase, spaceId, user);
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
            message: safeMessage,
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
            safeMessage,
            fullAssistantText,
            toolCalls,
            toolResults,
            latencyMs,
            voiceDurationSeconds
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
  latencyMs: number,
  voiceDurationSeconds?: number
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
      model_used: 'gemini-2.5-flash',
      latency_ms: latencyMs,
    });
  }

  // Record daily usage with feature_source for cost tracking
  await recordUsage(supabase, {
    user_id: userId,
    space_id: spaceId,
    date: new Date().toISOString().split('T')[0],
    input_tokens: estimatedInputTokens,
    output_tokens: estimatedOutputTokens,
    voice_seconds: voiceDurationSeconds ?? 0,
    conversation_count: 0, // Only count 1 for new conversations
    tool_calls_count: toolCalls.length,
    feature_source: 'chat',
  });
}
