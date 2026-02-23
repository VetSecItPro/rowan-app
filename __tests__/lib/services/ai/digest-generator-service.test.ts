/**
 * Tests for digest-generator-service.ts
 * Covers generateDigest (with mocked Gemini), generateFallbackDigest,
 * and JSON cleanup / schema validation logic.
 *
 * Strategy: mock @google/generative-ai so getGenerativeModel always returns
 * a fresh model object using the same mockGenerateContent function.
 * We reset the singleton's cached client+model before each test so the lazy
 * init runs again and picks up freshly queued mockResolvedValueOnce calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { digestGeneratorService, type DigestInput } from '@/lib/services/ai/digest-generator-service';

// ---------------------------------------------------------------------------
// Mock Google Generative AI
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: vi.fn(() => ({
        generateContent: mockGenerateContent,
      })),
    };
  }),
}));

// ---------------------------------------------------------------------------
// Reset singleton state before each test so the lazy init fires again
// This ensures mockGenerateContent calls land on a freshly constructed model.
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
  // Force the singleton to rebuild its client on next generateDigest call
   
  (digestGeneratorService as any).genAI = null;
   
  (digestGeneratorService as any).model = null;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A valid Gemini response — narrativeIntro must be >= 50 chars per Zod schema
const VALID_NARRATIVE =
  'Good morning! Here is a quick look at your day ahead. You have tasks due and a family dinner tonight.';
const VALID_AI_RESPONSE = JSON.stringify({
  narrativeIntro: VALID_NARRATIVE,
  closingMessage: 'Have a wonderful day!',
});

function makeResponse(text: string) {
  return { response: { text: () => text } };
}

const baseInput: DigestInput = {
  recipientName: 'Alice',
  date: '2026-02-22',
  dayOfWeek: 'Sunday',
  timeOfDay: 'morning',
  events: [],
  tasksDue: [],
  overdueTasks: [],
  meals: [],
  reminders: [],
  timezone: 'America/New_York',
};

// ---------------------------------------------------------------------------
// generateDigest
// ---------------------------------------------------------------------------

describe('digestGeneratorService.generateDigest', () => {
  it('returns success with AI-generated content for a valid response', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse(VALID_AI_RESPONSE));

    const result = await digestGeneratorService.generateDigest(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aiGenerated).toBe(true);
      expect(result.data.narrativeIntro.length).toBeGreaterThan(50);
      expect(result.data.closingMessage).toBeTruthy();
    }
  });

  it('strips ```json markdown code fences from AI response', async () => {
    const wrapped = '```json\n' + VALID_AI_RESPONSE + '\n```';
    mockGenerateContent.mockResolvedValueOnce(makeResponse(wrapped));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(true);
  });

  it('strips plain ``` code fences from AI response', async () => {
    const wrapped = '```\n' + VALID_AI_RESPONSE + '\n```';
    mockGenerateContent.mockResolvedValueOnce(makeResponse(wrapped));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(true);
  });

  it('returns failure when AI response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce(makeResponse('this is definitely not JSON {{{'));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it('returns failure when AI narrativeIntro fails Zod min-length validation', async () => {
    const badSchema = JSON.stringify({
      narrativeIntro: 'Too short.', // under 50 chars
      closingMessage: 'Bye!',
    });
    mockGenerateContent.mockResolvedValueOnce(makeResponse(badSchema));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Invalid digest data/);
    }
  });

  it('returns failure with rate-limit message when quota error is thrown', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('quota exceeded for this project'));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/rate limit/i);
    }
  });

  it('returns failure with rate-limit message when rate-limit error is thrown', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('rate limit reached'));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/rate limit/i);
    }
  });

  it('returns generic failure for unexpected errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Some unexpected network error'));

    const result = await digestGeneratorService.generateDigest(baseInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Generic errors fall through to "Failed to generate AI digest"
      expect(result.error).toMatch(/Failed to generate/i);
    }
  });
});

// ---------------------------------------------------------------------------
// generateFallbackDigest — pure logic, no external calls
// ---------------------------------------------------------------------------

describe('digestGeneratorService.generateFallbackDigest', () => {
  it('generates a clear-day message when nothing is scheduled', () => {
    const result = digestGeneratorService.generateFallbackDigest(baseInput);

    expect(result.aiGenerated).toBe(false);
    expect(result.narrativeIntro).toMatch(/Good morning, Alice/);
    expect(result.narrativeIntro).toMatch(/clear day/i);
    expect(result.closingMessage).toMatch(/Have a wonderful day/);
  });

  it('lists events, tasks, meals and reminders counts in the intro', () => {
    const input: DigestInput = {
      ...baseInput,
      events: [{ id: 'e1', title: 'Dentist', start_time: '2026-02-22T09:00:00Z' }],
      tasksDue: [
        { id: 't1', title: 'File taxes', priority: 'high' },
        { id: 't2', title: 'Buy groceries', priority: 'medium' },
      ],
      meals: [{ id: 'm1', meal_type: 'dinner', name: 'Pasta' }],
      reminders: [{ id: 'r1', title: 'Call Mom' }],
    };

    const result = digestGeneratorService.generateFallbackDigest(input);
    expect(result.narrativeIntro).toMatch(/1 event/);
    expect(result.narrativeIntro).toMatch(/2 tasks due/);
    expect(result.narrativeIntro).toMatch(/1 meal/);
    expect(result.narrativeIntro).toMatch(/1 reminder/);
  });

  it('highlights overdue tasks when present', () => {
    const input: DigestInput = {
      ...baseInput,
      overdueTasks: [{ id: 'ot1', title: 'Overdue report', priority: 'urgent' }],
    };

    const result = digestGeneratorService.generateFallbackDigest(input);
    expect(result.narrativeIntro).toMatch(/overdue/i);
  });

  it('includes first non-all-day event title and time in narrative', () => {
    const input: DigestInput = {
      ...baseInput,
      events: [
        { id: 'e1', title: 'Team Meeting', start_time: '2026-02-22T14:00:00.000Z', all_day: false },
      ],
    };

    const result = digestGeneratorService.generateFallbackDigest(input);
    expect(result.narrativeIntro).toMatch(/Team Meeting/);
    expect(result.narrativeIntro).toMatch(/Your day starts with/);
  });

  it('skips start time mention for all-day events', () => {
    const input: DigestInput = {
      ...baseInput,
      events: [
        { id: 'e1', title: 'Company Holiday', start_time: '2026-02-22', all_day: true },
      ],
    };

    const result = digestGeneratorService.generateFallbackDigest(input);
    expect(result.narrativeIntro).not.toMatch(/Your day starts with/);
  });

  it('uses afternoon greeting and closing for afternoon time of day', () => {
    const input: DigestInput = { ...baseInput, timeOfDay: 'afternoon' };
    const result = digestGeneratorService.generateFallbackDigest(input);

    expect(result.narrativeIntro).toMatch(/Good afternoon, Alice/);
    expect(result.closingMessage).toMatch(/rest of your day/);
  });

  it('uses evening greeting and closing for evening time of day', () => {
    const input: DigestInput = { ...baseInput, timeOfDay: 'evening' };
    const result = digestGeneratorService.generateFallbackDigest(input);

    expect(result.narrativeIntro).toMatch(/Good evening, Alice/);
    expect(result.closingMessage).toMatch(/evening/i);
  });
});
