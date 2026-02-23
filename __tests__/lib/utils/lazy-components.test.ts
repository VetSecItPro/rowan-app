/**
 * Unit tests for lib/utils/lazy-components.ts
 *
 * Tests lazy-loaded component utilities.
 * Note: These are primarily type-checking and exports tests since dynamic imports
 * are handled by Next.js at runtime.
 */

import { describe, it, expect } from 'vitest';
import * as LazyComponents from '@/lib/utils/lazy-components';

describe('lazy-components exports', () => {
  it('should export project modal components', () => {
    expect(LazyComponents.LazyNewProjectModal).toBeDefined();
    expect(LazyComponents.LazyNewExpenseModal).toBeDefined();
    expect(LazyComponents.LazyNewBudgetModal).toBeDefined();
    expect(LazyComponents.LazyNewBillModal).toBeDefined();
    expect(LazyComponents.LazyBudgetTemplateModal).toBeDefined();
    expect(LazyComponents.LazyReceiptUploadModal).toBeDefined();
  });

  it('should export shared modal components', () => {
    expect(LazyComponents.LazyUnifiedItemModal).toBeDefined();
    expect(LazyComponents.LazyUnifiedDetailsModal).toBeDefined();
    expect(LazyComponents.LazyConfirmDialog).toBeDefined();
  });

  it('should export task components', () => {
    expect(LazyComponents.LazyTaskFilterPanel).toBeDefined();
    expect(LazyComponents.LazyBulkActionsBar).toBeDefined();
    expect(LazyComponents.LazyTaskTemplatePickerModal).toBeDefined();
    expect(LazyComponents.LazyDraggableItemList).toBeDefined();
  });

  it('should export shopping components', () => {
    expect(LazyComponents.LazyNewShoppingListModal).toBeDefined();
    expect(LazyComponents.LazySaveTemplateModal).toBeDefined();
    expect(LazyComponents.LazyShoppingTemplatePickerModal).toBeDefined();
    expect(LazyComponents.LazyScheduleTripModal).toBeDefined();
  });

  it('should export analytics components', () => {
    expect(LazyComponents.LazySpendingInsightsCard).toBeDefined();
    expect(LazyComponents.LazyReceiptsListCard).toBeDefined();
  });

  it('should export all lazy components', () => {
    const exportedKeys = Object.keys(LazyComponents);
    // Verify we have a reasonable number of exports
    expect(exportedKeys.length).toBeGreaterThan(15);
    expect(exportedKeys.length).toBeLessThan(25);
  });

  it('should have "Lazy" prefix for all exports', () => {
    const exportedKeys = Object.keys(LazyComponents);
    exportedKeys.forEach(key => {
      expect(key).toMatch(/^Lazy/);
    });
  });

  it('should export components as functions', () => {
    // All dynamic imports return React components (functions)
    expect(typeof LazyComponents.LazyNewProjectModal).toBe('function');
    expect(typeof LazyComponents.LazyUnifiedItemModal).toBe('function');
    expect(typeof LazyComponents.LazyTaskFilterPanel).toBe('function');
  });
});

describe('lazy-components structure', () => {
  it('should export project modals', () => {
    const projectModals = [
      'LazyNewProjectModal',
      'LazyNewExpenseModal',
      'LazyNewBudgetModal',
      'LazyNewBillModal',
      'LazyBudgetTemplateModal',
      'LazyReceiptUploadModal',
    ];

    projectModals.forEach(modal => {
      expect(LazyComponents).toHaveProperty(modal);
    });
  });

  it('should export shared modals', () => {
    const sharedModals = [
      'LazyUnifiedItemModal',
      'LazyUnifiedDetailsModal',
      'LazyConfirmDialog',
    ];

    sharedModals.forEach(modal => {
      expect(LazyComponents).toHaveProperty(modal);
    });
  });

  it('should export task components', () => {
    const taskComponents = [
      'LazyTaskFilterPanel',
      'LazyBulkActionsBar',
      'LazyTaskTemplatePickerModal',
      'LazyDraggableItemList',
    ];

    taskComponents.forEach(component => {
      expect(LazyComponents).toHaveProperty(component);
    });
  });

  it('should export shopping components', () => {
    const shoppingComponents = [
      'LazyNewShoppingListModal',
      'LazySaveTemplateModal',
      'LazyShoppingTemplatePickerModal',
      'LazyScheduleTripModal',
    ];

    shoppingComponents.forEach(component => {
      expect(LazyComponents).toHaveProperty(component);
    });
  });

  it('should export analytics components', () => {
    const analyticsComponents = [
      'LazySpendingInsightsCard',
      'LazyReceiptsListCard',
    ];

    analyticsComponents.forEach(component => {
      expect(LazyComponents).toHaveProperty(component);
    });
  });
});

describe('lazy-components naming convention', () => {
  it('should follow LazyComponentName pattern', () => {
    const validNames = [
      'LazyNewProjectModal',
      'LazyUnifiedItemModal',
      'LazyTaskFilterPanel',
      'LazySpendingInsightsCard',
    ];

    validNames.forEach(name => {
      expect(LazyComponents).toHaveProperty(name);
    });
  });

  it('should not have non-Lazy exports', () => {
    const exportedKeys = Object.keys(LazyComponents);
    const nonLazyExports = exportedKeys.filter(key => !key.startsWith('Lazy'));

    expect(nonLazyExports).toEqual([]);
  });
});
