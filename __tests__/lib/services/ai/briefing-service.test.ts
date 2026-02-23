import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/services/ai/ai-context-service', () => ({
  aiContextService: {
    buildFullContext: vi.fn(),
  },
}));

vi.mock('@/lib/services/ai/digest-generator-service', () => ({
  digestGeneratorService: {
    generateDigest: vi.fn(),
    generateFallbackDigest: vi.fn(),
  },
}));

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  email: 'alice@example.com',
  user_metadata: { name: 'Alice' },
};

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('February 22, 2026'),
}));

function createSupabaseMock() {
  // Each .from() call needs its own chain that resolves independently
  function makeChain() {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'in', 'lt', 'gte', 'lte', 'order', 'limit', 'single', 'maybeSingle'].forEach((m) => {
      chain[m] = vi.fn(handler);
    });
    chain.then = vi.fn((resolve: (v: unknown) => unknown) =>
      resolve({ data: [], error: null })
    );
    return chain;
  }
  return {
    from: vi.fn(() => makeChain()),
  };
}

describe('BriefingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return AI-generated briefing on success', async () => {
    const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
    vi.mocked(aiContextService.buildFullContext).mockResolvedValue({
      spaceId: SPACE_ID,
      spaceName: 'Smith Family',
      members: [],
      timezone: 'America/New_York',
      userName: 'Alice',
      userId: USER.id,
      summary: {
        taskCounts: { total: 5, pending: 3, overdue: 1, dueToday: 2 },
        budgetRemaining: null,
        activeGoals: 1,
        choreStats: { total: 3, pending: 1 },
        shoppingLists: [],
        upcomingEvents: [{ title: 'Doctor appointment', startTime: '2026-02-25T10:00:00Z' }],
      },
      recentActivity: {
        completedTasks: [{ title: 'Cleaned kitchen', completedAt: '2026-02-22' }],
        newExpenses: [],
        upcomingEvents: [],
      },
    });

    const { digestGeneratorService } = await import('@/lib/services/ai/digest-generator-service');
    vi.mocked(digestGeneratorService.generateDigest).mockResolvedValue({
      success: true,
      data: {
        narrativeIntro: "Good morning! Here's your daily briefing...",
        taskSummary: '',
        eventSummary: '',
        mealPlan: '',
        priorityAlert: '',
      },
    } as unknown as Awaited<ReturnType<typeof digestGeneratorService.generateDigest>>);

    const { briefingService } = await import('@/lib/services/ai/briefing-service');

    const supabase = createSupabaseMock();
    const result = await briefingService.generateBriefing(
      supabase as unknown as Parameters<typeof briefingService.generateBriefing>[0],
      SPACE_ID,
      USER
    );

    expect(result.aiGenerated).toBe(true);
    expect(result.greeting).toContain('Alice');
    expect(result.briefingText).toContain("Good morning");
    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
  });

  it('should include highlight for dueToday tasks', async () => {
    const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
    vi.mocked(aiContextService.buildFullContext).mockResolvedValue({
      spaceId: SPACE_ID,
      spaceName: 'Smith Family',
      members: [],
      timezone: 'America/New_York',
      userName: 'Alice',
      userId: USER.id,
      summary: {
        taskCounts: { total: 5, pending: 3, overdue: 0, dueToday: 3 },
        budgetRemaining: null,
        activeGoals: 0,
        choreStats: { total: 0, pending: 0 },
        shoppingLists: [],
        upcomingEvents: [],
      },
      recentActivity: {
        completedTasks: [],
        newExpenses: [],
        upcomingEvents: [],
      },
    });

    const { digestGeneratorService } = await import('@/lib/services/ai/digest-generator-service');
    vi.mocked(digestGeneratorService.generateDigest).mockResolvedValue({
      success: true,
      data: { narrativeIntro: 'Briefing text.' },
    } as unknown as Awaited<ReturnType<typeof digestGeneratorService.generateDigest>>);

    const { briefingService } = await import('@/lib/services/ai/briefing-service');
    const supabase = createSupabaseMock();
    const result = await briefingService.generateBriefing(
      supabase as unknown as Parameters<typeof briefingService.generateBriefing>[0],
      SPACE_ID,
      USER
    );

    expect(result.highlights.some((h) => h.includes('due today'))).toBe(true);
  });

  it('should fall back to non-AI briefing when digest fails', async () => {
    const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
    vi.mocked(aiContextService.buildFullContext).mockResolvedValue({
      spaceId: SPACE_ID,
      spaceName: 'Smith Family',
      members: [],
      timezone: 'America/New_York',
      userName: 'Alice',
      userId: USER.id,
      summary: {
        taskCounts: { total: 0, pending: 0, overdue: 0, dueToday: 0 },
        budgetRemaining: null,
        activeGoals: 0,
        choreStats: { total: 0, pending: 0 },
        shoppingLists: [],
        upcomingEvents: [],
      },
      recentActivity: { completedTasks: [], newExpenses: [], upcomingEvents: [] },
    });

    const { digestGeneratorService } = await import('@/lib/services/ai/digest-generator-service');
    vi.mocked(digestGeneratorService.generateDigest).mockResolvedValue({
      success: false,
      error: 'AI quota exceeded',
    } as unknown as Awaited<ReturnType<typeof digestGeneratorService.generateDigest>>);
    vi.mocked(digestGeneratorService.generateFallbackDigest).mockReturnValue({
      narrativeIntro: "Here's your day at a glance.",
    } as unknown as ReturnType<typeof digestGeneratorService.generateFallbackDigest>);

    const { briefingService } = await import('@/lib/services/ai/briefing-service');
    const supabase = createSupabaseMock();
    const result = await briefingService.generateBriefing(
      supabase as unknown as Parameters<typeof briefingService.generateBriefing>[0],
      SPACE_ID,
      USER
    );

    expect(result.aiGenerated).toBe(false);
    expect(result.briefingText).toBe("Here's your day at a glance.");
  });

  it('should return fallback briefing on unexpected error', async () => {
    const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
    vi.mocked(aiContextService.buildFullContext).mockRejectedValue(new Error('DB error'));

    const { briefingService } = await import('@/lib/services/ai/briefing-service');
    const supabase = createSupabaseMock();
    const result = await briefingService.generateBriefing(
      supabase as unknown as Parameters<typeof briefingService.generateBriefing>[0],
      SPACE_ID,
      USER
    );

    expect(result.aiGenerated).toBe(false);
    expect(result.greeting).toContain('Alice');
    expect(result.briefingText).toBeTruthy();
  });

  it('should use email username when no name in user_metadata', async () => {
    const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
    vi.mocked(aiContextService.buildFullContext).mockRejectedValue(new Error('error'));

    const { briefingService } = await import('@/lib/services/ai/briefing-service');
    const supabase = createSupabaseMock();
    const result = await briefingService.generateBriefing(
      supabase as unknown as Parameters<typeof briefingService.generateBriefing>[0],
      SPACE_ID,
      { id: 'user-2', email: 'bob.smith@example.com' }
    );

    expect(result.greeting).toContain('bob.smith');
  });

  it('greeting should include time of day context', async () => {
    const { aiContextService } = await import('@/lib/services/ai/ai-context-service');
    vi.mocked(aiContextService.buildFullContext).mockRejectedValue(new Error('error'));

    const { briefingService } = await import('@/lib/services/ai/briefing-service');
    const supabase = createSupabaseMock();
    const result = await briefingService.generateBriefing(
      supabase as unknown as Parameters<typeof briefingService.generateBriefing>[0],
      SPACE_ID,
      USER
    );

    // Greeting should contain morning, afternoon, or evening
    expect(result.greeting).toMatch(/good (morning|afternoon|evening)/i);
  });
});
