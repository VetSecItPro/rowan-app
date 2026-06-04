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
  AIFeatureSource,
} from '@/lib/types/ai';

// ---------------------------------------------------------------------------
// Token budgets per subscription tier
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Per-model pricing (OpenRouter, USD per 1M tokens)
// ---------------------------------------------------------------------------

// Re-verify quarterly via:
//   curl -s https://openrouter.ai/api/v1/models \
//     | jq '.data[] | select(.id|startswith("google/gemini-2.5-flash")) | {id, pricing}'
// (multiply prompt/completion by 1_000_000 to get per-1M-token rates)
//
// Last verified: 2026-05-01.
// History: Gemini 2.5 Flash repriced upward between 2026-02-28 and
// 2026-05-01 (input 0.15→0.30, output 0.60→2.50, ~3.3x effective).
//
// Both slots stay in the Gemini family (chat-orchestrator-service.ts);
// when fallback fires, rows are billed at Flash Lite rates so admin
// dashboards get the right $ per turn. Unknown model IDs fall back to
// PRIMARY pricing — fail-safe overestimate rather than missing data.
type ModelPricing = { input_per_million: number; output_per_million: number };

const MODEL_PRICING: Record<string, ModelPricing> = {
  'google/gemini-2.5-flash':       { input_per_million: 0.30, output_per_million: 2.50 },
  'google/gemini-2.5-flash-lite':  { input_per_million: 0.10, output_per_million: 0.40 },
};

const DEFAULT_MODEL_ID = 'google/gemini-2.5-flash';

/**
 * Calculate estimated cost in USD for a token usage record.
 *
 * @param inputTokens  prompt token count
 * @param outputTokens completion token count
 * @param modelId      OpenRouter model id (e.g. "google/gemini-2.5-flash").
 *                     Defaults to PRIMARY when unknown so existing call
 *                     sites keep working; pass the actual model when the
 *                     caller knows it (e.g. orchestrator after fallback).
 */
export function calculateCostUsd(
  inputTokens: number,
  outputTokens: number,
  modelId: string = DEFAULT_MODEL_ID,
): number {
  const pricing = MODEL_PRICING[modelId] ?? MODEL_PRICING[DEFAULT_MODEL_ID];
  const inputCost = (inputTokens / 1_000_000) * pricing.input_per_million;
  const outputCost = (outputTokens / 1_000_000) * pricing.output_per_million;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
}

/** Per-user daily token budgets.
 * Post-Phase-10: a request no longer ships all ~145 tool declarations — intent
 * subsetting sends only 1-3 domains (~3-8K real input tokens/message) and the
 * static prefix is implicitly cached. Budgets are sized against that profile. */
const TOKEN_BUDGETS: Record<string, AITokenBudget> = {
  // Phase 11.6: free-tier AI teaser. Tight daily cap because free users have $0
  // revenue, so this is pure marketing spend — keep it to a few short exchanges.
  // With prompt caching + tool subsetting (~6-8K real input tokens/message),
  // ~40K input covers roughly 4-5 messages before the cap. Routed to flash-lite.
  free: {
    daily_input_tokens: 40_000,
    daily_output_tokens: 5_000,
    daily_voice_seconds: 0,
    daily_conversations: 5,
  },
  plus: {
    daily_input_tokens: 300_000,
    daily_output_tokens: 80_000,
    daily_voice_seconds: 600,
    daily_conversations: 50,
  },
  family: {
    daily_input_tokens: 300_000,
    daily_output_tokens: 80_000,
    daily_voice_seconds: 1_800,
    daily_conversations: 100,
  },
};

/**
 * Per-tier monthly COGS ceiling in USD (Phase 10.6). This is the hard backstop:
 * even if a user stays under the daily caps every day, their AI cost for the
 * month cannot exceed these. Sized to keep AI COGS well under 25-30% of the
 * per-user revenue (Plus ~$5/mo effective, Family ~$8/mo). `owner` is unlimited.
 */
const MONTHLY_COGS_CAP_USD: Record<string, number> = {
  free: 0.5,
  plus: 1.5,
  family: 2.4,
  owner: Infinity,
};

/** Per-space daily token caps (hard limit shared across all users in a space) */
const SPACE_TOKEN_BUDGETS: AITokenBudget = {
  daily_input_tokens: 800_000,
  daily_output_tokens: 200_000,
  daily_voice_seconds: 3_600,
  daily_conversations: 300,
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
      model_used: data.model_used ?? 'gemini-2.5-flash',
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
    .select('id, user_id, ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, ai_onboarding_seen, created_at, updated_at')
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
    .select('id, user_id, ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, ai_onboarding_seen, created_at, updated_at')
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
    .select('id, user_id, ai_enabled, voice_enabled, proactive_suggestions, morning_briefing, preferred_voice_lang, ai_onboarding_seen, created_at, updated_at')
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

/** Record usage for the current day (upsert — increments if exists, partitioned by feature_source) */
export async function recordUsage(
  supabase: SupabaseClient,
  data: AIUsageDailyUpsert
): Promise<void> {
  const today = data.date || new Date().toISOString().split('T')[0];
  const featureSource: AIFeatureSource = data.feature_source ?? 'chat';
  const inputTokens = data.input_tokens ?? 0;
  const outputTokens = data.output_tokens ?? 0;
  // Pass model id through so Flash vs Flash Lite turns are billed at
  // their actual rates. Unknown/missing model defaults to primary.
  const costUsd = calculateCostUsd(inputTokens, outputTokens, data.model_used);

  // Check if a row exists for today + feature_source
  const { data: existing } = await supabase
    .from('ai_usage_daily')
    .select('id, input_tokens, output_tokens, voice_seconds, conversation_count, tool_calls_count, estimated_cost_usd')
    .eq('user_id', data.user_id)
    .eq('date', today)
    .eq('feature_source', featureSource)
    .single();

  if (existing) {
    // Increment existing counters
    const { error } = await supabase
      .from('ai_usage_daily')
      .update({
        input_tokens: (existing.input_tokens ?? 0) + inputTokens,
        output_tokens: (existing.output_tokens ?? 0) + outputTokens,
        voice_seconds: (existing.voice_seconds ?? 0) + (data.voice_seconds ?? 0),
        conversation_count: (existing.conversation_count ?? 0) + (data.conversation_count ?? 0),
        tool_calls_count: (existing.tool_calls_count ?? 0) + (data.tool_calls_count ?? 0),
        estimated_cost_usd: (existing.estimated_cost_usd ?? 0) + costUsd,
      })
      .eq('id', existing.id);

    if (error) {
      logger.error('[AI Persistence] Failed to update usage', error, {
        component: 'ai-persistence',
        action: 'record_usage_update',
      });
    }
  } else {
    // Insert new row for today + feature_source
    const { error } = await supabase
      .from('ai_usage_daily')
      .insert({
        user_id: data.user_id,
        space_id: data.space_id,
        date: today,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        voice_seconds: data.voice_seconds ?? 0,
        conversation_count: data.conversation_count ?? 0,
        tool_calls_count: data.tool_calls_count ?? 0,
        feature_source: featureSource,
        estimated_cost_usd: costUsd,
      });

    if (error) {
      logger.error('[AI Persistence] Failed to insert usage', error, {
        component: 'ai-persistence',
        action: 'record_usage_insert',
      });
    }
  }

  // 4.2.6/4.2.7: Check cost thresholds for Sentry alerts (non-blocking)
  checkCostThresholds(supabase, data.user_id, today).catch(() => {});
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

/**
 * Check if user is within their daily AI token budget.
 * Checks both per-user limits AND per-space limits (hard cap).
 */
export async function checkBudget(
  supabase: SupabaseClient,
  userId: string,
  tier: string,
  spaceId?: string
): Promise<AIBudgetCheckResult> {
  const budget = TOKEN_BUDGETS[tier] ?? TOKEN_BUDGETS.plus;
  const today = new Date().toISOString().split('T')[0];

  // Reset at midnight UTC
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetAt = tomorrow.toISOString();

  // 1. Check per-user budget. SUM across ALL feature_source rows for the day —
  //    ai_usage_daily is keyed (user_id, date, feature_source). Using .single()
  //    here would ERROR the moment any source other than 'chat' (briefing, OCR,
  //    suggestions...) records usage for the same day, and the caller swallows
  //    that error -> userUsage null -> usage read as 0 -> the daily AND monthly
  //    caps silently stop tripping (fail-open). Mirror the per-space sum below.
  //    (SEC-AI-01)
  // nosemgrep: supabase-missing-space-id-filter - ai_usage_daily is per-user (keyed user_id+date+feature_source), not space-scoped
  const { data: userUsageRows } = await supabase
    .from('ai_usage_daily')
    .select('input_tokens, output_tokens, voice_seconds, conversation_count')
    .eq('user_id', userId)
    .eq('date', today);

  const userUsed = {
    input_tokens: (userUsageRows ?? []).reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
    output_tokens: (userUsageRows ?? []).reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
    voice_seconds: (userUsageRows ?? []).reduce((sum, r) => sum + (r.voice_seconds ?? 0), 0),
    conversations: (userUsageRows ?? []).reduce((sum, r) => sum + (r.conversation_count ?? 0), 0),
  };

  const userRemainingInput = Math.max(0, budget.daily_input_tokens - userUsed.input_tokens);
  const userRemainingOutput = Math.max(0, budget.daily_output_tokens - userUsed.output_tokens);
  const userRemainingVoice = Math.max(0, budget.daily_voice_seconds - userUsed.voice_seconds);
  const userRemainingConversations = Math.max(0, budget.daily_conversations - userUsed.conversations);

  const userAllowed = userRemainingInput > 0 && userRemainingOutput > 0 && userRemainingConversations > 0;

  if (!userAllowed) {
    return {
      allowed: false,
      remaining_input_tokens: userRemainingInput,
      remaining_output_tokens: userRemainingOutput,
      remaining_voice_seconds: userRemainingVoice,
      remaining_conversations: userRemainingConversations,
      reset_at: resetAt,
      reason: 'You\'ve reached your daily AI limit. Resets at midnight UTC.',
      remaining: { input_tokens: userRemainingInput, output_tokens: userRemainingOutput },
    };
  }

  // 1b. Monthly COGS ceiling (Phase 10.6) — the hard $/user/month backstop on
  //     top of the daily caps. Sums the per-day estimated_cost_usd for the
  //     calendar month and blocks once the tier's cap is reached.
  const monthlyCap = MONTHLY_COGS_CAP_USD[tier] ?? MONTHLY_COGS_CAP_USD.plus;
  if (Number.isFinite(monthlyCap)) {
    const firstOfMonth = `${today.slice(0, 7)}-01`;
    // nosemgrep: supabase-missing-space-id-filter - ai_usage_daily is per-user (keyed user_id+date+feature_source), not space-scoped
    const { data: monthRows } = await supabase
      .from('ai_usage_daily')
      .select('estimated_cost_usd')
      .eq('user_id', userId)
      .gte('date', firstOfMonth);

    const monthlySpend = (monthRows ?? []).reduce(
      (sum, r) => sum + ((r.estimated_cost_usd as number | null) ?? 0),
      0,
    );

    if (monthlySpend >= monthlyCap) {
      // Reset at the first of next month (UTC).
      const nextMonth = new Date();
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
      nextMonth.setUTCHours(0, 0, 0, 0);
      return {
        allowed: false,
        remaining_input_tokens: 0,
        remaining_output_tokens: 0,
        remaining_voice_seconds: 0,
        remaining_conversations: 0,
        reset_at: nextMonth.toISOString(),
        reason: "You've reached this month's AI usage limit. Resets at the start of next month.",
        remaining: { input_tokens: 0, output_tokens: 0 },
      };
    }
  }

  // 2. Check per-space budget (if spaceId provided)
  if (spaceId) {
    const { data: spaceUsageRows } = await supabase
      .from('ai_usage_daily')
      .select('input_tokens, output_tokens, voice_seconds, conversation_count')
      .eq('space_id', spaceId)
      .eq('date', today);

    const spaceUsed = {
      input_tokens: (spaceUsageRows ?? []).reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
      output_tokens: (spaceUsageRows ?? []).reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
      voice_seconds: (spaceUsageRows ?? []).reduce((sum, r) => sum + (r.voice_seconds ?? 0), 0),
      conversations: (spaceUsageRows ?? []).reduce((sum, r) => sum + (r.conversation_count ?? 0), 0),
    };

    const spaceRemainingInput = Math.max(0, SPACE_TOKEN_BUDGETS.daily_input_tokens - spaceUsed.input_tokens);
    const spaceRemainingOutput = Math.max(0, SPACE_TOKEN_BUDGETS.daily_output_tokens - spaceUsed.output_tokens);

    const spaceAllowed = spaceRemainingInput > 0 && spaceRemainingOutput > 0;

    if (!spaceAllowed) {
      return {
        allowed: false,
        remaining_input_tokens: Math.min(userRemainingInput, spaceRemainingInput),
        remaining_output_tokens: Math.min(userRemainingOutput, spaceRemainingOutput),
        remaining_voice_seconds: userRemainingVoice,
        remaining_conversations: userRemainingConversations,
        reset_at: resetAt,
        reason: 'Your household has reached its daily AI limit. Resets at midnight UTC.',
        remaining: { input_tokens: spaceRemainingInput, output_tokens: spaceRemainingOutput },
      };
    }

    // Return the minimum of user and space remaining
    return {
      allowed: true,
      remaining_input_tokens: Math.min(userRemainingInput, spaceRemainingInput),
      remaining_output_tokens: Math.min(userRemainingOutput, spaceRemainingOutput),
      remaining_voice_seconds: userRemainingVoice,
      remaining_conversations: userRemainingConversations,
      reset_at: resetAt,
      remaining: {
        input_tokens: Math.min(userRemainingInput, spaceRemainingInput),
        output_tokens: Math.min(userRemainingOutput, spaceRemainingOutput),
      },
    };
  }

  return {
    allowed: true,
    remaining_input_tokens: userRemainingInput,
    remaining_output_tokens: userRemainingOutput,
    remaining_voice_seconds: userRemainingVoice,
    remaining_conversations: userRemainingConversations,
    reset_at: resetAt,
    remaining: { input_tokens: userRemainingInput, output_tokens: userRemainingOutput },
  };
}

/** Get the token budget for a tier. Only plus/family have AI access; fallback to plus as safety net. */
export function getTokenBudget(tier: string): AITokenBudget {
  return TOKEN_BUDGETS[tier] ?? TOKEN_BUDGETS.plus;
}

// ---------------------------------------------------------------------------
// Cost Threshold Alerts (4.2.6, 4.2.7)
// ---------------------------------------------------------------------------

const DAILY_COST_ALERT_THRESHOLD = parseFloat(process.env.AI_DAILY_COST_ALERT_THRESHOLD || '5');
const USER_COST_ALERT_THRESHOLD = parseFloat(process.env.AI_USER_COST_ALERT_THRESHOLD || '2');

/** Check daily and per-user cost thresholds, fire Sentry alert if exceeded */
async function checkCostThresholds(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<void> {
  try {
    // Check per-user cost for today
    const { data: userRows } = await supabase
      .from('ai_usage_daily')
      .select('estimated_cost_usd')
      .eq('user_id', userId)
      .eq('date', today);

    const userDailyCost = (userRows ?? []).reduce((sum, r) => sum + (r.estimated_cost_usd ?? 0), 0);

    if (userDailyCost > USER_COST_ALERT_THRESHOLD) {
      // Dynamic import Sentry to avoid build-time issues
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        Sentry.captureMessage(`AI cost alert: User ${userId} exceeded $${USER_COST_ALERT_THRESHOLD}/day threshold ($${userDailyCost.toFixed(4)})`, {
          level: 'warning',
          tags: { alert_type: 'ai_user_cost', user_id: userId },
          extra: { userDailyCost, threshold: USER_COST_ALERT_THRESHOLD, date: today },
        });
      }
    }

    // Check total daily cost across all users
    const { data: allRows } = await supabase
      .from('ai_usage_daily')
      .select('estimated_cost_usd')
      .eq('date', today);

    const totalDailyCost = (allRows ?? []).reduce((sum, r) => sum + (r.estimated_cost_usd ?? 0), 0);

    if (totalDailyCost > DAILY_COST_ALERT_THRESHOLD) {
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        Sentry.captureMessage(`AI cost alert: Total daily spend exceeded $${DAILY_COST_ALERT_THRESHOLD} threshold ($${totalDailyCost.toFixed(4)})`, {
          level: 'error',
          tags: { alert_type: 'ai_daily_cost_total' },
          extra: { totalDailyCost, threshold: DAILY_COST_ALERT_THRESHOLD, date: today },
        });
      }
    }
  } catch {
    // Non-critical — don't let cost checks break usage tracking
  }
}
