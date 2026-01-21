/**
 * Dynamic Meal Components for Code Splitting
 *
 * Professional dynamic loading for heavy meal planning components
 * Modals and complex views are loaded on-demand to optimize initial bundle size
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { EnhancedModalSkeleton, ProgressiveCalendarSkeleton } from './ProgressiveLoader';

/**
 * Meal-specific loading component
 */
const MealLoadingFallback = ({
  text = 'Loading...',
  icon: Icon = UtensilsCrossed
}: {
  text?: string;
  icon?: ComponentType<{ className?: string }>;
}) => (
  <div className="flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Icon className="w-8 h-8 text-orange-500" />
        <Loader2 className="w-4 h-4 absolute -top-1 -right-1 animate-spin text-orange-600" />
      </div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  </div>
);

/**
 * Modal loading skeleton for better UX
 */
const ModalSkeleton = ({ title }: { title: string }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded-full bg-gray-700 animate-pulse" />
        <div className="h-6 bg-gray-700 rounded animate-pulse w-32" />
      </div>
      <MealLoadingFallback text={`Loading ${title}...`} />
    </div>
  </div>
);

/**
 * NEW MEAL MODAL - Dynamic Import
 * Heavy modal with form handling and validations
 */
export const NewMealModal = dynamic(
  () => import('@/components/meals/NewMealModal').then(mod => ({ default: mod.NewMealModal })),
  {
    loading: () => <EnhancedModalSkeleton title="meal creator" icon={UtensilsCrossed} />,
    ssr: false,
  }
);

/**
 * NEW RECIPE MODAL - Dynamic Import
 * Heavy modal with recipe form and ingredient management
 */
export const NewRecipeModal = dynamic(
  () => import('@/components/meals/NewRecipeModal').then(mod => ({ default: mod.NewRecipeModal })),
  {
    loading: () => <EnhancedModalSkeleton title="recipe creator" icon={UtensilsCrossed} size="lg" />,
    ssr: false,
  }
);

/**
 * INGREDIENT REVIEW MODAL - Dynamic Import
 * Complex ingredient analysis and review interface
 */
export const IngredientReviewModal = dynamic(
  () => import('@/components/meals/IngredientReviewModal').then(mod => ({ default: mod.IngredientReviewModal })),
  {
    loading: () => <ModalSkeleton title="ingredient review" />,
    ssr: false,
  }
);

/**
 * RECIPE PREVIEW MODAL - Dynamic Import
 * Rich recipe preview with images and detailed information
 */
export const RecipePreviewModal = dynamic(
  () => import('@/components/meals/RecipePreviewModal').then(mod => ({ default: mod.RecipePreviewModal })),
  {
    loading: () => <ModalSkeleton title="recipe preview" />,
    ssr: false,
  }
);

/**
 * GENERATE LIST MODAL - Dynamic Import
 * Shopping list generation with complex algorithms
 */
export const GenerateListModal = dynamic(
  () => import('@/components/meals/GenerateListModal').then(mod => ({ default: mod.GenerateListModal })),
  {
    loading: () => <ModalSkeleton title="shopping list generator" />,
    ssr: false,
  }
);

/**
 * QUICK PLAN MODAL - Dynamic Import
 * Quick meal planning interface
 */
export const QuickPlanModal = dynamic(
  () => import('@/components/meals/QuickPlanModal').then(mod => ({ default: mod.QuickPlanModal })),
  {
    loading: () => <ModalSkeleton title="quick planner" />,
    ssr: false,
  }
);

/**
 * WEEK CALENDAR VIEW - Dynamic Import
 * Heavy calendar component with complex date calculations
 */
export const WeekCalendarView = dynamic(
  () => import('@/components/meals/WeekCalendarView').then(mod => ({ default: mod.WeekCalendarView })),
  {
    loading: () => (
      <div className="bg-gray-800 rounded-lg p-6">
        <ProgressiveCalendarSkeleton type="week" />
      </div>
    ),
    ssr: false,
  }
);

/**
 * TWO-WEEK CALENDAR VIEW - Dynamic Import
 * Heavy calendar component with extended date range calculations
 */
export const TwoWeekCalendarView = dynamic(
  () => import('@/components/meals/TwoWeekCalendarView').then(mod => ({ default: mod.TwoWeekCalendarView })),
  {
    loading: () => (
      <div className="bg-gray-800 rounded-lg p-6">
        <MealLoadingFallback text="Loading two-week view..." />
        <div className="grid grid-cols-7 gap-4 mt-4">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * MEAL CARD - Optimized with lazy loading
 * Frequently used component optimized for performance
 */
export const MealCard = dynamic(
  () => import('@/components/meals/MealCard').then(mod => ({ default: mod.MealCard })),
  {
    loading: () => (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gray-700 rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-700 rounded w-full mb-1" />
        <div className="h-3 bg-gray-700 rounded w-2/3" />
      </div>
    ),
    ssr: true, // Cards can be SSR'd
  }
);

/**
 * RECIPE CARD - Optimized with lazy loading
 * Recipe display component with image handling
 */
export const RecipeCard = dynamic(
  () => import('@/components/meals/RecipeCard').then(mod => ({ default: mod.RecipeCard })),
  {
    loading: () => (
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-700" />
        <div className="p-4">
          <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-700 rounded w-2/3 mb-4" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700 rounded w-20" />
            <div className="h-8 bg-gray-700 rounded w-20" />
          </div>
        </div>
      </div>
    ),
    ssr: true,
  }
);

/**
 * High-Level Dynamic Meal Components Export
 * Provides easy access to all dynamically loaded meal components
 */
export const DynamicMealComponents = {
  // Modals (heaviest - load on demand)
  NewMealModal,
  NewRecipeModal,
  IngredientReviewModal,
  RecipePreviewModal,
  GenerateListModal,
  QuickPlanModal,

  // Calendar Views (heavy - load when switching views)
  WeekCalendarView,
  TwoWeekCalendarView,

  // Cards (optimized - frequent use)
  MealCard,
  RecipeCard,
} as const;

/**
 * Type exports for dynamic components
 */
export type DynamicMealComponent = keyof typeof DynamicMealComponents;
