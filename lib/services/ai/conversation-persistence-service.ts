/**
 * AI Conversation Persistence Service
 *
 * Handles all database operations for AI conversations, messages,
 * user settings, and usage tracking. Works with RLS — the authenticated
 * user's Supabase client ensures space isolation automatically.
 *
 * Architecture:
 *   API Route → creates Supabase client (with user cookies)
 *             → passes client to this service
 *             → RLS enforces user/space boundaries
 */

import { logger } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIConversation,
  AIConversationInsert,
  AIConversationUpdate,
  AIConversationSummary,
  AIMessage,
  AIMessageInsert,
  AIUserSettings,
  AIUserSettingsInsert,
  AIUserSettingsUpdate,
  AIUsageDailyUpsert,
  AIUsageSummary,
  AITokenBudget,
  AIBudgetCheckResult,
} from '@/lib/types/ai';

// ---------------------------------------------------------------------------
// Token budgets per subscription tier
// ---------------------------------------------------------------------------

const TOKEN_BUDGETS: Record<string, AITokenBudget> = {
  free: {
    daily_input_tokens: 50_000,
    daily_output_tokens: 25_000,
    daily_voice_seconds: 60,
    daily_conversations: 10,
  },
  pro: {
    daily_input_tokens: 500_000,
    daily_output_tokens: 250_000,
    daily_voice_seconds: 600,
    daily_conversations: 100,
  },
  family: {
    daily_input_tokens: 1_000_000,
    daily_output_tokens: 500_000,
    daily_voice_seconds: 1_800,
    daily_conversations: 200,
  },
};

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/** Create a new conversation */
export async function createConversation(
  supabase: SupabaseClient,
  data: AIConversationInsert
): Promise<AIConversation> {
  const { data: conversation, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: data.user_id,
      space_id: data.space_id,
      title: data.title ?? null,
      model_used: data.model_used ?? 'gemini-2.0-flash',
    })
    .select('id, user_id, space_id, title, started_at, last_message_at, message_count, summary, model_used, total_input_tokens, total_output_tokens, created_at, updated_at')
    .single();

  if (error) {
    logger.error('[AI Persistence] Failed to create conversation', error, {
      component: 'ai-persistence',
      action: 'create_conversation',
    });
    throw new Error('Failed to create conversation');
  }

  return conversation;
}

/** Get a conversation by ID */
export async function getConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<AIConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, user_id, space_id, title, started_at, last_message_at, message_count, summary, model_used, total_input_tokens, total_output_tokens, created_at, updated_at')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    logger.error('[AI Persistence] Failed to get conversation', error, {
      component: 'ai-persistence',
      action: 'get_conversation',
    });
    throw new Error('Failed to get conversation');
  }

  return data;
}

/** List conversation summaries for history sidebar */
export async function listConversations(
  supabase: SupabaseClient,
  spaceId: string,
  limit = 20,
  offset = 0
): Promise<AIConversationSummary[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, started_at, last_message_at, message_count, summary')
    .eq('space_id', spaceId)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('[AI Persistence] Failed to list conversations', error, {
      component: 'ai-persistence',
      action: 'list_conversations',
    });
    throw new Error('Failed to list conversations');
  }

  return data ?? [];
}

/** Update conversation metadata (title, summary, token counts) */
export async function updateConversation(
  supabase: SupabaseClient,
  conversationId: string,
  data: AIConversationUpdate
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update(data)
    .eq('id', conversationId);

  if (error) {
    logger.error('[AI Persistence] Failed to update conversation', error, {
      component: 'ai-persistence',
      action: 'update_conversation',
    });
    throw new Error('Failed to update conversation');
  }
}

/** Delete a conversation (cascades to messages via FK) */
export async function deleteConversation(
  supabase: SupabaseClient,
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    logger.error('[AI Persistence] Failed to delete conversation', error, {
      component: 'ai-persistence',
      action: 'delete_conversation',
    });
    throw new Error('Failed to delete conversation');
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Add a message to a conversation */
export async function addMessage(
  supabase: SupabaseClient,
  data: AIMessageInsert
): Promise<AIMessage> {
  const { data: message, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: data.conversation_id,
      role: data.role,
      content: data.content,
      input_type: data.input_type ?? 'text',
      tool_calls_json: data.tool_calls_json ?? null,
      tool_results_json: data.tool_results_json ?? null,
      input_tokens: data.input_tokens ?? 0,
      output_tokens: data.output_tokens ?? 0,
      model_used: data.model_used ?? null,
      latency_ms: data.latency_ms ?? null,
    })
    .select('id, conversation_id, role, content, input_type, tool_calls_json, tool_results_json, input_tokens, output_tokens, model_used, latency_ms, created_at')
    .single();

  if (error) {
    logger.error('[AI Persistence] Failed to add message', error, {
      component: 'ai-persistence',
      action: 'add_message',
    });
    throw new Error('Failed to add message');
  }

  // Update conversation's last_message_at, message_count, and token totals
  const tokenUpdate: AIConversationUpdate = {
    last_message_at: new Date().toISOString(),
  };

  if (data.input_tokens || data.output_tokens) {
    // Increment token counts on the conversation
    const { data: conv } = await supabase
      .from('ai_conversations')
      .select('message_count, total_input_tokens, total_output_tokens')
      .eq('id', data.conversation_id)
      .single();

    if (conv) {
      tokenUpdate.message_count = (conv.message_count ?? 0) + 1;
      tokenUpdate.total_input_tokens = (conv.total_input_tokens ?? 0) + (data.input_tokens ?? 0);
      tokenUpdate.total_output_tokens = (conv.total_output_tokens ?? 0) + (data.output_tokens ?? 0);
    }
  }

  await supabase
    .from('ai_conversations')
    .update(tokenUpdate)
    .eq('id', data.conversation_id);

  return message;
}

/** Get messages for a conversation (paginated, oldest first) */
export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, conversation_id, role, content, input_type, tool_calls_json, tool_results_json, input_tokens, output_tokens, model_used, latency_ms, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('[AI Persistence] Failed to get messages', error, {
      component: 'ai-persistence',
      action: 'get_messages',
    });
    throw new Error('Failed to get messages');
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// User Settings
// ---------------------------------------------------------------------------

/** Get user settings (creates default row if none exists) */
export async function getSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<AIUserSettings> {
  const { data, error } = await supabase
    .from('ai_user_settings')
    .select('id, user_id, ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, created_at, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No settings row yet — create defaults
    return createDefaultSettings(supabase, userId);
  }

  if (error) {
    logger.error('[AI Persistence] Failed to get settings', error, {
      component: 'ai-persistence',
      action: 'get_settings',
    });
    throw new Error('Failed to get AI settings');
  }

  return data;
}

/** Create default settings for a user */
async function createDefaultSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<AIUserSettings> {
  const defaults: AIUserSettingsInsert = {
    user_id: userId,
    ai_enabled: true,
    voice_enabled: false,
    proactive_suggestions: true,
    morning_briefing: false,
    preferred_voice_lang: 'en-US',
  };

  const { data, error } = await supabase
    .from('ai_user_settings')
    .insert(defaults)
    .select('id, user_id, ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, created_at, updated_at')
    .single();

  if (error) {
    logger.error('[AI Persistence] Failed to create default settings', error, {
      component: 'ai-persistence',
      action: 'create_default_settings',
    });
    throw new Error('Failed to create AI settings');
  }

  return data;
}

/** Update user settings */
export async function updateSettings(
  supabase: SupabaseClient,
  userId: string,
  data: AIUserSettingsUpdate
): Promise<AIUserSettings> {
  const { data: settings, error } = await supabase
    .from('ai_user_settings')
    .update(data)
    .eq('user_id', userId)
    .select('id, user_id, ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, created_at, updated_at')
    .single();

  if (error) {
    logger.error('[AI Persistence] Failed to update settings', error, {
      component: 'ai-persistence',
      action: 'update_settings',
    });
    throw new Error('Failed to update AI settings');
  }

  return settings;
}

// ---------------------------------------------------------------------------
// Usage Tracking
// ---------------------------------------------------------------------------

/** Record usage for the current day (upsert — increments if exists) */
export async function recordUsage(
  supabase: SupabaseClient,
  data: AIUsageDailyUpsert
): Promise<void> {
  const today = data.date || new Date().toISOString().split('T')[0];

  // Check if a row exists for today
  const { data: existing } = await supabase
    .from('ai_usage_daily')
    .select('id, input_tokens, output_tokens, voice_seconds, conversation_count, tool_calls_count')
    .eq('user_id', data.user_id)
    .eq('date', today)
    .single();

  if (existing) {
    // Increment existing counters
    const { error } = await supabase
      .from('ai_usage_daily')
      .update({
        input_tokens: (existing.input_tokens ?? 0) + (data.input_tokens ?? 0),
        output_tokens: (existing.output_tokens ?? 0) + (data.output_tokens ?? 0),
        voice_seconds: (existing.voice_seconds ?? 0) + (data.voice_seconds ?? 0),
        conversation_count: (existing.conversation_count ?? 0) + (data.conversation_count ?? 0),
        tool_calls_count: (existing.tool_calls_count ?? 0) + (data.tool_calls_count ?? 0),
      })
      .eq('id', existing.id);

    if (error) {
      logger.error('[AI Persistence] Failed to update usage', error, {
        component: 'ai-persistence',
        action: 'record_usage_update',
      });
    }
  } else {
    // Insert new row for today
    const { error } = await supabase
      .from('ai_usage_daily')
      .insert({
        user_id: data.user_id,
        space_id: data.space_id,
        date: today,
        input_tokens: data.input_tokens ?? 0,
        output_tokens: data.output_tokens ?? 0,
        voice_seconds: data.voice_seconds ?? 0,
        conversation_count: data.conversation_count ?? 0,
        tool_calls_count: data.tool_calls_count ?? 0,
      });

    if (error) {
      logger.error('[AI Persistence] Failed to insert usage', error, {
        component: 'ai-persistence',
        action: 'record_usage_insert',
      });
    }
  }
}

/** Get usage summary for a date range */
export async function getUsageSummary(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<AIUsageSummary> {
  const { data, error } = await supabase
    .from('ai_usage_daily')
    .select('input_tokens, output_tokens, voice_seconds, conversation_count, tool_calls_count')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    logger.error('[AI Persistence] Failed to get usage summary', error, {
      component: 'ai-persistence',
      action: 'get_usage_summary',
    });
    throw new Error('Failed to get usage summary');
  }

  const rows = data ?? [];
  return {
    total_input_tokens: rows.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
    total_output_tokens: rows.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
    total_conversations: rows.reduce((sum, r) => sum + (r.conversation_count ?? 0), 0),
    total_tool_calls: rows.reduce((sum, r) => sum + (r.tool_calls_count ?? 0), 0),
    total_voice_seconds: rows.reduce((sum, r) => sum + (r.voice_seconds ?? 0), 0),
    days: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Budget Checking
// ---------------------------------------------------------------------------

/** Check if user is within their daily AI token budget */
export async function checkBudget(
  supabase: SupabaseClient,
  userId: string,
  tier: string
): Promise<AIBudgetCheckResult> {
  const budget = TOKEN_BUDGETS[tier] ?? TOKEN_BUDGETS.free;
  const today = new Date().toISOString().split('T')[0];

  const { data: usage } = await supabase
    .from('ai_usage_daily')
    .select('input_tokens, output_tokens, voice_seconds, conversation_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const used = {
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    voice_seconds: usage?.voice_seconds ?? 0,
    conversations: usage?.conversation_count ?? 0,
  };

  const remaining_input = Math.max(0, budget.daily_input_tokens - used.input_tokens);
  const remaining_output = Math.max(0, budget.daily_output_tokens - used.output_tokens);
  const remaining_voice = Math.max(0, budget.daily_voice_seconds - used.voice_seconds);
  const remaining_conversations = Math.max(0, budget.daily_conversations - used.conversations);

  // Reset at midnight UTC
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    allowed: remaining_input > 0 && remaining_output > 0 && remaining_conversations > 0,
    remaining_input_tokens: remaining_input,
    remaining_output_tokens: remaining_output,
    remaining_voice_seconds: remaining_voice,
    remaining_conversations: remaining_conversations,
    reset_at: tomorrow.toISOString(),
  };
}

/** Get the token budget for a tier */
export function getTokenBudget(tier: string): AITokenBudget {
  return TOKEN_BUDGETS[tier] ?? TOKEN_BUDGETS.free;
}
