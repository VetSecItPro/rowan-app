/**
 * Unit tests for lib/navigation.ts
 *
 * Tests:
 * - NAVIGATION_GROUPS structure and content
 * - NAVIGATION_ITEMS flat list
 * - NavItem shape validation
 * - All hrefs are valid paths
 * - No duplicate hrefs
 */

import { describe, it, expect } from 'vitest';
import { NAVIGATION_GROUPS, NAVIGATION_ITEMS } from '@/lib/navigation';

describe('NAVIGATION_GROUPS', () => {
  it('exports an array with at least one group', () => {
    expect(Array.isArray(NAVIGATION_GROUPS)).toBe(true);
    expect(NAVIGATION_GROUPS.length).toBeGreaterThan(0);
  });

  it('hides secondary-domain items by default (Phase 15.2: Year in Review)', () => {
    // NEXT_PUBLIC_SHOW_SECONDARY_NAV is unset in tests -> secondary items filtered out.
    const allItems = NAVIGATION_ITEMS.map((i) => i.name);
    expect(allItems).not.toContain('Year in Review');
    // Core domains remain.
    expect(allItems).toContain('Tasks & Chores');
    expect(allItems).toContain('Calendar');
    // No empty groups leak through after filtering.
    for (const group of NAVIGATION_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it('each group has a label and items array', () => {
    for (const group of NAVIGATION_GROUPS) {
      expect(typeof group.label).toBe('string');
      expect(group.label.length).toBeGreaterThan(0);
      expect(Array.isArray(group.items)).toBe(true);
    }
  });

  it('contains a "Daily" group', () => {
    const daily = NAVIGATION_GROUPS.find(g => g.label === 'Daily');
    expect(daily).toBeDefined();
  });

  it('contains a "Family" group', () => {
    const family = NAVIGATION_GROUPS.find(g => g.label === 'Family');
    expect(family).toBeDefined();
  });

  it('contains a "Household" group', () => {
    const household = NAVIGATION_GROUPS.find(g => g.label === 'Household');
    expect(household).toBeDefined();
  });

  it('contains a "Growth" group', () => {
    const growth = NAVIGATION_GROUPS.find(g => g.label === 'Growth');
    expect(growth).toBeDefined();
  });

  // PR14 (15.2): Budget is promoted to a core nav item; Projects is demoted to
  // a secondary (flag-gated) item. These guard the IA decision against regression.
  it('exposes Budget as a CORE nav item (visible by default, points at /budget)', () => {
    const budget = NAVIGATION_ITEMS.find((i) => i.href === '/budget');
    expect(budget).toBeDefined();
    expect(budget?.name).toBe('Budget');
    // Core = not secondary, so it survives the default filter.
    expect(budget?.secondary).toBeFalsy();
  });

  it('hides Projects by default (secondary) but keeps the /projects route name', () => {
    // With NEXT_PUBLIC_SHOW_SECONDARY_NAV unset, Projects is filtered out of nav.
    const visibleProjects = NAVIGATION_ITEMS.find((i) => i.href === '/projects');
    expect(visibleProjects).toBeUndefined();
  });

  it('no longer surfaces the conflated "Projects & Budget" item', () => {
    expect(NAVIGATION_ITEMS.find((i) => i.name === 'Projects & Budget')).toBeUndefined();
  });

  it('each NavItem has required fields with correct types', () => {
    for (const group of NAVIGATION_GROUPS) {
      for (const item of group.items) {
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
        expect(typeof item.href).toBe('string');
        expect(item.href.startsWith('/')).toBe(true);
        expect(typeof item.gradient).toBe('string');
        expect(typeof item.description).toBe('string');
      }
    }
  });
});

describe('NAVIGATION_ITEMS (flat list)', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NAVIGATION_ITEMS)).toBe(true);
    expect(NAVIGATION_ITEMS.length).toBeGreaterThan(0);
  });

  it('contains all items from all groups', () => {
    const totalGroupItems = NAVIGATION_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
    expect(NAVIGATION_ITEMS.length).toBe(totalGroupItems);
  });

  it('contains Tasks item', () => {
    const tasks = NAVIGATION_ITEMS.find(i => i.href === '/tasks');
    expect(tasks).toBeDefined();
    expect(tasks?.name).toBe('Tasks & Chores');
  });

  it('contains Calendar item', () => {
    const cal = NAVIGATION_ITEMS.find(i => i.href === '/calendar');
    expect(cal).toBeDefined();
  });

  it('contains Messages item', () => {
    const msg = NAVIGATION_ITEMS.find(i => i.href === '/messages');
    expect(msg).toBeDefined();
  });

  it('contains Goals item', () => {
    const goals = NAVIGATION_ITEMS.find(i => i.href === '/goals');
    expect(goals).toBeDefined();
  });

  it('contains Shopping item', () => {
    const shopping = NAVIGATION_ITEMS.find(i => i.href === '/shopping');
    expect(shopping).toBeDefined();
  });

  it('does not contain duplicate hrefs (excluding hash-based hrefs)', () => {
    const hrefs = NAVIGATION_ITEMS.map(i => i.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  it('all hrefs start with /', () => {
    for (const item of NAVIGATION_ITEMS) {
      expect(item.href.startsWith('/')).toBe(true);
    }
  });

  it('all gradients are non-empty strings', () => {
    for (const item of NAVIGATION_ITEMS) {
      expect(typeof item.gradient).toBe('string');
      expect(item.gradient.length).toBeGreaterThan(0);
    }
  });

  it('all descriptions are non-empty strings', () => {
    for (const item of NAVIGATION_ITEMS) {
      expect(typeof item.description).toBe('string');
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});
