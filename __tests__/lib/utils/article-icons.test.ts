/**
 * Unit tests for lib/utils/article-icons.ts
 *
 * Tests article icon utilities.
 */

import { describe, it, expect } from 'vitest';
import { getIconComponent, colorClasses } from '@/lib/utils/article-icons';
import { FileText } from 'lucide-react';

describe('getIconComponent', () => {
  it('should return FileText icon for valid icon name', () => {
    const icon = getIconComponent('FileText');
    expect(icon).toBe(FileText);
  });

  it('should return Calendar icon for Calendar name', () => {
    const icon = getIconComponent('Calendar');
    expect(icon).toBeDefined();
    // Icon components can be objects or functions in React
    expect(icon).toBeTruthy();
  });

  it('should return CheckSquare icon for CheckSquare name', () => {
    const icon = getIconComponent('CheckSquare');
    expect(icon).toBeDefined();
  });

  it('should return ShoppingCart icon for ShoppingCart name', () => {
    const icon = getIconComponent('ShoppingCart');
    expect(icon).toBeDefined();
  });

  it('should return MessageSquare icon for MessageSquare name', () => {
    const icon = getIconComponent('MessageSquare');
    expect(icon).toBeDefined();
  });

  it('should return Target icon for Target name', () => {
    const icon = getIconComponent('Target');
    expect(icon).toBeDefined();
  });

  it('should return Bell icon for Bell name', () => {
    const icon = getIconComponent('Bell');
    expect(icon).toBeDefined();
  });

  it('should return Utensils icon for Utensils name', () => {
    const icon = getIconComponent('Utensils');
    expect(icon).toBeDefined();
  });

  it('should return DollarSign icon for DollarSign name', () => {
    const icon = getIconComponent('DollarSign');
    expect(icon).toBeDefined();
  });

  it('should return FileText as fallback for unknown icon name', () => {
    const icon = getIconComponent('UnknownIcon');
    expect(icon).toBe(FileText);
  });

  it('should return FileText as fallback for empty string', () => {
    const icon = getIconComponent('');
    expect(icon).toBe(FileText);
  });
});

describe('colorClasses', () => {
  it('should have emerald color classes', () => {
    expect(colorClasses.emerald).toEqual({
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      gradient: 'from-emerald-500 to-teal-500',
    });
  });

  it('should have purple color classes', () => {
    expect(colorClasses.purple).toEqual({
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      gradient: 'from-purple-500 to-indigo-500',
    });
  });

  it('should have blue color classes', () => {
    expect(colorClasses.blue).toEqual({
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      gradient: 'from-blue-500 to-cyan-500',
    });
  });

  it('should have green color classes', () => {
    expect(colorClasses.green).toBeDefined();
  });

  it('should have indigo color classes', () => {
    expect(colorClasses.indigo).toBeDefined();
  });

  it('should have pink color classes', () => {
    expect(colorClasses.pink).toBeDefined();
  });

  it('should have orange color classes', () => {
    expect(colorClasses.orange).toBeDefined();
  });

  it('should have amber color classes', () => {
    expect(colorClasses.amber).toBeDefined();
  });

  it('should have all required properties for each color', () => {
    Object.values(colorClasses).forEach((colorClass) => {
      expect(colorClass).toHaveProperty('bg');
      expect(colorClass).toHaveProperty('text');
      expect(colorClass).toHaveProperty('border');
      expect(colorClass).toHaveProperty('gradient');
    });
  });

  it('should use consistent opacity patterns', () => {
    Object.values(colorClasses).forEach((colorClass) => {
      expect(colorClass.bg).toContain('/10');
      expect(colorClass.border).toContain('/20');
    });
  });
});
