'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  X,
  Plus,
  Link,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  AlertTriangle,
  Trash2,
  Settings,
  Target,
  Zap,
  Ban,
  Users,
  Info
} from 'lucide-react';
import {
  goalDependenciesService,
  type GoalDependency,
  type GoalWithDependencyInfo,
  type DependencyType,
  type CreateDependencyInput
} from '@/lib/services/goal-dependencies-service';
import { type Goal } from '@/lib/services/goals-service';

interface DependenciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
  spaceId: string;
  userId: string;
  onRefresh?: () => void;
}

const DEPENDENCY_TYPES: Array<{
  type: DependencyType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    type: 'prerequisite',
    label: 'Prerequisite',
    description: 'Must complete this goal before starting the current goal',
    icon: Shield,
    color: 'text-blue-600 bg-blue-900/30'
  },
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Automatically starts the current goal when completed',
    icon: Zap,
    color: 'text-green-600 bg-green-900/30'
  },
  {
    type: 'blocking',
    label: 'Blocking',
    description: 'Prevents starting the current goal while active',
    icon: Ban,
    color: 'text-red-600 bg-red-900/30'
  }
];

export function DependenciesModal({
  isOpen,
  onClose,
  goal,
  spaceId,
  userId,
  onRefresh
}: DependenciesModalProps) {
  const [dependencies, setDependencies] = useState<GoalDependency[]>([]);
  const [availableGoals, setAvailableGoals] = useState<GoalWithDependencyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add dependency form state
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [dependencyType, setDependencyType] = useState<DependencyType>('prerequisite');
  const [completionThreshold, setCompletionThreshold] = useState(100);
  const [autoUnlock, setAutoUnlock] = useState(true);
  const [unlockDelay, setUnlockDelay] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      loadAvailableGoals();
    }
  }, [isOpen, goal.id]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const deps = await goalDependenciesService.getGoalDependencies(goal.id);
      setDependencies(deps);
    } catch (err) {
      logger.error('Failed to load dependencies:', err, { component: 'DependenciesModal', action: 'component_action' });
      setError('Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableGoals = async () => {
    try {
      const goals = await goalDependenciesService.getAvailableGoalsForDependency(spaceId, goal.id);
      setAvailableGoals(goals);
    } catch (err) {
      logger.error('Failed to load available goals:', err, { component: 'DependenciesModal', action: 'component_action' });
    }
  };

  const handleAddDependency = async () => {
    if (!selectedGoalId) return;

    setSaving(true);
    setError(null);

    try {
      const input: CreateDependencyInput = {
        space_id: spaceId,
        goal_id: goal.id,
        depends_on_goal_id: selectedGoalId,
        dependency_type: dependencyType,
        completion_threshold: dependencyType === 'prerequisite' ? completionThreshold : 100,
        auto_unlock: autoUnlock,
        unlock_delay_days: unlockDelay,
        created_by: userId
      };

      await goalDependenciesService.createDependency(input);
      await loadDependencies();
      await loadAvailableGoals();
      setShowAddForm(false);
      resetForm();
      onRefresh?.();
    } catch (err: any) {
      logger.error('Failed to create dependency:', err, { component: 'DependenciesModal', action: 'component_action' });
      setError(err.message || 'Failed to create dependency');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    if (!confirm('Are you sure you want to remove this dependency?')) return;

    try {
      await goalDependenciesService.deleteDependency(dependencyId);
      await loadDependencies();
      await loadAvailableGoals();
      onRefresh?.();
    } catch (err) {
      logger.error('Failed to delete dependency:', err, { component: 'DependenciesModal', action: 'component_action' });
      setError('Failed to remove dependency');
    }
  };

  const handleBypassDependency = async (dependencyId: string) => {
    const reason = prompt('Enter reason for bypassing this dependency:');
    if (!reason) return;

    try {
      await goalDependenciesService.bypassDependency(dependencyId, userId, reason);
      await loadDependencies();
      onRefresh?.();
    } catch (err) {
      logger.error('Failed to bypass dependency:', err, { component: 'DependenciesModal', action: 'component_action' });
      setError('Failed to bypass dependency');
    }
  };

  const resetForm = () => {
    setSelectedGoalId('');
    setDependencyType('prerequisite');
    setCompletionThreshold(100);
    setAutoUnlock(true);
    setUnlockDelay(0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'satisfied':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'bypassed':
        return <Shield className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDependencyTypeConfig = (type: DependencyType) =>
    DEPENDENCY_TYPES.find(t => t.type === type) || DEPENDENCY_TYPES[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:rounded-xl sm:max-w-4xl w-full sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-3 sm:py-4 border-b border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Goal Dependencies</h2>
                <p className="text-sm text-indigo-100 mt-1">{goal.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Add Dependency Button */}
          {!showAddForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/25 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Dependency
              </button>
            </div>
          )}

          {/* Add Dependency Form */}
          {showAddForm && (
            <div className="mb-6 bg-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Add New Dependency</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Select Goal */}
                <div className="relative z-50">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Goal
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 relative z-50"
                    style={{ position: 'relative', zIndex: 9999 }}
                  >
                    <option value="">Choose a goal...</option>
                    {availableGoals.map((availableGoal) => (
                      <option key={availableGoal.id} value={availableGoal.id}>
                        {availableGoal.title} ({availableGoal.progress}% complete)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dependency Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dependency Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {DEPENDENCY_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.type}
                          onClick={() => setDependencyType(type.type)}
                          className={`p-4 border-2 rounded-lg text-left transition-colors ${
                            dependencyType === type.type
                              ? 'border-indigo-500 bg-indigo-900/20'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-2 rounded-lg ${type.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-white">
                              {type.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            {type.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prerequisite Options */}
                {dependencyType === 'prerequisite' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Completion Threshold (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={completionThreshold}
                        onChange={(e) => setCompletionThreshold(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Unlock Delay (days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unlockDelay}
                        onChange={(e) => setUnlockDelay(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Auto Unlock */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoUnlock}
                      onChange={(e) => setAutoUnlock(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300">
                      Automatically unlock when dependency is satisfied
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddDependency}
                    disabled={!selectedGoalId || saving}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    Add Dependency
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dependencies List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Current Dependencies ({dependencies.length})
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-400">Loading dependencies...</p>
              </div>
            ) : dependencies.length === 0 ? (
              <div className="text-center py-8 bg-gray-700 rounded-xl">
                <Link className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-white mb-2">
                  No Dependencies Yet
                </h4>
                <p className="text-gray-400 mb-4">
                  Add dependencies to create relationships between your goals
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dependencies.map((dependency) => {
                  const typeConfig = getDependencyTypeConfig(dependency.dependency_type);
                  const Icon = typeConfig.icon;

                  return (
                    <div
                      key={dependency.id}
                      className="bg-gray-700 border border-gray-600 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-medium text-white">
                                {typeConfig.label}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusIcon(dependency.status)}
                                <span className={`text-sm capitalize ${
                                  dependency.status === 'satisfied' ? 'text-green-400' :
                                  dependency.status === 'bypassed' ? 'text-orange-400' :
                                  'text-gray-400'
                                }`}>
                                  {dependency.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-gray-400 text-sm mb-2">
                            {typeConfig.description}
                          </p>

                          {dependency.dependency_type === 'prerequisite' && (
                            <div className="text-sm text-gray-400">
                              Threshold: {dependency.completion_threshold}%
                              {dependency.unlock_delay_days > 0 && (
                                <span className="ml-2">
                                  • Delay: {dependency.unlock_delay_days} days
                                </span>
                              )}
                            </div>
                          )}

                          {dependency.bypassed_at && (
                            <div className="mt-2 text-sm text-orange-400">
                              Bypassed: {dependency.bypass_reason}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {dependency.status === 'pending' && (
                            <button
                              onClick={() => handleBypassDependency(dependency.id)}
                              className="p-2 text-orange-400 hover:bg-orange-900/30 rounded-lg transition-colors"
                              title="Bypass dependency"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDependency(dependency.id)}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Remove dependency"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}