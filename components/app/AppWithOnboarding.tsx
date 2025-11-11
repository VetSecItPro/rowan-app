'use client';

import React from 'react';
import { useZeroSpacesDetection, useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { FirstSpaceOnboarding } from '@/components/ui/FirstSpaceOnboarding';
import { AuthLoadingState, SpacesLoadingState } from '@/components/ui/LoadingStates';

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

  // Show authentication loading state
  if (authLoading) {
    return <AuthLoadingState />;
  }

  // If not authenticated, show normal app (login page will handle this)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Show spaces loading state while checking spaces for authenticated users
  if (isCheckingSpaces || spacesLoading) {
    return <SpacesLoadingState />;
  }

  // Show onboarding for zero-spaces scenario
  if (shouldShowOnboarding && hasZeroSpaces) {
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