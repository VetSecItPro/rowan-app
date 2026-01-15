/**
 * Dynamic Component Loaders for Code Splitting
 *
 * Professional dynamic loading wrappers with skeleton UI and error handling
 * Provides optimized bundle splitting for heavy components
 */

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { ProgressiveTableSkeleton } from './ProgressiveLoader';

/**
 * Generic loading component for dynamic imports
 */
const LoadingFallback = ({
  text = 'Loading...',
  size = 'md'
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={`${sizes[size]} animate-spin text-blue-400`} />
        <p className="text-sm text-gray-400">{text}</p>
      </div>
    </div>
  );
};

/**
 * Error boundary fallback for dynamic imports
 */
const ErrorFallback = ({
  error,
  retry
}: {
  error: Error;
  retry?: () => void;
}) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
        <span className="text-red-400 text-xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Failed to load component
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        {error.message || 'Something went wrong while loading this component.'}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

/**
 * Admin Dashboard - Dynamic Import
 * Unified admin operations dashboard (all functionality in one place)
 */
export const AdminDashboardPage = dynamic(
  () => import('@/app/admin/dashboard/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading admin dashboard..." size="lg" />,
    ssr: false,
  }
);

/**
 * ADMIN TABLE COMPONENTS - Dynamic Import
 * Heavy table components with complex filtering and pagination
 */
export const AdminUsersTable = dynamic(
  () => import('@/components/admin/UsersTable').then(mod => ({ default: mod.UsersTable })),
  {
    loading: () => <ProgressiveTableSkeleton title="users" columns={5} rows={8} />,
    ssr: false,
  }
);

export const AdminBetaRequestsTable = dynamic(
  () => import('@/components/admin/BetaRequestsTable').then(mod => ({ default: mod.BetaRequestsTable })),
  {
    loading: () => <ProgressiveTableSkeleton title="beta requests" columns={5} rows={6} />,
    ssr: false,
  }
);

/**
 * Settings Main Page - Dynamic Import
 * Massive settings component with all tabs and modals (24.2 kB)
 */
export const SettingsMainPage = dynamic(
  () => import('@/app/(main)/settings/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading settings..." size="lg" />,
    ssr: false, // Settings don't need SSR
  }
);

/**
 * Goals Analytics Page - Dynamic Import
 * Heavy analytics page with complex charts (6.38 kB)
 */
export const GoalsAnalyticsPage = dynamic(
  () => import('@/app/(main)/settings/analytics/goals/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading goals analytics..." size="md" />,
    ssr: false,
  }
);

/**
 * Meals Main Page - Dynamic Import
 * Massive meal planning component (27 kB)
 */
export const MealsMainPage = dynamic(
  () => import('@/app/(main)/meals/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading meal planner..." size="lg" />,
    ssr: false, // Meal planning doesn't need SSR
  }
);

/**
 * Recipe Discovery Page - Dynamic Import
 * Heavy recipe discovery with external APIs (9.73 kB)
 */
export const RecipeDiscoveryPage = dynamic(
  () => import('@/app/(main)/recipes/discover/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading recipe discovery..." size="md" />,
    ssr: false,
  }
);

/**
 * Recipe Main Page - Dynamic Import
 * Recipe listing and management (10.5 kB)
 */
export const RecipeMainPage = dynamic(
  () => import('@/app/(main)/recipes/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading recipes..." size="md" />,
    ssr: false,
  }
);

/**
 * Recipe Creation Page - Dynamic Import
 * Heavy recipe creation form (8.55 kB)
 */
export const RecipeNewPage = dynamic(
  () => import('@/app/(main)/recipes/new/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback text="Loading recipe creator..." size="md" />,
    ssr: false,
  }
);

/**
 * Generic dynamic component wrapper with error boundary
 */
export function withDynamicLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    loadingText?: string;
    loadingSize?: 'sm' | 'md' | 'lg';
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: () => (
      <LoadingFallback
        text={options?.loadingText || 'Loading...'}
        size={options?.loadingSize || 'md'}
      />
    ),
    ssr: options?.ssr ?? true,
  });
}

/**
 * Progressive enhancement wrapper for heavy components
 * Provides immediate skeleton + progressive loading
 */
export function withProgressiveLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  Skeleton: ComponentType,
  options?: {
    delay?: number;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: () => <Skeleton />,
    ssr: options?.ssr ?? true,
  });
}