import { describe, it, expect } from 'vitest';
import {
  detectPIIInUserInput,
  redactPII,
  sanitizeContextForLLM,
} from '@/lib/services/ai/ai-privacy-service';
import type { SpaceContext } from '@/lib/services/ai/system-prompt';

describe('AI Privacy Service', () => {
  describe('detectPIIInUserInput()', () => {
    it('should detect SSN patterns', () => {
      const result = detectPIIInUserInput('My SSN is 123-45-6789');

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain('ssn');
      expect(result.warningMessage).toBeDefined();
    });

    it('should detect credit card numbers', () => {
      const result = detectPIIInUserInput('Card number: 4111 1111 1111 1111');

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain('credit_card');
    });

    it('should detect phone numbers', () => {
      const result = detectPIIInUserInput('Call me at (555) 123-4567');

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain('phone');
    });

    it('should detect email addresses', () => {
      const result = detectPIIInUserInput('Email me at john.doe@example.com');

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain('email');
    });

    it('should detect bank routing number pattern', () => {
      const result = detectPIIInUserInput('routing 123456789 my bank');

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain('routing_number');
    });

    it('should detect date of birth', () => {
      const result = detectPIIInUserInput('dob: 01/15/1990');

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain('dob');
    });

    it('should return hasPII=false for clean messages', () => {
      const result = detectPIIInUserInput('What tasks are due today?');

      expect(result.hasPII).toBe(false);
      expect(result.types).toHaveLength(0);
      expect(result.warningMessage).toBeUndefined();
    });

    it('should return a warningMessage listing detected types', () => {
      const result = detectPIIInUserInput('My SSN is 123-45-6789');

      expect(result.warningMessage).toContain('Social Security Number');
    });

    it('should detect multiple PII types and list all in warning', () => {
      const result = detectPIIInUserInput(
        'My email is test@example.com and my phone is 555-123-4567'
      );

      expect(result.hasPII).toBe(true);
      expect(result.types.length).toBeGreaterThanOrEqual(2);
      expect(result.warningMessage).toBeDefined();
    });
  });

  describe('redactPII()', () => {
    it('should replace SSN with [REDACTED]', () => {
      const result = redactPII('SSN: 123-45-6789');

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('123-45-6789');
    });

    it('should replace phone numbers with [REDACTED]', () => {
      const result = redactPII('Call 555-123-4567');

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('555-123-4567');
    });

    it('should replace email addresses with [REDACTED]', () => {
      const result = redactPII('email: test@example.com');

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('test@example.com');
    });

    it('should leave non-PII text intact', () => {
      const input = 'Show me my overdue tasks';
      const result = redactPII(input);

      expect(result).toBe(input);
    });

    it('should handle multiple PII instances', () => {
      const result = redactPII('SSN 123-45-6789 and card 4111 1111 1111 1111');

      expect(result).not.toContain('123-45-6789');
      expect(result).not.toContain('4111 1111 1111 1111');
    });
  });

  describe('sanitizeContextForLLM()', () => {
    const makeContext = (overrides: Partial<SpaceContext> = {}): SpaceContext => ({
      spaceId: 'space-1',
      spaceName: 'The Smith Family',
      members: [
        { id: 'user-1', displayName: 'Alice', role: 'owner' },
      ],
      timezone: 'America/New_York',
      userName: 'Alice',
      userId: 'user-1',
      ...overrides,
    });

    it('should not modify clean context', () => {
      const context = makeContext();
      const result = sanitizeContextForLLM(context);

      expect(result.spaceName).toBe('The Smith Family');
      expect(result.userName).toBe('Alice');
      expect(result.spaceId).toBe('space-1');
    });

    it('should redact sensitive field names', () => {
      const context = makeContext({
         
        token: 'secret-token-abc123',
      } as unknown as Partial<SpaceContext>);

      const result = sanitizeContextForLLM(context);

      // The token field should be redacted
      expect((result as unknown as Record<string, unknown>).token).toBe('[REDACTED]');
    });

    it('should return a deep clone, not mutate the original', () => {
      const context = makeContext();
      const result = sanitizeContextForLLM(context);

      result.spaceName = 'Modified';
      expect(context.spaceName).toBe('The Smith Family');
    });

    it('should handle nested objects', () => {
      const context = makeContext({
        members: [
          {
            id: 'user-1',
            displayName: 'Alice',
            role: 'owner',
            // Adding a field that simulates PII in nested object
          },
        ],
      });

      const result = sanitizeContextForLLM(context);

      expect(result.members).toBeDefined();
      expect(result.members.length).toBe(1);
    });

    it('should handle null/undefined gracefully', () => {
      const context = makeContext({
        recentTasks: undefined,
        upcomingEvents: undefined,
      });

      expect(() => sanitizeContextForLLM(context)).not.toThrow();
    });
  });
});
