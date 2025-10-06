'use client';

import { useState, useEffect } from 'react';
import { Target, Search, Plus, CheckCircle2, TrendingUp, Clock, Award } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { GoalCard } from '@/components/goals/GoalCard';
import { NewGoalModal } from '@/components/goals/NewGoalModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { goalsService, Goal, CreateGoalInput } from '@/lib/services/goals-service';

export default function GoalsPage() {
  const { currentSpace } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ active: 0, completed: 0, inProgress: 0, milestonesReached: 0 });

  useEffect(() => {
    loadGoals();
  }, [currentSpace.id]);

  useEffect(() => {
    let filtered = goals;
    if (searchQuery) {
      filtered = filtered.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredGoals(filtered);
  }, [goals, searchQuery]);

  async function loadGoals() {
    try {
      setLoading(true);
      const [goalsData, statsData] = await Promise.all([goalsService.getGoals(currentSpace.id), goalsService.getGoalStats(currentSpace.id)]);
      setGoals(goalsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load goals:', error);
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
      loadGoals();
      setEditingGoal(null);
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsService.deleteGoal(goalId);
      loadGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Goals & Milestones' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-goals flex items-center justify-center"><Target className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-goals bg-clip-text text-transparent">Goals & Milestones</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Achieve your dreams together</p>
              </div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"><Plus className="w-5 h-5" />New Goal</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active Goals</h3>
                <div className="w-12 h-12 bg-gradient-goals rounded-xl flex items-center justify-center"><Target className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
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
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search goals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">All Goals ({filteredGoals.length})</h2>
            {loading ? (
              <div className="text-center py-12"><div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /><p className="mt-4 text-gray-600 dark:text-gray-400">Loading goals...</p></div>
            ) : filteredGoals.length === 0 ? (
              <div className="text-center py-12"><Target className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No goals set</p><p className="text-gray-500 dark:text-gray-500 mb-6">{searchQuery ? 'Try adjusting your search' : 'Create your first goal!'}</p>{!searchQuery && (<button onClick={() => setIsModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"><Plus className="w-5 h-5" />Create Goal</button>)}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{filteredGoals.map((goal) => (<GoalCard key={goal.id} goal={goal} onEdit={(g) => { setEditingGoal(g); setIsModalOpen(true); }} onDelete={handleDeleteGoal} />))}</div>
            )}
          </div>
        </div>
      </div>
      <NewGoalModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingGoal(null); }} onSave={handleCreateGoal} editGoal={editingGoal} spaceId={currentSpace.id} />
    </FeatureLayout>
  );
}
