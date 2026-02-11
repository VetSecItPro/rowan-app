/**
 * AI Companion Database Types
 *
 * Maps to the ai_conversations, ai_messages, ai_user_settings,
 * and ai_usage_daily tables. Used by the persistence service layer.
 *
 * NOTE: Streaming/event types remain in lib/types/chat.ts
 */

// =============================================
// AI Conversations
// =============================================

/** Row from ai_conversations table */
export interface AIConversation {
  id: string;
  user_id: string;
  space_id: string;
  title: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  summary: string | null;
  model_used: string;
  total_input_tokens: number;
  total_output_tokens: number;
  created_at: string;
  updated_at: string;
}

/** Insert payload for ai_conversations */
export interface AIConversationInsert {
  user_id: string;
  space_id: string;
  title?: string | null;
  model_used?: string;
}

/** Update payload for ai_conversations */
export interface AIConversationUpdate {
  title?: string | null;
  last_message_at?: string;
  message_count?: number;
  summary?: string | null;
  total_input_tokens?: number;
  total_output_tokens?: number;
}

// =============================================
// AI Messages
// =============================================

/** Valid message roles */
export type AIMessageRole = 'user' | 'assistant' | 'system' | 'function';

/** Valid input types */
export type AIInputType = 'text' | 'voice';

/** Row from ai_messages table */
export interface AIMessage {
  id: string;
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  input_type: AIInputType;
  tool_calls_json: AIToolCall[] | null;
  tool_results_json: AIToolResult[] | null;
  input_tokens: number;
  output_tokens: number;
  model_used: string | null;
  latency_ms: number | null;
  created_at: string;
}

/** Insert payload for ai_messages */
export interface AIMessageInsert {
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  input_type?: AIInputType;
  tool_calls_json?: AIToolCall[] | null;
  tool_results_json?: AIToolResult[] | null;
  input_tokens?: number;
  output_tokens?: number;
  model_used?: string | null;
  latency_ms?: number | null;
}

/** Structured tool call stored in tool_calls_json */
export interface AIToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

/** Structured tool result stored in tool_results_json */
export interface AIToolResult {
  id: string;
  name: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// =============================================
// AI User Settings
// =============================================

/** Row from ai_user_settings table */
export interface AIUserSettings {
  id: string;
  user_id: string;
  ai_enabled: boolean;
  voice_enabled: boolean;
  proactive_suggestions: boolean;
  morning_briefing: boolean;
  preferred_voice_lang: string;
  ai_onboarding_seen: boolean;
  created_at: string;
  updated_at: string;
}

/** Insert payload for ai_user_settings (user_id required, rest has defaults) */
export interface AIUserSettingsInsert {
  user_id: string;
  ai_enabled?: boolean;
  voice_enabled?: boolean;
  proactive_suggestions?: boolean;
  morning_briefing?: boolean;
  preferred_voice_lang?: string;
}

/** Update payload for ai_user_settings */
export interface AIUserSettingsUpdate {
  ai_enabled?: boolean;
  voice_enabled?: boolean;
  proactive_suggestions?: boolean;
  morning_briefing?: boolean;
  preferred_voice_lang?: string;
  ai_onboarding_seen?: boolean;
}

// =============================================
// AI Usage (Daily Aggregates)
// =============================================

/** Valid AI feature source identifiers */
export type AIFeatureSource = 'chat' | 'briefing' | 'suggestions' | 'event_parser' | 'digest' | 'ocr' | 'recipe_parse';

/** Row from ai_usage_daily table */
export interface AIUsageDaily {
  id: string;
  user_id: string;
  space_id: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  voice_seconds: number;
  conversation_count: number;
  tool_calls_count: number;
  feature_source: AIFeatureSource;
  estimated_cost_usd: number;
  created_at: string;
}

/** Insert/upsert payload for ai_usage_daily */
export interface AIUsageDailyUpsert {
  user_id: string;
  space_id: string;
  date: string;
  input_tokens?: number;
  output_tokens?: number;
  voice_seconds?: number;
  conversation_count?: number;
  tool_calls_count?: number;
  feature_source?: AIFeatureSource;
}

// =============================================
// Service-Level Types
// =============================================

/** Conversation with its messages (joined query result) */
export interface AIConversationWithMessages extends AIConversation {
  messages: AIMessage[];
}

/** Conversation list item (for history sidebar) */
export interface AIConversationSummary {
  id: string;
  title: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  summary: string | null;
}

/** Usage summary for a date range */
export interface AIUsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_conversations: number;
  total_tool_calls: number;
  total_voice_seconds: number;
  days: number;
}

/** Token budget limits per tier */
export interface AITokenBudget {
  daily_input_tokens: number;
  daily_output_tokens: number;
  daily_voice_seconds: number;
  daily_conversations: number;
}

/** Result of a budget check */
export interface AIBudgetCheckResult {
  allowed: boolean;
  remaining_input_tokens: number;
  remaining_output_tokens: number;
  remaining_voice_seconds: number;
  remaining_conversations: number;
  reset_at: string;
  reason?: string;
  remaining?: {
    input_tokens: number;
    output_tokens: number;
  };
}
