/**
 * AI Data Management — Export and Delete user AI data
 *
 * GET  /api/ai/data — Export all AI conversations + messages as JSON
 * DELETE /api/ai/data — Delete all AI conversations, messages, and usage for the user
 *
 * Both operations are user-scoped (RLS enforced) and require authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET — Export all AI data for the authenticated user
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const ip = extractIP(req.headers);
  const { success } = await checkGeneralRateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all conversations for this user (RLS ensures user scope)
    const { data: conversations, error: convError } = await supabase
      .from('ai_conversations')
      .select('id, space_id, title, started_at, last_message_at, message_count, summary, model_used, total_input_tokens, total_output_tokens, created_at')
      .order('created_at', { ascending: false });

    if (convError) {
      logger.error('[AI Data] Failed to export conversations', convError);
      return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
    }

    // Fetch all messages for these conversations
    const conversationIds = (conversations ?? []).map((c: { id: string }) => c.id);
    let messages: Record<string, unknown>[] = [];

    if (conversationIds.length > 0) {
      const { data: msgs, error: msgError } = await supabase
        .from('ai_messages')
        .select('id, conversation_id, role, content, input_type, tool_calls_json, tool_results_json, input_tokens, output_tokens, model_used, latency_ms, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      if (msgError) {
        logger.error('[AI Data] Failed to export messages', msgError);
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
      }

      messages = msgs ?? [];
    }

    // Fetch user settings
    const { data: settings } = await supabase
      .from('ai_user_settings')
      .select('ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    // Fetch usage data
    const { data: usage } = await supabase
      .from('ai_usage_daily')
      .select('date, input_tokens, output_tokens, voice_seconds, conversation_count, tool_calls_count, feature_source, estimated_cost_usd')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      settings: settings ?? null,
      conversations: (conversations ?? []).map((conv: { id: string; [key: string]: unknown }) => ({
        ...conv,
        messages: messages.filter((m) => m.conversation_id === conv.id),
      })),
      usage_history: usage ?? [],
      total_conversations: conversations?.length ?? 0,
      total_messages: messages.length,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rowan-ai-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    logger.error('[AI Data] Export failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete all AI data for the authenticated user
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const ip = extractIP(req.headers);
  const { success } = await checkGeneralRateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Delete all messages in user's conversations
    // First get conversation IDs (RLS scoped)
    const { data: conversations } = await supabase
      .from('ai_conversations')
      .select('id');

    const conversationIds = (conversations ?? []).map((c: { id: string }) => c.id);

    if (conversationIds.length > 0) {
      const { error: msgError } = await supabase
        .from('ai_messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (msgError) {
        logger.error('[AI Data] Failed to delete messages', msgError);
      }
    }

    // 2. Delete all conversations
    const { error: convError } = await supabase
      .from('ai_conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (RLS enforces user scope)

    if (convError) {
      logger.error('[AI Data] Failed to delete conversations', convError);
    }

    // 3. Delete usage tracking data
    const { error: usageError } = await supabase
      .from('ai_usage_daily')
      .delete()
      .eq('user_id', user.id);

    if (usageError) {
      logger.error('[AI Data] Failed to delete usage data', usageError);
    }

    // 4. Reset user settings to defaults (don't delete — just reset)
    const { error: settingsError } = await supabase
      .from('ai_user_settings')
      .update({
        ai_enabled: true,
        voice_enabled: false,
        proactive_suggestions: true,
        morning_briefing: false,
        preferred_voice_lang: 'en-US',
      })
      .eq('user_id', user.id);

    if (settingsError) {
      logger.error('[AI Data] Failed to reset settings', settingsError);
    }

    logger.info('[AI Data] User AI data deleted', {
      component: 'ai-data',
      action: 'delete_all',
      userId: user.id,
      conversationsDeleted: conversationIds.length,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        conversations: conversationIds.length,
        messages: true,
        usage: true,
        settings_reset: true,
      },
    });
  } catch (err) {
    logger.error('[AI Data] Delete failed', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
