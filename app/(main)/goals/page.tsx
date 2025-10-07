'use client';

import { useState, useEffect } from 'react';
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
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [filteredMilestones, setFilteredMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ active: 0, completed: 0, inProgress: 0, milestonesReached: 0 });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace.id]);

  useEffect(() => {
    let filteredG = goals;
    let filteredM = milestones;

    if (searchQuery) {
      filteredG = filteredG.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      filteredM = filteredM.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredGoals(filteredG);
    setFilteredMilestones(filteredM);
  }, [goals, milestones, searchQuery]);

  async function loadData() {
    try {
      setLoading(true);
      let [goalsData, milestonesData, statsData] = await Promise.all([
        goalsService.getGoals(currentSpace.id),
        goalsService.getAllMilestones(currentSpace.id),
        goalsService.getGoalStats(currentSpace.id)
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

      // Refresh stats after creating sample data
      if (goalsData.length > 0 || milestonesData.length > 0) {
        statsData = await goalsService.getGoalStats(currentSpace.id);
      }

      setGoals(goalsData);
      setMilestones(milestonesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGoal(goalData: CreateGoalInput) {
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
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsService.deleteGoal(goalId);
      loadData();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  }

  async function handleCreateMilestone(milestoneData: CreateMilestoneInput) {
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
  }

  async function handleDeleteMilestone(milestoneId: string) {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      await goalsService.deleteMilestone(milestoneId);
      loadData();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  }

  async function handleToggleMilestone(milestoneId: string, completed: boolean) {
    try {
      await goalsService.toggleMilestone(milestoneId, completed);
      loadData();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  }

  async function handleGoalStatusChange(goalId: string, status: 'not-started' | 'in-progress' | 'completed') {
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
  }

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
                  onClick={() => setViewMode('goals')}
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
                  onClick={() => setViewMode('milestones')}
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
                onClick={() => viewMode === 'goals' ? setIsGoalModalOpen(true) : setIsMilestoneModalOpen(true)}
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
              <input type="text" placeholder="Search goals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
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
                      onEdit={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); }}
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
                        onEdit={(m) => { setEditingMilestone(m); setIsMilestoneModalOpen(true); }}
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
        onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }}
        onSave={handleCreateGoal}
        editGoal={editingGoal}
        spaceId={currentSpace.id}
      />
      <NewMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => { setIsMilestoneModalOpen(false); setEditingMilestone(null); }}
        onSave={handleCreateMilestone}
        editMilestone={editingMilestone}
        goalId={goals[0]?.id || currentSpace.id}
      />
    </FeatureLayout>
  );
}
