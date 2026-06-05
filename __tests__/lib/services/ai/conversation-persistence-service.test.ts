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
    // 1M input tokens = $0.30 (OpenRouter Gemini 2.5 Flash, repriced 2026-05)
    const cost = calculateCostUsd(1_000_000, 0);
    expect(cost).toBeCloseTo(0.3, 4);
  });

  it('calculates output token cost correctly', () => {
    // 1M output tokens = $2.50 (OpenRouter Gemini 2.5 Flash, repriced 2026-05)
    const cost = calculateCostUsd(0, 1_000_000);
    expect(cost).toBeCloseTo(2.5, 4);
  });

  it('combines input and output token costs', () => {
    const cost = calculateCostUsd(300_000, 80_000);
    // 300k input = 0.09 ($0.30/1M), 80k output = 0.20 ($2.50/1M)
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
    const budget = getTokenBudget('plus');
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

  it('gives the free tier its own tight teaser budget (Phase 11.6)', () => {
    const budget = getTokenBudget('free');
    // Free is a small daily AI teaser, NOT the full paid budget.
    expect(budget.daily_input_tokens).toBe(40_000);
    expect(budget.daily_conversations).toBe(5);
  });

  it('falls back to the plus budget for an unknown tier', () => {
    const budget = getTokenBudget('mystery-tier');
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

    const result = await checkBudget(supabase, 'user-1', 'plus', 'space-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining_input_tokens).toBe(300_000);
    expect(result.remaining_output_tokens).toBe(80_000);
    expect(result.reset_at).toBeDefined();
  });

  it('returns allowed=false when user has exceeded input token budget', async () => {
    // User has used all their input tokens
    const supabase = {
      from: vi.fn(() =>
        // ai_usage_daily is keyed (user_id, date, feature_source) — the per-user
        // budget now SUMS a list of rows, so the mock returns an array.
        createChainMock({
          data: [
            { input_tokens: 300_001, output_tokens: 0, voice_seconds: 0, conversation_count: 0 },
          ],
          error: null,
        })
      ),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
    expect(result.allowed).toBe(false);
    expect(result.remaining_input_tokens).toBe(0);
    expect(result.reason).toMatch(/daily AI limit/);
  });

  it('SUMS per-user usage across feature_source rows (SEC-AI-01: no .single() fail-open)', async () => {
    // Two rows for the same user+date (e.g. 'chat' + 'briefing'). The old
    // .single() would have errored on multiple rows and read usage as 0,
    // silently disabling the cap. Summing them (200K + 150K = 350K > 300K Plus
    // input budget) must block.
    const supabase = {
      from: vi.fn(() =>
        createChainMock({
          data: [
            { input_tokens: 200_000, output_tokens: 0, voice_seconds: 0, conversation_count: 0 },
            { input_tokens: 150_000, output_tokens: 0, voice_seconds: 0, conversation_count: 0 },
          ],
          error: null,
        })
      ),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed=true when spaceId is not provided and user has budget', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: null, error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
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

  it('blocks when the monthly COGS cap is exceeded (Phase 10.6)', async () => {
    // Daily usage is empty (within daily caps), but the month's summed
    // estimated_cost_usd ($5) is over the Plus monthly cap ($1.50).
    const supabase = {
      from: vi.fn(() => createChainMock({ data: [{ estimated_cost_usd: 5 }], error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/month/i);
  });

  // Monthly COGS cap is a `>=` boundary (Phase 10.6, line ~615). These pin the
  // exact edge: a user EXACTLY at the cap is blocked; one cent under is allowed.
  // Off-by-one here is real money — too loose overspends COGS, too tight cuts off
  // a paying user early. (Daily rows carry no token fields, so the daily check
  // passes and the monthly check is what decides.)
  it('blocks at EXACTLY the monthly cap ($1.50 Plus, >= boundary)', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: [{ estimated_cost_usd: 1.5 }], error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/month/i);
  });

  it('allows one cent UNDER the monthly cap ($1.49 Plus)', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: [{ estimated_cost_usd: 1.49 }], error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
    expect(result.allowed).toBe(true);
  });

  // Owner tier's monthly cap is Infinity, so the COGS check is skipped entirely
  // (Number.isFinite guard). An owner with a huge month must still be allowed.
  it('never blocks an owner on the monthly cap (Infinity skips the check)', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: [{ estimated_cost_usd: 999 }], error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'owner');
    expect(result.allowed).toBe(true);
  });

  // Only input-token exhaustion was previously covered. Output tokens are the
  // pricier half ($2.50/M vs $0.30/M), so blocking on the output ceiling matters.
  it('blocks when the daily OUTPUT token budget is exhausted', async () => {
    const supabase = {
      from: vi.fn(() =>
        createChainMock({
          data: [{ input_tokens: 0, output_tokens: 80_001, voice_seconds: 0, conversation_count: 0 }],
          error: null,
        })
      ),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'plus');
    expect(result.allowed).toBe(false);
    expect(result.remaining_output_tokens).toBe(0);
    expect(result.reason).toMatch(/daily AI limit/);
  });

  // Free-tier teaser budget (Phase 11.6): a fresh free user gets exactly the
  // tight 40K/5K daily allowance, not the Plus fallback.
  it('surfaces the tight free-tier teaser budget for a fresh free user', async () => {
    const supabase = {
      from: vi.fn(() => createChainMock({ data: null, error: null })),
    } as unknown as Parameters<typeof checkBudget>[0];

    const result = await checkBudget(supabase, 'user-1', 'free');
    expect(result.allowed).toBe(true);
    expect(result.remaining_input_tokens).toBe(40_000);
    expect(result.remaining_output_tokens).toBe(5_000);
  });
});

// ---------------------------------------------------------------------------
// recordUsage — real-token accounting persistence (Phase 10.3)
// ---------------------------------------------------------------------------

describe('recordUsage', () => {
  // recordUsage first SELECTs the existing (user_id, date, feature_source) row,
  // then either INSERTs a new row or UPDATEs (increments) the existing one. This
  // mock returns `existingRow` from .single() and captures the insert/update
  // payloads so we can assert the persisted cost + counters.
  function makeUsageMock(existingRow: unknown) {
    const insert = vi.fn(() => createChainMock({ error: null }));
    const update = vi.fn(() => createChainMock({ error: null }));
    const chain = createChainMock({ data: [], error: null });
    chain.single = vi.fn(() => Promise.resolve({ data: existingRow, error: null }));
    chain.insert = insert;
    chain.update = update;
    const supabase = { from: vi.fn(() => chain) } as unknown as Parameters<typeof recordUsage>[0];
    return { supabase, insert, update };
  }

  it('INSERTs a new row with the provider-billed cost when none exists today', async () => {
    const { supabase, insert, update } = makeUsageMock(null);

    // 1M input + 1M output on the primary Flash model:
    // 1M * $0.30/M + 1M * $2.50/M = $2.80
    await recordUsage(supabase, {
      user_id: 'user-1',
      space_id: 'space-1',
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      model_used: 'google/gemini-2.5-flash',
      conversation_count: 1,
    });

    expect(update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0] as Record<string, number | string>;
    expect(row.user_id).toBe('user-1');
    expect(row.input_tokens).toBe(1_000_000);
    expect(row.output_tokens).toBe(1_000_000);
    expect(row.estimated_cost_usd).toBeCloseTo(2.8, 6);
  });

  it('bills the fallback Flash-Lite model at its cheaper rate', async () => {
    const { supabase, insert } = makeUsageMock(null);

    // 1M input + 1M output on Flash Lite:
    // 1M * $0.10/M + 1M * $0.40/M = $0.50
    await recordUsage(supabase, {
      user_id: 'user-1',
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      model_used: 'google/gemini-2.5-flash-lite',
    });

    const row = insert.mock.calls[0][0] as Record<string, number>;
    expect(row.estimated_cost_usd).toBeCloseTo(0.5, 6);
  });

  it('INCREMENTS counters and cost onto an existing row (multi-round accumulation)', async () => {
    const { supabase, insert, update } = makeUsageMock({
      id: 'row-1',
      input_tokens: 100,
      output_tokens: 50,
      voice_seconds: 0,
      conversation_count: 1,
      tool_calls_count: 2,
      estimated_cost_usd: 0.001,
    });

    // New turn: 200 in + 100 out on primary Flash =
    // 200 * 0.30/M + 100 * 2.50/M = 0.00006 + 0.00025 = 0.00031
    await recordUsage(supabase, {
      user_id: 'user-1',
      input_tokens: 200,
      output_tokens: 100,
      model_used: 'google/gemini-2.5-flash',
      tool_calls_count: 3,
    });

    expect(insert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    const patch = update.mock.calls[0][0] as Record<string, number>;
    expect(patch.input_tokens).toBe(300); // 100 + 200
    expect(patch.output_tokens).toBe(150); // 50 + 100
    expect(patch.tool_calls_count).toBe(5); // 2 + 3
    expect(patch.estimated_cost_usd).toBeCloseTo(0.00131, 6); // 0.001 + 0.00031
  });

  it('defaults an unknown model to primary pricing (never bills $0)', async () => {
    const { supabase, insert } = makeUsageMock(null);

    await recordUsage(supabase, {
      user_id: 'user-1',
      input_tokens: 1_000_000,
      output_tokens: 0,
      model_used: 'some/unmapped-model',
    });

    // Unknown model falls back to primary Flash input rate ($0.30/M).
    const row = insert.mock.calls[0][0] as Record<string, number>;
    expect(row.estimated_cost_usd).toBeCloseTo(0.3, 6);
  });
});
