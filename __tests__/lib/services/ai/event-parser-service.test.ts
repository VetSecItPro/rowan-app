import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock GoogleGenerativeAI with class constructor
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn();
  const MockModel = {
    generateContent: mockGenerateContent,
  };

  function MockGoogleGenerativeAI() {
    return {
      getGenerativeModel: vi.fn().mockReturnValue(MockModel),
    };
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    SchemaType: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
    },
    __mockGenerateContent: mockGenerateContent,
  };
});

// Helper to get the mock
async function getMockGenerateContent() {
  const mod = await import('@google/generative-ai');
  return (mod as unknown as { __mockGenerateContent: ReturnType<typeof vi.fn> }).__mockGenerateContent;
}

function mockSuccessResponse(eventData: Record<string, unknown>) {
  return {
    response: {
      text: () => JSON.stringify(eventData),
    },
  };
}

describe('EventParserService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
    // Reset the singleton's internal client by reimporting (handled via vi.resetModules on each test)
  });

  describe('parseEventText()', () => {
    it('should return error for empty text', async () => {
      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No text provided');
      }
    });

    it('should return error for whitespace-only text', async () => {
      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('   ');

      expect(result.success).toBe(false);
    });

    it('should return error when text exceeds 10000 characters', async () => {
      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('a'.repeat(10001));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('too long');
      }
    });

    it('should parse a valid event response from AI', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue(
        mockSuccessResponse({
          title: 'Team Meeting',
          startTime: '2026-02-25T10:00:00',
          endTime: '2026-02-25T11:00:00',
          duration: 60,
          category: 'work',
          confidence: 0.95,
        })
      );

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText(
        'Team meeting on Tuesday Feb 25 at 10am for 1 hour'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Team Meeting');
        expect(result.data.category).toBe('work');
        expect(result.data.confidence).toBe(0.95);
      }
    });

    it('should strip markdown code blocks from AI response', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue({
        response: {
          text: () =>
            '```json\n' +
            JSON.stringify({
              title: 'Doctor Visit',
              category: 'health',
              confidence: 0.8,
            }) +
            '\n```',
        },
      });

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Doctor appointment on Monday');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Doctor Visit');
      }
    });

    it('should handle AI returning non-JSON response', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue({
        response: {
          text: () => 'This is not JSON at all!',
        },
      });

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Some event text');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not valid JSON');
      }
    });

    it('should handle Zod validation failure (missing required confidence field)', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue(
        mockSuccessResponse({
          title: 'Birthday Party',
          // confidence is required but missing
        })
      );

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Birthday party next week');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid event data');
      }
    });

    it('should handle API key error gracefully', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockRejectedValue(new Error('API key not valid'));

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Some event text');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('configuration error');
      }
    });

    it('should handle rate limit error gracefully', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockRejectedValue(new Error('quota exceeded'));

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Some event text');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('rate limit');
      }
    });

    it('should handle general AI error gracefully', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockRejectedValue(new Error('Service temporarily unavailable'));

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Some event text');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to parse event text');
      }
    });

    it('should pass timezone and referenceDate to prompt', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue(
        mockSuccessResponse({
          title: 'Meeting',
          confidence: 0.9,
        })
      );

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const refDate = new Date('2026-03-01T09:00:00Z');
      await eventParserService.parseEventText('Team standup', {
        timezone: 'America/Los_Angeles',
        referenceDate: refDate,
      });

      const callArg = mockFn.mock.calls[0][0] as string;
      expect(callArg).toContain('America/Los_Angeles');
      expect(callArg).toContain(refDate.toISOString());
    });

    it('should validate confidence is between 0 and 1', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue(
        mockSuccessResponse({
          title: 'Event',
          confidence: 1.5, // > 1, invalid
        })
      );

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEventText('Some event');

      expect(result.success).toBe(false);
    });
  });

  describe('parseEmail()', () => {
    it('should clean email signatures before parsing', async () => {
      const mockFn = await getMockGenerateContent();
      mockFn.mockResolvedValue(
        mockSuccessResponse({
          title: 'Quarterly Review',
          category: 'work',
          confidence: 0.9,
        })
      );

      const emailContent = `
Meeting: Quarterly Review
Date: March 15 at 2pm
Location: Conference Room B

--
John Smith
Senior Manager
Sent from my iPhone
      `.trim();

      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEmail(emailContent);

      // Should have been processed
      expect(result.success).toBe(true);
      // Verify signature content was not passed to AI
      const callArg = mockFn.mock.calls[0][0] as string;
      expect(callArg).not.toContain('Sent from my iPhone');
    });

    it('should handle empty email gracefully', async () => {
      const { eventParserService } = await import('@/lib/services/ai/event-parser-service');
      const result = await eventParserService.parseEmail('');

      expect(result.success).toBe(false);
    });
  });
});
