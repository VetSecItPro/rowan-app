import dynamic from 'next/dynamic';

/**
 * Lazy-loaded component utilities for better page load performance
 *
 * Heavy components like modals, date pickers, and charts are loaded on-demand
 * instead of being included in the initial bundle.
 */

// Loading placeholder for modals
const ModalLoading = () => null;

// ============================================
// PROJECT MODALS
// ============================================
export const LazyNewProjectModal = dynamic(
  () => import('@/components/projects/NewProjectModal').then(mod => ({ default: mod.NewProjectModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyNewExpenseModal = dynamic(
  () => import('@/components/projects/NewExpenseModal').then(mod => ({ default: mod.NewExpenseModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyNewBudgetModal = dynamic(
  () => import('@/components/projects/NewBudgetModal').then(mod => ({ default: mod.NewBudgetModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyNewBillModal = dynamic(
  () => import('@/components/projects/NewBillModal').then(mod => ({ default: mod.NewBillModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyBudgetTemplateModal = dynamic(
  () => import('@/components/projects/BudgetTemplateModal').then(mod => ({ default: mod.BudgetTemplateModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyReceiptUploadModal = dynamic(
  () => import('@/components/projects/ReceiptUploadModal').then(mod => ({ default: mod.ReceiptUploadModal })),
  { loading: ModalLoading, ssr: false }
);

// ============================================
// SHARED MODALS
// ============================================
export const LazyUnifiedItemModal = dynamic(
  () => import('@/components/shared/UnifiedItemModal').then(mod => ({ default: mod.UnifiedItemModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyUnifiedDetailsModal = dynamic(
  () => import('@/components/shared/UnifiedDetailsModal').then(mod => ({ default: mod.UnifiedDetailsModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyConfirmDialog = dynamic(
  () => import('@/components/shared/ConfirmDialog').then(mod => ({ default: mod.ConfirmDialog })),
  { loading: ModalLoading, ssr: false }
);

// ============================================
// TASK COMPONENTS
// ============================================
export const LazyTaskFilterPanel = dynamic(
  () => import('@/components/tasks/TaskFilterPanel').then(mod => ({ default: mod.TaskFilterPanel })),
  { ssr: false }
);

export const LazyBulkActionsBar = dynamic(
  () => import('@/components/tasks/BulkActionsBar').then(mod => ({ default: mod.BulkActionsBar })),
  { ssr: false }
);

export const LazyTaskTemplatePickerModal = dynamic(
  () => import('@/components/tasks/TemplatePickerModal').then(mod => ({ default: mod.TemplatePickerModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyDraggableItemList = dynamic(
  () => import('@/components/tasks/DraggableItemList').then(mod => ({ default: mod.DraggableItemList })),
  { ssr: false }
);

// ============================================
// SHOPPING COMPONENTS
// ============================================
export const LazyNewShoppingListModal = dynamic(
  () => import('@/components/shopping/NewShoppingListModal').then(mod => ({ default: mod.NewShoppingListModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazySaveTemplateModal = dynamic(
  () => import('@/components/shopping/SaveTemplateModal').then(mod => ({ default: mod.SaveTemplateModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyShoppingTemplatePickerModal = dynamic(
  () => import('@/components/shopping/TemplatePickerModal').then(mod => ({ default: mod.TemplatePickerModal })),
  { loading: ModalLoading, ssr: false }
);

export const LazyScheduleTripModal = dynamic(
  () => import('@/components/shopping/ScheduleTripModal').then(mod => ({ default: mod.ScheduleTripModal })),
  { loading: ModalLoading, ssr: false }
);

// ============================================
// HEAVY CHARTS / ANALYTICS
// ============================================
export const LazySpendingInsightsCard = dynamic(
  () => import('@/components/projects/SpendingInsightsCard').then(mod => ({ default: mod.SpendingInsightsCard })),
  { ssr: false }
);

export const LazyReceiptsListCard = dynamic(
  () => import('@/components/projects/ReceiptsListCard').then(mod => ({ default: mod.ReceiptsListCard })),
  { ssr: false }
);
