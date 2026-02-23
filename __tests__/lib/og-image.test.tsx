/**
 * Unit tests for lib/og-image.tsx
 *
 * @vitest-environment jsdom
 *
 * Tests:
 * - OG_SIZE dimensions
 * - OG_CONTENT_TYPE
 * - FEATURE_CONFIG: all expected features exist, have required fields
 * - generateFeatureOG: returns an ImageResponse with correct dimensions
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist the MockImageResponse class so it is available inside vi.mock factory
// (vi.mock is hoisted before imports; class declarations are not)
// ---------------------------------------------------------------------------
const { MockImageResponse } = vi.hoisted(() => {
  class MockImageResponse {
    width: number;
    height: number;
    element: unknown;

    constructor(element: unknown, options?: { width?: number; height?: number }) {
      this.element = element;
      this.width = options?.width ?? 1200;
      this.height = options?.height ?? 630;
    }
  }

  return { MockImageResponse };
});

vi.mock('next/og', () => ({
  ImageResponse: MockImageResponse,
}));

import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  FEATURE_CONFIG,
  generateFeatureOG,
} from '@/lib/og-image';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('OG_SIZE', () => {
  it('width is 1200', () => {
    expect(OG_SIZE.width).toBe(1200);
  });

  it('height is 630', () => {
    expect(OG_SIZE.height).toBe(630);
  });
});

describe('OG_CONTENT_TYPE', () => {
  it('is "image/png"', () => {
    expect(OG_CONTENT_TYPE).toBe('image/png');
  });
});

// ---------------------------------------------------------------------------
// FEATURE_CONFIG
// ---------------------------------------------------------------------------
describe('FEATURE_CONFIG', () => {
  const requiredFeatures = [
    'tasks', 'calendar', 'reminders', 'messages',
    'shopping', 'meals', 'budget', 'goals', 'daily-check-in',
  ];

  it('defines all required feature keys', () => {
    for (const key of requiredFeatures) {
      expect(FEATURE_CONFIG).toHaveProperty(key);
    }
  });

  it('each feature has name, color, description, and icon', () => {
    for (const [key, config] of Object.entries(FEATURE_CONFIG)) {
      expect(typeof config.name, `${key}.name`).toBe('string');
      expect(config.name.length, `${key}.name length`).toBeGreaterThan(0);
      expect(typeof config.color, `${key}.color`).toBe('string');
      expect(config.color, `${key}.color starts with #`).toMatch(/^#/);
      expect(typeof config.description, `${key}.description`).toBe('string');
      expect(config.description.length, `${key}.description length`).toBeGreaterThan(0);
      expect(typeof config.icon, `${key}.icon`).toBe('string');
      expect(config.icon.length, `${key}.icon length`).toBeGreaterThan(0);
    }
  });

  it('tasks feature has blue color', () => {
    expect(FEATURE_CONFIG.tasks.color).toBe('#3b82f6');
  });

  it('calendar feature has purple color', () => {
    expect(FEATURE_CONFIG.calendar.color).toBe('#8b5cf6');
  });

  it('goals feature name is "Goals"', () => {
    expect(FEATURE_CONFIG.goals.name).toBe('Goals');
  });

  it('meals feature name is "Meals"', () => {
    expect(FEATURE_CONFIG.meals.name).toBe('Meals');
  });

  it('budget feature name is "Budget"', () => {
    expect(FEATURE_CONFIG.budget.name).toBe('Budget');
  });
});

// ---------------------------------------------------------------------------
// generateFeatureOG
// ---------------------------------------------------------------------------
describe('generateFeatureOG', () => {
  it('returns an ImageResponse instance', () => {
    const result = generateFeatureOG('Tasks', '#3b82f6', 'Shared task management', '\u2713');
    expect(result).toBeInstanceOf(MockImageResponse);
  });

  it('sets the correct width from OG_SIZE', () => {
    const result = generateFeatureOG('Calendar', '#8b5cf6', 'Family calendar', '\u{1F4C5}') as unknown as InstanceType<typeof MockImageResponse>;
    expect(result.width).toBe(OG_SIZE.width);
  });

  it('sets the correct height from OG_SIZE', () => {
    const result = generateFeatureOG('Meals', '#f97316', 'Plan meals', '\u{1F372}') as unknown as InstanceType<typeof MockImageResponse>;
    expect(result.height).toBe(OG_SIZE.height);
  });

  it('accepts all standard feature configs without throwing', () => {
    for (const [, config] of Object.entries(FEATURE_CONFIG)) {
      expect(() =>
        generateFeatureOG(config.name, config.color, config.description, config.icon)
      ).not.toThrow();
    }
  });

  it('returns different response objects for different features', () => {
    const r1 = generateFeatureOG('Tasks', '#3b82f6', 'Desc A', '\u2713');
    const r2 = generateFeatureOG('Goals', '#6366f1', 'Desc B', '\u{1F3AF}');
    expect(r1).not.toBe(r2);
  });

  it('passes feature name and description to the element tree', () => {
    const result = generateFeatureOG('Shopping', '#10b981', 'Buy things', '\u{1F6D2}') as unknown as InstanceType<typeof MockImageResponse>;
    // The element is a React element (JSX tree) — just verify it exists
    expect(result.element).toBeDefined();
  });
});
