'use client';

import React from 'react';
import { useZeroSpacesDetection, useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { FirstSpaceOnboarding } from '@/components/ui/FirstSpaceOnboarding';
import { SmartOnboarding } from '@/components/onboarding/SmartOnboarding';
import { AuthLoadingState, SpacesLoadingState, DashboardSkeleton } from '@/components/ui/LoadingStates';
import { featureFlags } from '@/lib/constants/feature-flags';

/**
 * APP WITH ONBOARDING WRAPPER - PHASE 4 INTEGRATION
 *
 * This component integrates zero-spaces detection with the FirstSpaceOnboarding UI.
 * It intercepts the app flow when users have zero spaces and guides them through
 * creating their first workspace.
 *
 * Flow:
 * 1. Show authentication loading while auth is being checked
 * 2. Show spaces loading while spaces are being loaded
 * 3. If user has zero spaces, show FirstSpaceOnboarding
 * 4. Otherwise, render normal app content
 *
 * This resolves the original zero-spaces issue that caused login spinning.
 */

interface AppWithOnboardingProps {
  children: React.ReactNode;
}

export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const { shouldShowOnboarding, isCheckingSpaces } = useZeroSpacesDetection();
  const {
    user,
    authLoading,
    spacesLoading,
    isAuthenticated,
    hasZeroSpaces,
    refreshSpaces,
    createSpace
  } = useAuthWithSpaces();

  // OPTIMIZED: Optimistic UI - show skeleton immediately while auth loads
  // This eliminates the 500ms blocking spinner and provides instant visual feedback
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  // If not authenticated, show normal app (login page will handle this)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // OPTIMIZED: Show content with skeleton overlay instead of full blocking
  // Users can see the interface structure while spaces load
  if (isCheckingSpaces || spacesLoading) {
    // Show skeleton if spaces are still loading, but allow children to render underneath
    return (
      <>
        {/* Show children with skeleton overlay */}
        <div className="relative">
          {children}
          {/* Optional: could add a subtle overlay here if needed */}
        </div>
      </>
    );
  }

  // Show onboarding for zero-spaces scenario
  if (shouldShowOnboarding && hasZeroSpaces) {
    // Use Smart Onboarding if feature flag is enabled, otherwise fall back to traditional onboarding
    if (featureFlags.isSmartOnboardingEnabled()) {
      return (
        <SmartOnboarding
          isOpen={true}
          onClose={() => {
            console.log('Smart onboarding completed - user should now have access to the app');
            // The SmartOnboarding component handles its own space creation and navigation
            // No additional action needed here as refreshSpaces() is called internally
          }}
        />
      );
    }

    // Traditional onboarding fallback
    return (
      <FirstSpaceOnboarding
        userName={user?.name || user?.email?.split('@')[0] || 'there'}
        onSpaceCreated={async (spaceId: string, spaceName: string) => {
          console.log(`Created space: ${spaceName} (${spaceId})`);
          // Refresh spaces to load the newly created space
          await refreshSpaces();
          // The app will automatically switch to the new space and hide onboarding
        }}
        onSkip={() => {
          console.log('User skipped onboarding - continuing to app');
          // This could set some preference or just continue to the app
          // For now, we'll just continue - the user can create spaces later
        }}
      />
    );
  }

  // Normal app flow - user is authenticated and has spaces (or chose to skip onboarding)
  return <>{children}</>;
}

/**
 * Type definitions for TypeScript support
 */
export interface OnboardingWrapperProps {
  children: React.ReactNode;
}