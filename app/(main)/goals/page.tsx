'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Search, Plus, CheckCircle2, TrendingUp, Award, LayoutGrid, List } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { GoalCard } from '@/components/goals/GoalCard';
import { MilestoneCard } from '@/components/goals/MilestoneCard';
import { NewGoalModal } from '@/components/goals/NewGoalModal';
import { NewMilestoneModal } from '@/components/goals/NewMilestoneModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { goalsService, Goal, CreateGoalInput, Milestone, CreateMilestoneInput } from '@/lib/services/goals-service';

type ViewMode = 'goals' | 'milestones';

export default function GoalsPage() {
  const { currentSpace } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [currentSpace.id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let [goalsData, milestonesData] = await Promise.all([
        goalsService.getGoals(currentSpace.id),
        goalsService.getAllMilestones(currentSpace.id)
      ]);

      // Create sample goal in database if none exist
      if (goalsData.length === 0) {
        const newGoal = await goalsService.createGoal({
          space_id: currentSpace.id,
          title: 'Example Goal',
          description: 'This is a sample goal to demonstrate the Goals & Milestones feature',
          category: 'Personal Development',
          status: 'active',
          progress: 45,
        });
        goalsData = [newGoal];
      }

      // Create sample milestone in database if none exist and we have a goal
      if (milestonesData.length === 0 && goalsData.length > 0) {
        const newMilestone = await goalsService.createMilestone({
          goal_id: goalsData[0].id,
          title: 'Save $2,500 by March',
          description: 'Track your progress toward this milestone',
          type: 'money',
          target_value: 2500,
          current_value: 1125,
        });
        milestonesData = [newMilestone];
      }

      setGoals(goalsData);
      setMilestones(milestonesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace.id]);

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

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Goals & Milestones' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-goals flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-goals bg-clip-text text-transparent">Goals & Milestones</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Achieve your dreams together</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex gap-1">
                <button
                  onClick={() => handleViewModeChange('goals')}
                  className={`min-w-[90px] sm:min-w-[110px] px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                    viewMode === 'goals'
                      ? 'bg-gradient-goals text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Goals
                </button>
                <button
                  onClick={() => handleViewModeChange('milestones')}
                  className={`min-w-[90px] sm:min-w-[110px] px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                    viewMode === 'milestones'
                      ? 'bg-gradient-goals text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Milestones
                </button>
              </div>
              <button
                onClick={handleNewButtonClick}
                className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New {viewMode === 'goals' ? 'Goal' : 'Milestone'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active Goals</h3>
                <div className="w-12 h-12 bg-gradient-goals rounded-xl flex items-center justify-center"><Target className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">In Progress</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Milestones</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><Award className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.milestonesReached}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search goals..." value={searchQuery} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
            </div>
          </div>
          {/* Goals/Milestones List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {viewMode === 'goals' ? `All Goals (${filteredGoals.length})` : `Achievement Wall (${filteredMilestones.length})`}
            </h2>

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
                  <p className="text-gray-500 dark:text-gray-500">Try adjusting your search</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                <div className="space-y-4">
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
        </div>
      </div>
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
    </FeatureLayout>
  );
}
