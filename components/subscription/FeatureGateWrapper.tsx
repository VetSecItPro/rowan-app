'use client';

/**
 * Feature Gate Wrapper Component
 * Wraps content that requires a specific subscription tier
 */

import React from 'react';
import { useFeatureGate, type GatedFeature } from '@/lib/hooks/useFeatureGate';
import { Crown, Lock, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateWrapperProps {
  feature: GatedFeature;
  children: React.ReactNode;
  /** What to show while loading subscription status */
  loadingFallback?: React.ReactNode;
  /** Custom blocked content (overrides default) */
  blockedContent?: React.ReactNode;
  /** Whether to show full-page blocked UI or inline */
  variant?: 'page' | 'inline' | 'overlay';
  /** Custom title for blocked state */
  title?: string;
  /** Custom description for blocked state */
  description?: string;
}

/**
 * Wrapper component that gates content based on subscription
 *
 * @example
 * ```tsx
 * <FeatureGateWrapper feature="mealPlanning" variant="page">
 *   <MealPlannerContent />
 * </FeatureGateWrapper>
 * ```
 */
export function FeatureGateWrapper({
  feature,
  children,
  loadingFallback,
  blockedContent,
  variant = 'page',
  title,
  description,
}: FeatureGateWrapperProps) {
  const {
    hasAccess,
    isLoading,
    featureName,
    requiredTier,
    promptUpgrade,
  } = useFeatureGate(feature);

  // Show loading state
  if (isLoading) {
    return loadingFallback || <FeatureGateLoading />;
  }

  // Has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom blocked content
  if (blockedContent) {
    return <>{blockedContent}</>;
  }

  // Default blocked UI based on variant
  switch (variant) {
    case 'page':
      return (
        <FeatureGateBlockedPage
          featureName={title || featureName}
          description={description}
          requiredTier={requiredTier}
          onUpgrade={promptUpgrade}
        />
      );
    case 'inline':
      return (
        <FeatureGateBlockedInline
          featureName={title || featureName}
          requiredTier={requiredTier}
          onUpgrade={promptUpgrade}
        />
      );
    case 'overlay':
      return (
        <div className="relative">
          <div className="pointer-events-none opacity-40 blur-[1px]">{children}</div>
          <FeatureGateOverlay
            featureName={title || featureName}
            requiredTier={requiredTier}
            onUpgrade={promptUpgrade}
          />
        </div>
      );
    default:
      return null;
  }
}

// Loading state
function FeatureGateLoading() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-700" />
        <div className="h-4 w-32 rounded bg-gray-700" />
      </div>
    </div>
  );
}

// Full page blocked state
function FeatureGateBlockedPage({
  featureName,
  description,
  requiredTier,
  onUpgrade: _onUpgrade,
}: {
  featureName: string;
  description?: string;
  requiredTier: string;
  onUpgrade: () => void;
}) {
  const tierDisplay = requiredTier === 'family' ? 'Family' : 'Pro';

  return (
    <div data-testid="feature-locked-message" className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-900/30 to-teal-900/30">
        <Lock className="h-10 w-10 text-emerald-400" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">
        {featureName}
      </h1>

      {/* Description */}
      <p className="text-gray-400 max-w-md mb-6">
        {description || `Upgrade to ${tierDisplay} to unlock ${featureName.toLowerCase()} and supercharge your family organization.`}
      </p>

      {/* Tier badge */}
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-900/30 px-4 py-2">
        <Crown className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-300">
          Requires {tierDisplay} Plan
        </span>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-white font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
        >
          <Sparkles className="h-4 w-4" />
          <span>View Plans</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-600 px-6 py-3 text-gray-300 font-medium hover:bg-gray-800 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

// Inline blocked state (for cards/sections)
function FeatureGateBlockedInline({
  featureName,
  requiredTier,
  onUpgrade,
}: {
  featureName: string;
  requiredTier: string;
  onUpgrade: () => void;
}) {
  const tierDisplay = requiredTier === 'family' ? 'Family' : 'Pro';

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50">
      <Lock className="h-8 w-8 text-gray-500 mb-3" />
      <p className="text-sm font-medium text-gray-400 mb-1">
        {featureName}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Requires {tierDisplay} Plan
      </p>
      <button
        onClick={onUpgrade}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        <Crown className="h-3.5 w-3.5" />
        Upgrade
      </button>
    </div>
  );
}

// Overlay blocked state (for semi-visible preview)
function FeatureGateOverlay({
  featureName,
  requiredTier,
  onUpgrade,
}: {
  featureName: string;
  requiredTier: string;
  onUpgrade: () => void;
}) {
  const tierDisplay = requiredTier === 'family' ? 'Family' : 'Pro';

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-sm text-center">
        <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/30">
          <Lock className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {featureName}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Upgrade to {tierDisplay} to unlock this feature
        </p>
        <button
          onClick={onUpgrade}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-emerald-700 hover:to-teal-700 transition-colors"
        >
          <Crown className="h-4 w-4" />
          Upgrade Now
        </button>
      </div>
    </div>
  );
}

/**
 * Simple button that checks access before action
 */
export function GatedButton({
  feature,
  onClick,
  children,
  className,
  ...props
}: {
  feature: GatedFeature;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const { checkAndPrompt } = useFeatureGate(feature);

  const handleClick = () => {
    if (checkAndPrompt()) {
      onClick();
    }
  };

  return (
    <button onClick={handleClick} className={className} {...props}>
      {children}
    </button>
  );
}

/**
 * Badge indicating feature requires upgrade
 */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-300 ${className || ''}`}>
      <Crown className="h-3 w-3" />
      Pro
    </span>
  );
}

export function FamilyBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-300 ${className || ''}`}>
      <Sparkles className="h-3 w-3" />
      Family
    </span>
  );
}
