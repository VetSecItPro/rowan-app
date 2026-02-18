/**
 * useChat Hook — Client-side Chat State Management
 *
 * Manages the full chat lifecycle:
 * - Sending messages via SSE stream to /api/ai/chat
 * - Parsing streamed events (text, tool_call, confirmation, result, error, done)
 * - Accumulating streamed text into assistant messages
 * - Managing pending action confirmations
 * - Conversation ID generation and persistence
 */

'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import type {
  ChatMessage,
  ChatStreamEvent,
  ToolCallEvent,
  ResultEvent,
  ErrorEvent,
  ChatState,
} from '@/lib/types/chat';

// ---------------------------------------------------------------------------
// Session storage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY_MESSAGES = 'rowan-chat-messages';
const STORAGE_KEY_CONVERSATION_ID = 'rowan-chat-conversation-id';

/** Load persisted messages from localStorage, filtering out any streaming messages. */
function loadPersistedMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    // Filter out any messages that were mid-stream when the page closed
    return parsed.filter((m) => !m.isStreaming);
  } catch {
    return [];
  }
}

/** Load persisted conversationId from localStorage. */
function loadPersistedConversationId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_CONVERSATION_ID) ?? 'new';
  } catch {
    return 'new';
  }
}

/** Save messages to localStorage (non-streaming only). */
function persistMessages(messages: ChatMessage[]): void {
  try {
    const toSave = messages.filter((m) => !m.isStreaming);
    if (toSave.length === 0) {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
      return;
    }
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(toSave));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/** Save conversationId to localStorage. */
function persistConversationId(conversationId: string): void {
  try {
    if (conversationId === 'new') {
      localStorage.removeItem(STORAGE_KEY_CONVERSATION_ID);
      return;
    }
    localStorage.setItem(STORAGE_KEY_CONVERSATION_ID, conversationId);
  } catch {
    // Silently ignore
  }
}

/** Clear all chat data from localStorage. */
function clearPersistedChat(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    localStorage.removeItem(STORAGE_KEY_CONVERSATION_ID);
  } catch {
    // Silently ignore
  }
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

type ChatAction =
  | { type: 'SEND_MESSAGE'; message: string }
  | { type: 'SET_CONVERSATION_ID'; conversationId: string }
  | { type: 'STREAM_TEXT'; text: string }
  | { type: 'TOOL_CALL'; event: ToolCallEvent }
  | { type: 'RESULT'; event: ResultEvent }
  | { type: 'ERROR'; event: ErrorEvent }
  | { type: 'DONE' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_CHAT'; conversationId: string };

function createInitialState(conversationId: string): ChatState {
  return {
    messages: [],
    conversationId,
    isLoading: false,
    isStreaming: false,
    error: null,
  };
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SEND_MESSAGE': {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: action.message,
        timestamp: new Date().toISOString(),
      };
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      return {
        ...state,
        messages: [...state.messages, userMessage, assistantMessage],
        isLoading: true,
        isStreaming: true,
        error: null,
      };
    }

    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.conversationId };

    case 'STREAM_TEXT': {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
        messages[messages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + action.text,
        };
      }
      return { ...state, messages };
    }

    case 'TOOL_CALL': {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMsg,
          toolCalls: [...(lastMsg.toolCalls ?? []), action.event],
        };
      }
      return { ...state, messages };
    }

    case 'RESULT': {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMsg,
          result: action.event,
        };
      }
      return { ...state, messages };
    }

    case 'ERROR':
      return {
        ...state,
        error: action.event.message,
        isLoading: false,
        isStreaming: false,
      };

    case 'DONE': {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
        messages[messages.length - 1] = {
          ...lastMsg,
          isStreaming: false,
        };
      }
      return {
        ...state,
        messages,
        isLoading: false,
        isStreaming: false,
      };
    }

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'CLEAR_CHAT':
      return createInitialState(action.conversationId);

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// SSE stream parser
// ---------------------------------------------------------------------------

async function* parseSSEStream(
  response: Response
): AsyncGenerator<ChatStreamEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE event boundaries)
      const events = buffer.split('\n\n');
      // Last element is either empty or an incomplete event
      buffer = events.pop() ?? '';

      for (const eventStr of events) {
        const line = eventStr.trim();
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6); // Remove "data: " prefix
        try {
          const event = JSON.parse(jsonStr) as ChatStreamEvent;
          yield event;
        } catch {
          // Skip malformed events
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().slice(6);
      try {
        const event = JSON.parse(jsonStr) as ChatStreamEvent;
        yield event;
      } catch {
        // Skip
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Manages AI chat conversations including message streaming, history, and conversation lifecycle */
export function useChat(spaceId: string) {
  // Hydrate from localStorage on first render
  const persistedConvId = useRef(loadPersistedConversationId());
  const conversationIdRef = useRef(persistedConvId.current);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, dispatch] = useReducer(chatReducer, null, () => {
    const savedMessages = loadPersistedMessages();
    const initial = createInitialState(persistedConvId.current);
    if (savedMessages.length > 0) {
      return { ...initial, messages: savedMessages };
    }
    return initial;
  });

  // Persist messages to localStorage when they change (debounced)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistMessages(state.messages);
    }, 300);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [state.messages]);

  // Persist conversationId when it changes
  useEffect(() => {
    persistConversationId(state.conversationId);
  }, [state.conversationId]);

  /**
   * Process an SSE stream from the API, dispatching each event to the reducer.
   */
  const processStream = useCallback(async (response: Response) => {
    for await (const event of parseSSEStream(response)) {
      switch (event.type) {
        case 'conversation_id':
          // Server assigned/confirmed a conversation ID
          conversationIdRef.current = event.data as string;
          dispatch({ type: 'SET_CONVERSATION_ID', conversationId: event.data as string });
          break;
        case 'text':
          dispatch({ type: 'STREAM_TEXT', text: event.data as string });
          break;
        case 'tool_call':
          dispatch({ type: 'TOOL_CALL', event: event.data as ToolCallEvent });
          break;
        case 'result':
          dispatch({ type: 'RESULT', event: event.data as ResultEvent });
          break;
        case 'error':
          dispatch({ type: 'ERROR', event: event.data as ErrorEvent });
          break;
        case 'done':
          dispatch({ type: 'DONE' });
          break;
      }
    }
  }, []);

  /**
   * Send a chat message to the API and stream the response.
   */
  const sendMessage = useCallback(
    async (text: string, voiceDurationSeconds?: number) => {
      if (!text.trim() || state.isLoading) return;

      // Cancel any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      dispatch({ type: 'SEND_MESSAGE', message: text.trim() });

      try {
        const body: Record<string, unknown> = {
            message: text.trim(),
            conversationId: conversationIdRef.current,
            spaceId,
        };
        if (voiceDurationSeconds != null && voiceDurationSeconds > 0) {
          body.voiceDurationSeconds = voiceDurationSeconds;
        }
        const response = await csrfFetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          // Surface specific error types for 403 (tier) and 429 (budget)
          let errorMessage = errorData?.error ?? 'Failed to send message';
          let retryable = response.status >= 500;

          if (response.status === 403) {
            errorMessage = errorData?.upgrade_url
              ? 'AI features require a Pro or Family subscription.'
              : errorMessage;
            retryable = false;
          } else if (response.status === 429) {
            const resetAt = errorData?.reset_at;
            errorMessage = resetAt
              ? `Daily AI limit reached. Resets at ${new Date(resetAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
              : errorData?.error ?? 'Daily AI limit reached. Please try again tomorrow.';
            retryable = false;
          }

          dispatch({
            type: 'ERROR',
            event: { message: errorMessage, retryable },
          });
          dispatch({ type: 'DONE' });
          return;
        }

        await processStream(response);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // User cancelled — just stop streaming
          dispatch({ type: 'DONE' });
          return;
        }
        dispatch({
          type: 'ERROR',
          event: { message: 'Connection lost. Please try again.', retryable: true },
        });
        dispatch({ type: 'DONE' });
      }
    },
    [spaceId, state.isLoading, processStream]
  );

  /**
   * Clear the chat and start a new conversation.
   */
  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    conversationIdRef.current = 'new';
    clearPersistedChat();
    dispatch({
      type: 'CLEAR_CHAT',
      conversationId: 'new',
    });
  }, []);

  /**
   * Stop the current streaming response.
   */
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'DONE' });
  }, []);

  return {
    // State
    messages: state.messages,
    conversationId: state.conversationId,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,

    // Actions
    sendMessage,
    clearChat,
    stopStreaming,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}
