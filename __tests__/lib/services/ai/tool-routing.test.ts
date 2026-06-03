import { describe, it, expect } from 'vitest';
import {
  selectToolDomains,
  getToolDeclarationsForMessage,
  TOOLS_BY_DOMAIN,
} from '@/lib/services/ai/tool-routing';

describe('tool-routing (Phase 10.2 intent-based subsetting)', () => {
  describe('selectToolDomains', () => {
    it('routes a single-domain shopping message to shopping', () => {
      const domains = selectToolDomains('add milk and eggs to the grocery list');
      expect(domains).toContain('shopping');
    });

    it('routes a calendar message to calendar', () => {
      expect(selectToolDomains("what's on my schedule tomorrow?")).toContain('calendar');
    });

    it('detects multi-intent messages (shopping + reminders)', () => {
      const domains = selectToolDomains('buy milk at the store and remind me to call the dentist');
      expect(domains).toContain('shopping');
      expect(domains).toContain('reminders');
    });

    it('routes budget words to budget', () => {
      expect(selectToolDomains('how much did we spend on groceries this month?')).toEqual(
        expect.arrayContaining(['budget'])
      );
    });

    it('falls back to the daily-core set when nothing matches', () => {
      const domains = selectToolDomains('hey, good morning!');
      // Core set, not empty and not all 12.
      expect(domains).toEqual(['tasks', 'calendar', 'shopping', 'reminders', 'meals']);
    });

    it('never returns an empty domain list', () => {
      expect(selectToolDomains('').length).toBeGreaterThan(0);
      expect(selectToolDomains('xyzzy plugh').length).toBeGreaterThan(0);
    });
  });

  describe('getToolDeclarationsForMessage', () => {
    it('returns a strict subset of all tools for a focused single-domain ask', () => {
      const all = Object.values(TOOLS_BY_DOMAIN).flat();
      const subset = getToolDeclarationsForMessage('add milk to the grocery list');
      expect(subset.length).toBeGreaterThan(0);
      expect(subset.length).toBeLessThan(all.length);
    });

    it('subset is exactly the union of the selected domains', () => {
      const message = 'plan dinner and add the ingredients to my shopping list';
      const domains = selectToolDomains(message);
      const expectedCount = domains.reduce((n, d) => n + TOOLS_BY_DOMAIN[d].length, 0);
      expect(getToolDeclarationsForMessage(message).length).toBe(expectedCount);
    });

    it('every returned declaration has a name (valid tool shape)', () => {
      const subset = getToolDeclarationsForMessage('create a task to mow the lawn');
      for (const decl of subset) {
        expect(typeof decl.name).toBe('string');
        expect(decl.name.length).toBeGreaterThan(0);
      }
    });
  });
});
