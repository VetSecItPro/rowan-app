/**
 * Tests for conversation-persistence-service.ts
 * Covers calculateCostUsd, getTokenBudget, and core CRUD + budget logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCostUsd,
  getTokenBudget,
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  addMessage,
  getMessages,
  getSettings,
  updateSettings,
  recordUsage,
  getUsageSummary,
  checkBudget,
} from '@/lib/services/ai/conversation-persistence-service';

// ---------------------------------------------------------------------------
// Chain mock helper
// ---------------------------------------------------------------------------

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete', 'single',
    'limit', 'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not',
    'upsert', 'match', 'or', 'filter', 'ilike', 'rpc', 'range',
  ].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const makeSupabase = (overrides: Record<string, unknown> = {}) => ({
  from: vi.fn(() => createChainMock({ data: null, error: null })),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Pure utility functions (no DB)
// ---------------------------------------------------------------------------

describe('calculateCostUsd', () => {
  it('calculates cost for zero tokens as zero', () => {
    expect(calculateCostUsd(0, 0)).toBe(0);
  });

  it('calculates input token cost correctly', () => {
    // 1M input tokens = $0.30
    const cost = calculateCostUsd(1_000_000, 0);
    expect(cost).toBeCloseTo(0.3, 4);
  });

  it('calculates output token cost correctly', () => {
    // 1M output tokens = $2.50
    const cost = calculateCostUsd(0, 1_000_000);
    expect(cost).toBeCloseTo(2.5, 4);
  });

  it('combines input and output token costs', () => {
    const cost = calculateCostUsd(300_000, 80_000);
    // 300k input = 0.09, 80k output = 0.20
    expect(cost).toBeCloseTo(0.09 + 0.2, 4);
  });

  it('rounds to 6 decimal places', () => {
    const cost = calculateCostUsd(1, 1);
    const str = cost.toString();
    const decimalPart = str.split('.')[1] || '';
    expect(decimalPart.length).toBeLessThanOrEqual(6);
  });
});

describe('getTokenBudget', () => {
  it('returns pro budget for pro tier', () => {
    const budget = getTokenBudget('pro');
    expect(budget.daily_input_tokens).toBe(300_000);
    expect(budget.daily_output_tokens).toBe(80_000);
  });

  it('returns family budget for family tier', () => {
    const budget = getTokenBudget('family');
    expect(budget.daily_voice_seconds).toBe(1_800);
    expect(budget.daily_conversations).toBe(100);
  });

  it('falls back to pro budget for unknown tier', () => {
    const budget = getTokenBudget('unknown_tier');
    expect(budget.daily_input_tokens).toBe(300_000);
  });

  it('falls back to pro budget for free tier (no AI access)', () => {
    const budget = getTokenBudget('free');
    expect(budget.daily_input_tokens).toBe(300_000);
  });
});

// ---------------------------------------------------------------------------
// createConversation
// ---------------------------------------------------------------------------

describe('createConversation', () => {
  it('returns the created conversation on success', async () => {
    const mockConversation = {
      id: 'conv-1',
      user_id: 'user-1',
      space_id: 'space-1',
      title: 'Test chat',
      model_used: 'gemini-2.5-flash',
    };

    const chain = createChainMock({ data: mockConversation, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof createConversation>[0];

    const result = await createConversation(supabase, {
      user_id: 'user-1',
      space_id: 'space-1',
      title: 'Test chat',
    });

    expect(result).toEqual(mockConversation);
    expect(supabase.from).toHaveBeenCalledWith('ai_conversations');
  });

  it('throws when the DB returns an error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'DB error' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof createConversation>[0];

    await expect(
      createConversation(supabase, { user_id: 'user-1', space_id: 'space-1' })
    ).rejects.toThrow('Failed to create conversation');
  });

  it('uses gemini-2.5-flash as default model', async () => {
    const chain = createChainMock({
      data: { id: 'conv-2', model_used: 'gemini-2.5-flash' },
      error: null,
    });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof createConversation>[0];

    const result = await createConversation(supabase, {
      user_id: 'user-1',
      space_id: 'space-1',
    });

    expect(result.model_used).toBe('gemini-2.5-flash');
  });
});

// ---------------------------------------------------------------------------
// getConversation
// ---------------------------------------------------------------------------

describe('getConversation', () => {
  it('returns the conversation when found', async () => {
    const mockConv = { id: 'conv-1', title: 'Hello' };
    const chain = createChainMock({ data: mockConv, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getConversation>[0];

    const result = await getConversation(supabase, 'conv-1');
    expect(result).toEqual(mockConv);
  });

  it('returns null when conversation is not found (PGRST116)', async () => {
    const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getConversation>[0];

    const result = await getConversation(supabase, 'nonexistent');
    expect(result).toBeNull();
  });

  it('throws for non-PGRST116 errors', async () => {
    const chain = createChainMock({ data: null, error: { code: '500', message: 'Server error' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getConversation>[0];

    await expect(getConversation(supabase, 'conv-1')).rejects.toThrow('Failed to get conversation');
  });
});

// ---------------------------------------------------------------------------
// listConversations
// ---------------------------------------------------------------------------

describe('listConversations', () => {
  it('returns a list of conversation summaries', async () => {
    const mockList = [
      { id: 'c1', title: 'First', last_message_at: '2026-02-01T00:00:00Z', message_count: 5 },
      { id: 'c2', title: 'Second', last_message_at: '2026-01-01T00:00:00Z', message_count: 2 },
    ];
    const chain = createChainMock({ data: mockList, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof listConversations>[0];

    const result = await listConversations(supabase, 'space-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
  });

  it('returns empty array when no conversations exist', async () => {
    const chain = createChainMock({ data: null, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof listConversations>[0];

    const result = await listConversations(supabase, 'space-1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof listConversations>[0];

    await expect(listConversations(supabase, 'space-1')).rejects.toThrow('Failed to list conversations');
  });
});

// ---------------------------------------------------------------------------
// updateConversation
// ---------------------------------------------------------------------------

describe('updateConversation', () => {
  it('resolves without error on successful update', async () => {
    const chain = createChainMock({ data: null, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof updateConversation>[0];

    await expect(
      updateConversation(supabase, 'conv-1', { title: 'Updated title' })
    ).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof updateConversation>[0];

    await expect(
      updateConversation(supabase, 'conv-1', { title: 'Bad' })
    ).rejects.toThrow('Failed to update conversation');
  });
});

// ---------------------------------------------------------------------------
// deleteConversation
// ---------------------------------------------------------------------------

describe('deleteConversation', () => {
  it('resolves without error on successful delete', async () => {
    const chain = createChainMock({ data: null, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof deleteConversation>[0];

    await expect(deleteConversation(supabase, 'conv-1')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof deleteConversation>[0];

    await expect(deleteConversation(supabase, 'conv-1')).rejects.toThrow('Failed to delete conversation');
  });
});

// ---------------------------------------------------------------------------
// getMessages
// ---------------------------------------------------------------------------

describe('getMessages', () => {
  it('returns messages for a conversation', async () => {
    const mockMessages = [
      { id: 'm1', role: 'user', content: 'Hello' },
      { id: 'm2', role: 'assistant', content: 'Hi there' },
    ];
    const chain = createChainMock({ data: mockMessages, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getMessages>[0];

    const result = await getMessages(supabase, 'conv-1');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no messages', async () => {
    const chain = createChainMock({ data: null, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getMessages>[0];

    const result = await getMessages(supabase, 'conv-1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getMessages>[0];

    await expect(getMessages(supabase, 'conv-1')).rejects.toThrow('Failed to get messages');
  });
});

// ---------------------------------------------------------------------------
// getSettings
// ---------------------------------------------------------------------------

describe('getSettings', () => {
  it('returns existing settings when found', async () => {
    const mockSettings = {
      id: 's1',
      user_id: 'user-1',
      ai_enabled: true,
      voice_enabled: false,
    };
    const chain = createChainMock({ data: mockSettings, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getSettings>[0];

    const result = await getSettings(supabase, 'user-1');
    expect(result.ai_enabled).toBe(true);
  });

  it('creates and returns default settings when none exist (PGRST116)', async () => {
    let callCount = 0;
    const supabase = {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call: select — not found
          return createChainMock({ data: null, error: { code: 'PGRST116' } });
        }
        // Second call: insert — success
        return createChainMock({
          data: { id: 's2', user_id: 'user-1', ai_enabled: true },
          error: null,
        });
      }),
    } as unknown as Parameters<typeof getSettings>[0];

    const result = await getSettings(supabase, 'user-1');
    expect(result.ai_enabled).toBe(true);
  });

  it('throws for non-PGRST116 DB errors', async () => {
    const chain = createChainMock({ data: null, error: { code: '500', message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getSettings>[0];

    await expect(getSettings(supabase, 'user-1')).rejects.toThrow('Failed to get AI settings');
  });
});

// ---------------------------------------------------------------------------
// updateSettings
// ---------------------------------------------------------------------------

describe('updateSettings', () => {
  it('returns updated settings on success', async () => {
    const mockSettings = {
      id: 's1',
      user_id: 'user-1',
      ai_enabled: false,
      voice_enabled: true,
    };
    const chain = createChainMock({ data: mockSettings, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof updateSettings>[0];

    const result = await updateSettings(supabase, 'user-1', { voice_enabled: true });
    expect(result.voice_enabled).toBe(true);
  });

  it('throws on DB error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof updateSettings>[0];

    await expect(
      updateSettings(supabase, 'user-1', { ai_enabled: false })
    ).rejects.toThrow('Failed to update AI settings');
  });
});

// ---------------------------------------------------------------------------
// getUsageSummary
// ---------------------------------------------------------------------------

describe('getUsageSummary', () => {
  it('sums up usage rows correctly', async () => {
    const rows = [
      { input_tokens: 1000, output_tokens: 500, voice_seconds: 60, conversation_count: 2, tool_calls_count: 3 },
      { input_tokens: 2000, output_tokens: 300, voice_seconds: 30, conversation_count: 1, tool_calls_count: 1 },
    ];
    const chain = createChainMock({ data: rows, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getUsageSummary>[0];

    const result = await getUsageSummary(supabase, 'user-1', '2026-02-01', '2026-02-22');
    expect(result.total_input_tokens).toBe(3000);
    expect(result.total_output_tokens).toBe(800);
    expect(result.total_conversations).toBe(3);
    expect(result.total_tool_calls).toBe(4);
    expect(result.total_voice_seconds).toBe(90);
    expect(result.days).toBe(2);
  });

  it('returns zeroed summary when no usage data exists', async () => {
    const chain = createChainMock({ data: null, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getUsageSummary>[0];

    const result = await getUsageSummary(supabase, 'user-1', '2026-02-01', '2026-02-22');
    expect(result.total_input_tokens).toBe(0);
    expect(result.total_output_tokens).toBe(0);
    expect(result.days).toBe(0);
  });

  it('throws on DB error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'fail' } });
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof getUsageSummary>[0];

    await expect(
      getUsageSummary(supabase, 'user-1', '2026-02-01', '2026-02-22')
    ).rejects.toThrow('Failed to get usage summary');
  });
});

// ---------------------------------------------------------------------------
// checkBudget
// ---------------------------------------------------------------------------

describe('checkBudget', () => {
  it('returns allowed=true when user is within budget', async () => {
    // Both queries return no usage (user and space)
    const supabase = {
      from: vi.fn(() => createChainMock({ data: null, error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'pro', 'space-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining_input_tokens).toBe(300_000);
    expect(result.remaining_output_tokens).toBe(80_000);
    expect(result.reset_at).toBeDefined();
  });

  it('returns allowed=false when user has exceeded input token budget', async () => {
    // User has used all their input tokens
    const supabase = {
      from: vi.fn(() =>
        createChainMock({
          data: {
            input_tokens: 300_001,
            output_tokens: 0,
            voice_seconds: 0,
            conversation_count: 0,
          },
          error: null,
        })
      ),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'pro');
    expect(result.allowed).toBe(false);
    expect(result.remaining_input_tokens).toBe(0);
    expect(result.reason).toMatch(/daily AI limit/);
  });

  it('returns allowed=true when spaceId is not provided and user has budget', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: null, error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'pro');
    expect(result.allowed).toBe(true);
  });

  it('uses pro budget as fallback for unknown tier', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: null, error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'enterprise');
    expect(result.allowed).toBe(true);
    expect(result.remaining_input_tokens).toBe(300_000);
  });
});
