/**
 * Unit tests for lib/utils/share.ts
 *
 * Tests the Web Share API utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isShareSupported,
  isFileShareSupported,
  share,
  shareShoppingList,
  shareRecipe,
  shareMealPlan,
  shareGoal,
  shareProject,
  sharePage,
  copyToClipboard,
  shareOrCopy,
} from '@/lib/utils/share';

// Helper to set up navigator mocks
function mockNavigator(props: Partial<Navigator>) {
  Object.defineProperty(global, 'navigator', {
    value: props,
    writable: true,
    configurable: true,
  });
}

describe('isShareSupported', () => {
  it('should return true if navigator.share exists', () => {
    mockNavigator({ share: vi.fn() } as Partial<Navigator>);
    expect(isShareSupported()).toBe(true);
  });

  it('should return false if navigator.share does not exist', () => {
    mockNavigator({});
    expect(isShareSupported()).toBe(false);
  });
});

describe('isFileShareSupported', () => {
  it('should return true if navigator.canShare exists', () => {
    mockNavigator({ canShare: vi.fn() } as Partial<Navigator>);
    expect(isFileShareSupported()).toBe(true);
  });

  it('should return false if navigator.canShare does not exist', () => {
    mockNavigator({});
    expect(isFileShareSupported()).toBe(false);
  });
});

describe('share', () => {
  it('should return error if Web Share API is not supported', async () => {
    mockNavigator({});
    const result = await share({ title: 'Test' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Web Share API is not supported on this device');
  });

  it('should successfully share text data', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);

    const result = await share({
      title: 'Test Title',
      text: 'Test Text',
      url: 'https://example.com',
    });

    expect(result).toEqual({ success: true });
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test Title',
      text: 'Test Text',
      url: 'https://example.com',
    });
  });

  it('should return error if user cancels', async () => {
    const mockShare = vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
    mockNavigator({ share: mockShare } as Partial<Navigator>);

    const result = await share({ title: 'Test' });

    expect(result).toEqual({
      success: false,
      error: 'Share cancelled',
    });
  });

  it('should return error message if share fails', async () => {
    const mockShare = vi.fn().mockRejectedValue(new Error('Network error'));
    mockNavigator({ share: mockShare } as Partial<Navigator>);

    const result = await share({ title: 'Test' });

    expect(result).toEqual({
      success: false,
      error: 'Network error',
    });
  });
});

describe('shareShoppingList', () => {
  beforeEach(() => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);
    Object.defineProperty(global, 'window', {
      value: { location: { href: 'https://example.com/shopping' } },
      writable: true,
      configurable: true,
    });
  });

  it('should share a shopping list with formatted items', async () => {
    const result = await shareShoppingList('Groceries', ['Milk', 'Bread', 'Eggs'], 'https://example.com');

    expect(result.success).toBe(true);
  });
});

describe('shareRecipe', () => {
  beforeEach(() => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);
  });

  it('should share a recipe with description', async () => {
    const result = await shareRecipe('Pasta Carbonara', 'Delicious Italian pasta', 'https://example.com/recipe');

    expect(result.success).toBe(true);
  });
});

describe('shareMealPlan', () => {
  beforeEach(() => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);
  });

  it('should share a meal plan with formatted meals', async () => {
    const meals = [
      { day: 'Monday', meal: 'Pasta' },
      { day: 'Tuesday', meal: 'Pizza' },
    ];

    const result = await shareMealPlan('Week of Jan 1', meals, 'https://example.com');

    expect(result.success).toBe(true);
  });
});

describe('shareGoal', () => {
  beforeEach(() => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);
  });

  it('should share a goal with description', async () => {
    const result = await shareGoal('Run a marathon', 'Training for my first marathon');

    expect(result.success).toBe(true);
  });
});

describe('shareProject', () => {
  beforeEach(() => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);
  });

  it('should share a project with description', async () => {
    const result = await shareProject('Home Renovation', 'Bathroom remodel project');

    expect(result.success).toBe(true);
  });
});

describe('sharePage', () => {
  beforeEach(() => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);
    Object.defineProperty(global, 'window', {
      value: { location: { href: 'https://example.com/page' } },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'document', {
      value: { title: 'Page Title' },
      writable: true,
      configurable: true,
    });
  });

  it('should share current page with custom title and text', async () => {
    const result = await sharePage('Custom Title', 'Custom Text');

    expect(result.success).toBe(true);
  });
});

describe('copyToClipboard', () => {
  it('should successfully copy text to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ clipboard: { writeText: mockWriteText } } as Partial<Navigator>);

    const result = await copyToClipboard('Test text');

    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('Test text');
  });

  it('should return false if copy fails', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    mockNavigator({ clipboard: { writeText: mockWriteText } } as Partial<Navigator>);

    const result = await copyToClipboard('Test text');

    expect(result).toBe(false);
  });
});

describe('shareOrCopy', () => {
  it('should use native share if supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share: mockShare } as Partial<Navigator>);

    const result = await shareOrCopy({ title: 'Test', text: 'Hello' });

    expect(result).toEqual({ success: true });
  });

  it('should fallback to clipboard if share not supported', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ clipboard: { writeText: mockWriteText } } as Partial<Navigator>);

    const result = await shareOrCopy({ url: 'https://example.com' });

    expect(result).toEqual({ success: true });
    expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
  });

  it('should return error if clipboard copy fails', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    mockNavigator({ clipboard: { writeText: mockWriteText } } as Partial<Navigator>);

    const result = await shareOrCopy({ text: 'Test' });

    expect(result).toEqual({
      success: false,
      error: 'Failed to copy to clipboard',
    });
  });
});
