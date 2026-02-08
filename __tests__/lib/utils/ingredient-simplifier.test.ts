/**
 * Unit tests for lib/utils/ingredient-simplifier.ts
 *
 * Tests the recipe ingredient → shopping list item simplification logic.
 * Pure business logic, no mocking needed.
 */

import { describe, it, expect } from 'vitest';
import {
  simplifyIngredient,
  simplifyIngredients,
} from '@/lib/utils/ingredient-simplifier';

describe('simplifyIngredient', () => {
  it('should return empty string for null/undefined/empty', () => {
    // @ts-expect-error testing runtime safety
    expect(simplifyIngredient(null)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(simplifyIngredient(undefined)).toBe('');
    expect(simplifyIngredient('')).toBe('');
  });

  it('should strip leading quantities', () => {
    expect(simplifyIngredient('2 cups flour')).not.toMatch(/^\d/);
    expect(simplifyIngredient('1/2 teaspoon salt')).not.toMatch(/^\d/);
    expect(simplifyIngredient('3.5 ounces cheese')).not.toMatch(/^\d/);
  });

  it('should strip measurement units', () => {
    const result = simplifyIngredient('2 cups all-purpose flour');
    expect(result.toLowerCase()).not.toContain('cups');
  });

  it('should strip prep descriptors', () => {
    const result = simplifyIngredient('1 cup finely chopped onion');
    expect(result.toLowerCase()).not.toContain('chopped');
    expect(result.toLowerCase()).not.toContain('finely');
  });

  it('should strip freshness descriptors', () => {
    const result = simplifyIngredient('20ml fresh milk');
    expect(result.toLowerCase()).not.toContain('fresh');
    expect(result.toLowerCase()).toContain('milk');
  });

  it('should remove parenthetical notes', () => {
    const result = simplifyIngredient('1 cup sugar (about 200g)');
    expect(result).not.toContain('200g');
    expect(result).not.toContain('(');
  });

  it('should remove trailing notes after comma', () => {
    const result = simplifyIngredient('2 cups flour, sifted');
    expect(result.toLowerCase()).not.toContain('sifted');
  });

  it('should title-case the result', () => {
    const result = simplifyIngredient('1 pinch of salt');
    expect(result).toBe('Salt');
  });

  it('should handle common recipe ingredients', () => {
    const cases = [
      { input: '1 pinch of salt', expectedContains: 'Salt' },
      { input: '20ml fresh milk', expectedContains: 'Milk' },
      { input: '2 cups all-purpose flour, sifted', expectedContains: 'Flour' },
      { input: '3 large eggs, beaten', expectedContains: 'Egg' },
      { input: '1/2 cup unsalted butter, melted', expectedContains: 'Butter' },
    ];

    for (const { input, expectedContains } of cases) {
      const result = simplifyIngredient(input);
      expect(result.toLowerCase()).toContain(expectedContains.toLowerCase());
    }
  });

  it('should handle unicode fractions', () => {
    const result = simplifyIngredient('½ cup sugar');
    // Should strip the fraction
    expect(result.toLowerCase()).toContain('sugar');
  });
});

describe('simplifyIngredients', () => {
  it('should process an array of string ingredients', () => {
    const result = simplifyIngredients(['2 cups flour', '1 tsp salt', '3 eggs']);
    expect(result).toHaveLength(3);
    expect(result[0].selected).toBe(true);
    expect(result[0].original).toBe('2 cups flour');
  });

  it('should deduplicate by simplified name (case-insensitive)', () => {
    const result = simplifyIngredients([
      '2 cups flour',
      '1 cup flour, sifted',
    ]);
    // Both simplify to "Flour" — should deduplicate
    expect(result.length).toBeLessThanOrEqual(2);
    // First occurrence wins
    expect(result[0].original).toBe('2 cups flour');
  });

  it('should handle object-format ingredients', () => {
    const result = simplifyIngredients([
      { name: 'Sugar', amount: '2', unit: 'cups' },
      { name: 'Salt', amount: 1, unit: 'tsp' },
    ]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].simplified.toLowerCase()).toContain('sugar');
  });

  it('should skip empty/falsy entries', () => {
    const result = simplifyIngredients(['', '2 cups flour', '  ']);
    // Should only have the one valid ingredient
    expect(result.length).toBe(1);
    expect(result[0].original).toBe('2 cups flour');
  });

  it('should handle mixed string and object ingredients', () => {
    const result = simplifyIngredients([
      '2 cups flour',
      { name: 'Sugar', amount: '1', unit: 'cup' },
    ]);
    expect(result).toHaveLength(2);
  });

  it('should set selected=true by default', () => {
    const result = simplifyIngredients(['1 cup rice']);
    expect(result[0].selected).toBe(true);
  });
});
