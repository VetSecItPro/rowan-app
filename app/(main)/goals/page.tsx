'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Search, Plus, CheckCircle2, TrendingUp, Award, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { GoalCard } from '@/components/goals/GoalCard';
import { MilestoneCard } from '@/components/goals/MilestoneCard';
import { NewGoalModal } from '@/components/goals/NewGoalModal';
import { NewMilestoneModal } from '@/components/goals/NewMilestoneModal';
import GuidedGoalCreation from '@/components/guided/GuidedGoalCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { goalsService, Goal, CreateGoalInput, Milestone, CreateMilestoneInput } from '@/lib/services/goals-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';

type ViewMode = 'goals' | 'milestones';

export default function GoalsPage() {
  const { currentSpace, user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);

  // Memoized filtered goals with search
  const filteredGoals = useMemo(() => {
    if (!searchQuery) return goals;

    const lowerQuery = searchQuery.toLowerCase();
    return goals.filter(g =>
      g.title.toLowerCase().includes(lowerQuery) ||
      g.description?.toLowerCase().includes(lowerQuery)
    );
  }, [goals, searchQuery]);

  // Memoized filtered milestones with search
  const filteredMilestones = useMemo(() => {
    if (!searchQuery) return milestones;

    const lowerQuery = searchQuery.toLowerCase();
    return milestones.filter(m =>
      m.title.toLowerCase().includes(lowerQuery) ||
      m.description?.toLowerCase().includes(lowerQuery)
    );
  }, [milestones, searchQuery]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const active = goals.filter(g => g.status === 'active').length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status === 'active' && g.progress > 0 && g.progress < 100).length;
    const milestonesReached = milestones.filter(m => m.completed).length;

    return { active, completed, inProgress, milestonesReached };
  }, [goals, milestones]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace]);

  const loadData = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [goalsData, milestonesData, userProgressResult] = await Promise.all([
        goalsService.getGoals(currentSpace.id),
        goalsService.getAllMilestones(currentSpace.id),
        getUserProgress(user.id),
      ]);

      setGoals(goalsData);
      setMilestones(milestonesData);

      // Check if user has completed the guided goal flow
      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_goal_set);
      }

      // Show guided flow if no goals exist, user hasn't completed the guide, AND user hasn't skipped it
      if (
        goalsData.length === 0 &&
        !userProgress?.first_goal_set &&
        !userProgress?.skipped_goal_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  const handleCreateGoal = useCallback(async (goalData: CreateGoalInput) => {
    try {
      if (editingGoal) {
        await goalsService.updateGoal(editingGoal.id, goalData);
      } else {
        await goalsService.createGoal(goalData);
      }
      loadData();
      setEditingGoal(null);
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  }, [editingGoal, loadData]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsService.deleteGoal(goalId);
      loadData();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  }, [loadData]);

  const handleCreateMilestone = useCallback(async (milestoneData: CreateMilestoneInput) => {
    try {
      if (editingMilestone) {
        await goalsService.updateMilestone(editingMilestone.id, milestoneData);
      } else {
        await goalsService.createMilestone(milestoneData);
      }
      loadData();
      setEditingMilestone(null);
    } catch (error) {
      console.error('Failed to save milestone:', error);
    }
  }, [editingMilestone, loadData]);

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      await goalsService.deleteMilestone(milestoneId);
      loadData();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  }, [loadData]);

  const handleToggleMilestone = useCallback(async (milestoneId: string, completed: boolean) => {
    try {
      await goalsService.toggleMilestone(milestoneId, completed);
      loadData();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  }, [loadData]);

  const handleGoalStatusChange = useCallback(async (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    try {
      const statusMap = {
        'not-started': 'active' as const,
        'in-progress': 'active' as const,
        'completed': 'completed' as const,
      };
      const progressMap = {
        'not-started': 0,
        'in-progress': 50,
        'completed': 100,
      };

      await goalsService.updateGoal(goalId, {
        status: statusMap[status],
        progress: progressMap[status],
      });
      loadData();
    } catch (error) {
      console.error('Failed to update goal status:', error);
    }
  }, [loadData]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleOpenGoalModal = useCallback(() => {
    setIsGoalModalOpen(true);
  }, []);

  const handleOpenMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(true);
  }, []);

  const handleCloseGoalModal = useCallback(() => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  }, []);

  const handleCloseMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(false);
    setEditingMilestone(null);
  }, []);

  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  }, []);

  const handleEditMilestone = useCallback((milestone: Milestone) => {
    setEditingMilestone(milestone);
    setIsMilestoneModalOpen(true);
  }, []);

  const handleNewButtonClick = useCallback(() => {
    if (viewMode === 'goals') {
      handleOpenGoalModal();
    } else {
      handleOpenMilestoneModal();
    }
  }, [viewMode, handleOpenGoalModal, handleOpenMilestoneModal]);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadData(); // Reload to show newly created goal
  }, [loadData]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'goal_guide');
      } catch (error) {
        console.error('Failed to mark goal guide as skipped:', error);
      }
    }
  }, [user]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Goals & Milestones' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-goals flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-goals bg-clip-text text-transparent">
                  Goals & Milestones
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Achieve your dreams together
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 p-1.5 bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl border border-indigo-200 dark:border-indigo-700">
                <button
                  onClick={() => handleViewModeChange('goals')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[110px] ${
                    viewMode === 'goals'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Goals</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('milestones')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[110px] ${
                    viewMode === 'milestones'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">Milestones</span>
                </button>
              </div>
              <button
                onClick={handleNewButtonClick}
                className="px-4 sm:px-6 py-2 sm:py-3 shimmer-goals text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedGoalCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Dashboard - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Active Goals */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Active Goals</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-goals rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>

            {/* In Progress */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>

            {/* Milestones */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Milestones</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.milestonesReached}</p>
            </div>

            {/* Completed */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Completed</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
          </div>
          )}

          {/* Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search goals..." value={searchQuery} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
            </div>
          </div>
          )}

          {/* Goals/Milestones List - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            {/* Header with Month Badge and Status Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {viewMode === 'goals' ? `All Goals (${filteredGoals.length})` : `Achievement Wall (${filteredMilestones.length})`}
                </h2>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Status Filter - Segmented Buttons - Hidden for milestones but space reserved */}
              <div className={`flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-1 flex gap-1 w-[220px] ${viewMode === 'milestones' ? 'invisible' : ''}`}>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md"
                >
                  All
                </button>
                <button
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  Active
                </button>
                <button
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[80px] text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  Completed
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            ) : viewMode === 'goals' ? (
              /* Goals View */
              filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No goals found</p>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">
                    {searchQuery ? 'Try adjusting your search' : 'Set your first goal to get started!'}
                  </p>
                  {!searchQuery && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleOpenGoalModal}
                        className="px-6 py-3 shimmer-goals text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Create Goal
                      </button>
                      {!hasCompletedGuide && (
                        <button
                          onClick={() => setShowGuidedFlow(true)}
                          className="px-6 py-3 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                        >
                          <Target className="w-5 h-5" />
                          Try Guided Creation
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={handleEditGoal}
                      onDelete={handleDeleteGoal}
                      onStatusChange={handleGoalStatusChange}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Milestones View */
              filteredMilestones.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No milestones found</p>
                  <p className="text-gray-500 dark:text-gray-500">Try adjusting your search</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {filteredMilestones.map((milestone) => {
                    const relatedGoal = goals.find(g => g.id === milestone.goal_id);
                    return (
                      <MilestoneCard
                        key={milestone.id}
                        milestone={milestone}
                        goalTitle={relatedGoal?.title}
                        onEdit={handleEditMilestone}
                        onDelete={handleDeleteMilestone}
                        onToggle={handleToggleMilestone}
                      />
                    );
                  })}
                </div>
              )
            )}
          </div>
          )}
        </div>
      </div>
      {currentSpace && (
        <>
          <NewGoalModal
            isOpen={isGoalModalOpen}
            onClose={handleCloseGoalModal}
            onSave={handleCreateGoal}
            editGoal={editingGoal}
            spaceId={currentSpace.id}
          />
          <NewMilestoneModal
            isOpen={isMilestoneModalOpen}
            onClose={handleCloseMilestoneModal}
            onSave={handleCreateMilestone}
            editMilestone={editingMilestone}
            goalId={goals[0]?.id || currentSpace.id}
          />
        </>
      )}
    </FeatureLayout>
  );
}
