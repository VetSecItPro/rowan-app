'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, ArrowRight, Database, Calendar, Task, MessageSquare, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { featureFlags } from '@/lib/constants/feature-flags';
import { personalWorkspaceService } from '@/lib/services/personal-workspace-service';
import type { Space } from '@/lib/types';

/**
 * Workspace Migration Modal
 *
 * Allows users to migrate data from their personal workspace to a shared space.
 * Provides granular control over what data types to migrate and clear progress indication.
 *
 * SAFETY: Feature flag controlled and validates both source and target spaces
 */

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalSpace: Space & { role: string };
  targetSpaces: (Space & { role: string })[];
}

type MigrationItemType = 'tasks' | 'calendar' | 'reminders' | 'messages' | 'shopping' | 'goals';

interface MigrationItem {
  type: MigrationItemType;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const MIGRATION_ITEMS: MigrationItem[] = [
  {
    type: 'tasks',
    label: 'Tasks & Projects',
    description: 'All your tasks, projects, and related data',
    icon: <Task className="w-5 h-5" />,
    enabled: true,
  },
  {
    type: 'calendar',
    label: 'Calendar Events',
    description: 'Events, appointments, and recurring items',
    icon: <Calendar className="w-5 h-5" />,
    enabled: true,
  },
  {
    type: 'reminders',
    label: 'Reminders',
    description: 'Personal reminders and notifications',
    icon: <AlertTriangle className="w-5 h-5" />,
    enabled: true,
  },
  {
    type: 'messages',
    label: 'Messages',
    description: 'Notes and message history',
    icon: <MessageSquare className="w-5 h-5" />,
    enabled: true,
  },
  {
    type: 'shopping',
    label: 'Shopping Lists',
    description: 'Shopping lists and household items',
    icon: <ShoppingCart className="w-5 h-5" />,
    enabled: true,
  },
  {
    type: 'goals',
    label: 'Goals & Habits',
    description: 'Personal goals and habit tracking',
    icon: <CheckCircle className="w-5 h-5" />,
    enabled: true,
  },
];

type MigrationStep = 'selection' | 'target' | 'confirmation' | 'progress' | 'complete';

export function MigrationModal({ isOpen, onClose, personalSpace, targetSpaces }: MigrationModalProps) {
  const [step, setStep] = useState<MigrationStep>('selection');
  const [selectedItems, setSelectedItems] = useState<MigrationItemType[]>(
    MIGRATION_ITEMS.filter(item => item.enabled).map(item => item.type)
  );
  const [targetSpace, setTargetSpace] = useState<(Space & { role: string }) | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<{
    total: number;
    completed: number;
    current: string;
  }>({ total: 0, completed: 0, current: '' });
  const [error, setError] = useState<string | null>(null);
  const { user, refreshSpaces } = useSpaces();
  const router = useRouter();

  // If workspace migration is disabled, don't render this component
  if (!featureFlags.isWorkspaceMigrationEnabled()) {
    return null;
  }

  const toggleItem = (type: MigrationItemType) => {
    setSelectedItems(prev =>
      prev.includes(type)
        ? prev.filter(item => item !== type)
        : [...prev, type]
    );
  };

  const handleStartMigration = async () => {
    if (!user || !targetSpace || selectedItems.length === 0) {
      setError('Please select items to migrate and a target workspace');
      return;
    }

    setStep('progress');
    setError(null);
    setMigrationProgress({ total: selectedItems.length, completed: 0, current: 'Initializing...' });

    try {
      // Call the personal workspace service migration method
      const result = await personalWorkspaceService.migrateToSharedSpace(
        user.id,
        targetSpace.id,
        selectedItems
      );

      if (result.success) {
        setMigrationProgress(prev => ({
          ...prev,
          completed: prev.total,
          current: 'Migration completed successfully!'
        }));

        // Refresh spaces to reflect changes
        await refreshSpaces();

        // Move to completion step
        setTimeout(() => setStep('complete'), 1000);
      } else {
        throw new Error('Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setError('Migration failed. Please try again or contact support.');
      setStep('confirmation'); // Go back to allow retry
    }
  };

  const handleCompleteMigration = () => {
    onClose();
    // Navigate to the target space
    if (targetSpace) {
      router.push('/dashboard');
    }
  };

  const clearError = () => setError(null);

  // Selection Step: Choose what to migrate
  if (step === 'selection') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Migrate Personal Workspace"
        subtitle="Choose what to move to a shared workspace"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Select the data types you'd like to move from your personal workspace to a shared workspace.
            </p>
          </div>

          <div className="space-y-3">
            {MIGRATION_ITEMS.map((item) => (
              <div
                key={item.type}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedItems.includes(item.type)
                    ? 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleItem(item.type)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 mt-0.5 ${
                    selectedItems.includes(item.type)
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${
                        selectedItems.includes(item.type)
                          ? 'text-purple-900 dark:text-purple-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.label}
                      </h4>
                      {selectedItems.includes(item.type) && (
                        <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${
                      selectedItems.includes(item.type)
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep('target')}
              disabled={selectedItems.length === 0}
            >
              Continue ({selectedItems.length} selected)
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Target Step: Choose destination workspace
  if (step === 'target') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Choose Destination Workspace"
        subtitle="Select where to move your data"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Choose the shared workspace where you want to move your selected data.
            </p>
          </div>

          <div className="space-y-3">
            {targetSpaces.map((space) => (
              <div
                key={space.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  targetSpace?.id === space.id
                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setTargetSpace(space)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className={`w-5 h-5 ${
                      targetSpace?.id === space.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <div>
                      <h4 className={`font-medium ${
                        targetSpace?.id === space.id
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {space.name}
                      </h4>
                      <p className={`text-sm ${
                        targetSpace?.id === space.id
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        Role: {space.role}
                      </p>
                    </div>
                  </div>
                  {targetSpace?.id === space.id && (
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {targetSpaces.length === 0 && (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                You don't have any shared workspaces yet.
                <br />
                Create one first before migrating your data.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={() => setStep('selection')}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep('confirmation')}
              disabled={!targetSpace}
            >
              Continue
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Confirmation Step: Final confirmation before migration
  if (step === 'confirmation') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Confirm Migration"
        subtitle="Review your migration settings"
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex justify-between items-start">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">From: Personal Workspace</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedItems.length} data types selected
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">To: {targetSpace?.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Shared workspace
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-medium text-gray-900 dark:text-white">Data to migrate:</h5>
              <div className="space-y-1">
                {selectedItems.map((itemType) => {
                  const item = MIGRATION_ITEMS.find(i => i.type === itemType);
                  return item ? (
                    <div key={itemType} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-amber-800 dark:text-amber-200">Important Notes</h5>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  <li>• Your data will be moved to the selected shared workspace</li>
                  <li>• Other workspace members will have access to this data</li>
                  <li>• This action cannot be easily undone</li>
                  <li>• Your personal workspace will remain for future use</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={() => setStep('target')}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleStartMigration}
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              Start Migration
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Progress Step: Show migration progress
  if (step === 'progress') {
    const progressPercentage = migrationProgress.total > 0
      ? Math.round((migrationProgress.completed / migrationProgress.total) * 100)
      : 0;

    return (
      <Modal
        isOpen={isOpen}
        onClose={() => {}} // Prevent closing during migration
        title="Migrating Data"
        subtitle="Please wait while we move your data"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {migrationProgress.current}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="font-medium text-gray-900 dark:text-white">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-purple-600 dark:bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              {migrationProgress.completed} of {migrationProgress.total} items completed
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Complete Step: Migration finished
  if (step === 'complete') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCompleteMigration}
        title="Migration Complete!"
        subtitle="Your data has been successfully moved"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              All selected data has been moved to <strong>{targetSpace?.name}</strong>.
              You can now collaborate with your workspace members!
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">What's Next?</h5>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Your personal workspace remains available for future personal items</li>
              <li>• Invite others to your shared workspace if needed</li>
              <li>• All migrated data retains its structure and relationships</li>
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="primary"
              onClick={handleCompleteMigration}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              Go to {targetSpace?.name}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}