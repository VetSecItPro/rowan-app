/**
 * Types for the Rowan AI Chat Assistant
 * Supports conversational entity creation across all features
 */

// Chat message roles
export type ChatRole = 'user' | 'assistant' | 'system';

// The types of events that can stream from the server
export type ChatStreamEventType = 'text' | 'tool_call' | 'result' | 'error' | 'done' | 'conversation_id';

// A single streamed event from the server
export interface ChatStreamEvent {
  type: ChatStreamEventType;
  data: string | ToolCallEvent | ResultEvent | ErrorEvent;
}

// When the AI wants to call a tool (service method)
export interface ToolCallEvent {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
}

// After a tool executes
export interface ResultEvent {
  id: string;
  toolName: string;
  success: boolean;
  data?: Record<string, unknown>;
  message: string;
}

// Error from the AI or tool execution
export interface ErrorEvent {
  message: string;
  retryable: boolean;
}

// Feature types for color-coding and routing
export type FeatureType =
  | 'task'
  | 'chore'
  | 'event'
  | 'reminder'
  | 'shopping'
  | 'meal'
  | 'goal'
  | 'expense'
  | 'budget'
  | 'project'
  | 'reward'
  | 'message'
  | 'general';

// Feature color mapping (matches app feature colors)
export const FEATURE_COLORS: Record<FeatureType, string> = {
  task: 'blue',
  chore: 'amber',
  event: 'purple',
  reminder: 'pink',
  shopping: 'emerald',
  meal: 'orange',
  goal: 'indigo',
  expense: 'red',
  budget: 'green',
  project: 'cyan',
  reward: 'yellow',
  message: 'green',
  general: 'gray',
};

// A single chat message in the conversation
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  // Tool call data (when assistant wants to execute an action)
  toolCalls?: ToolCallEvent[];
  // Result of executed action
  result?: ResultEvent;
  // Whether this message is currently streaming
  isStreaming?: boolean;
  // User feedback on assistant messages
  feedback?: 'positive' | 'negative' | null;
}

// A conversation session
export interface ChatConversation {
  id: string;
  spaceId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Chat input sent to the API
export interface ChatRequest {
  message: string;
  conversationId: string;
  spaceId: string;
}

// State shape for the useChat hook
export interface ChatState {
  messages: ChatMessage[];
  conversationId: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

// Space member info passed to AI for context
export interface ChatSpaceMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
}
