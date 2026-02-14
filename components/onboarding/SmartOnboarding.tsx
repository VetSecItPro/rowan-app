'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { featureFlags } from '@/lib/constants/feature-flags';
import { personalWorkspaceService } from '@/lib/services/personal-workspace-service';
import { logger } from '@/lib/logger';

/**
 * Smart Onboarding Component
 *
 * Intent-based onboarding that routes users based on their use case:
 * - Personal use → Auto-create personal workspace
 * - Family/shared use → Traditional space creation flow
 *
 * SAFETY: Feature flag controlled and backward compatible
 * Falls back to traditional FirstSpaceOnboarding when disabled
 */

type UserIntent = 'personal' | 'family' | null;

interface SmartOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Renders a smart onboarding flow that adapts to user setup progress. */
export function SmartOnboarding({ isOpen, onClose }: SmartOnboardingProps) {
  const [intent, setIntent] = useState<UserIntent>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>();
  const { user } = useAuth();
  const { refreshSpaces } = useSpaces();
  const router = useRouter();

  // If smart onboarding is disabled, don't render this component
  if (!featureFlags.isSmartOnboardingEnabled()) {
    return null;
  }

  const handlePersonalChoice = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure personal workspace exists
      const personalSpace = await personalWorkspaceService.ensurePersonalSpace(
        user.id,
        user.name || undefined
      );

      if (personalSpace) {
        // Refresh spaces to load the new personal workspace
        await refreshSpaces();

        logger.info('Personal workspace ready, redirecting to dashboard');

        // Close onboarding and redirect to dashboard
        onClose();
        router.push('/dashboard');
      } else {
        throw new Error('Failed to create personal workspace');
      }
    } catch (error) {
      logger.error('Personal workspace setup failed:', error, { component: 'SmartOnboarding', action: 'component_action' });
      setError('Failed to set up personal workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyChoice = () => {
    setLoading(true);
    setError(null);

    // Redirect to traditional space creation
    // This will trigger the existing FirstSpaceOnboarding flow
    onClose();
    router.push('/spaces/create'); // Or wherever the space creation flow is
  };

  const clearError = () => setError(null);

  // Intent selection screen
  if (intent === null) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Welcome to Rowan!"
      >
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-400 mb-6">
              Help us set up the perfect workspace for your needs.
            </p>
          </div>

          {/* Personal Use Option */}
          <div
            className="p-6 border-2 border-gray-700 rounded-lg hover:border-purple-600 cursor-pointer transition-all group"
            onClick={() => setIntent('personal')}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-800/50 transition-colors">
                  <span className="text-2xl">👤</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Just for me
                </h3>
                <p className="text-sm text-gray-400">
                  Personal productivity and organization. Perfect for individual use.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-900/30 text-purple-300">
                    Instant setup
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Family/Shared Use Option */}
          <div
            className="p-6 border-2 border-gray-700 rounded-lg hover:border-blue-600 cursor-pointer transition-all group"
            onClick={() => setIntent('family')}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-800/50 transition-colors">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  With family/partner
                </h3>
                <p className="text-sm text-gray-400">
                  Shared organization for households, families, or teams.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-900/30 text-blue-300">
                    Collaboration features
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-400">
              You can always invite others or create additional workspaces later.
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  // Confirmation screen based on intent
  const isPersonalFlow = intent === 'personal';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPersonalFlow ? "Setting up your personal workspace..." : "Creating shared workspace..."}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <div className="flex justify-between items-start">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-red-500 text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          {isPersonalFlow ? (
            <>
              <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Personal Workspace
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                We&apos;ll create your personal workspace with all the features you need for individual productivity.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Shared Workspace
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Let&apos;s create a shared workspace where you can collaborate with family, partners, or teammates.
              </p>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setIntent(null)}
            disabled={loading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="default"
            onClick={isPersonalFlow ? handlePersonalChoice : handleFamilyChoice}
            disabled={loading}
            className="flex-1"
          >
            {isPersonalFlow ? 'Create Personal Workspace' : 'Create Shared Workspace'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
