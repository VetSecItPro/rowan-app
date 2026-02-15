'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { Target, Search, Plus, CheckCircle2, TrendingUp, Award, LayoutGrid, List, Sparkles, MessageCircle, X } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { SortableGoalsList } from '@/components/goals/SortableGoalsList';
import { MilestoneCard } from '@/components/goals/MilestoneCard';
import dynamicImport from 'next/dynamic';

// Dynamic imports for heavy modal components (load only when opened)
const NewGoalModal = dynamicImport(() => import('@/components/goals/NewGoalModal').then(mod => ({ default: mod.NewGoalModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const NewMilestoneModal = dynamicImport(() => import('@/components/goals/NewMilestoneModal').then(mod => ({ default: mod.NewMilestoneModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const NewHabitModal = dynamicImport(() => import('@/components/goals/NewHabitModal').then(mod => ({ default: mod.NewHabitModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const TemplateSelectionModal = dynamicImport(() => import('@/components/goals/TemplateSelectionModal').then(mod => ({ default: mod.TemplateSelectionModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const GoalCheckInModal = dynamicImport(() => import('@/components/goals/GoalCheckInModal').then(mod => ({ default: mod.GoalCheckInModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const CheckInFrequencyModal = dynamicImport(() => import('@/components/goals/CheckInFrequencyModal').then(mod => ({ default: mod.CheckInFrequencyModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

// Dynamic imports for heavy view components (load only when active)
const CheckInHistoryTimeline = dynamicImport(() => import('@/components/goals/CheckInHistoryTimeline').then(mod => ({ default: mod.CheckInHistoryTimeline })), {
  loading: () => <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
});

const ActivityFeed = dynamicImport(() => import('@/components/goals/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })), {
  loading: () => <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
});

const HabitTracker = dynamicImport(() => import('@/components/goals/HabitTracker').then(mod => ({ default: mod.HabitTracker })), {
  loading: () => <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
});

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { GoalCardSkeleton, MilestoneCardSkeleton, StatsCardSkeleton } from '@/components/ui/Skeleton';
import { OnlineUsersIndicator } from '@/components/shared/PresenceIndicator';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

import { useGoalsData } from '@/lib/hooks/useGoalsData';
import { useGoalsModals } from '@/lib/hooks/useGoalsModals';
import { useGoalsHandlers } from '@/lib/hooks/useGoalsHandlers';

export default function GoalsPage() {
  // ─── Hooks ─────────────────────────────────────────────────────────────────
  const data = useGoalsData();
  const modals = useGoalsModals();
  const handlers = useGoalsHandlers({
    goals: data.goals,
    setGoals: data.setGoals,
    milestones: data.milestones,
    setMilestones: data.setMilestones,
    userActionsRef: data.userActionsRef,
    user: data.user,
    currentSpace: data.currentSpace,
    editingGoal: modals.editingGoal,
    setEditingGoal: modals.setEditingGoal,
    editingMilestone: modals.editingMilestone,
    setEditingMilestone: modals.setEditingMilestone,
    editingHabit: modals.editingHabit,
    setEditingHabit: modals.setEditingHabit,
    confirmDialog: modals.confirmDialog,
    setConfirmDialog: modals.setConfirmDialog,
    setSearchQuery: data.setSearchQuery,
    setIsSearchTyping: data.setIsSearchTyping,
    setViewMode: data.setViewMode,
    loadData: data.loadData,
  });

  // ─── Destructure for JSX readability ───────────────────────────────────────
  const {
    spaceId, loading, goals, filteredGoals, filteredMilestones, stats,
    viewMode, searchQuery, setSearchQuery, isSearchTyping,
    statusFilter, setStatusFilter, assignmentFilter, setAssignmentFilter,
    focusMode, setFocusMode, onlineUsers, getUsersViewingGoal,
    spaceMembers, user, loadData,
  } = data;

  const {
    isGoalModalOpen, isTemplateModalOpen, isMilestoneModalOpen,
    isHabitModalOpen, isCheckInModalOpen, isHistoryTimelineOpen,
    isFrequencyModalOpen, editingGoal, editingMilestone, editingHabit,
    selectedTemplate, checkInGoal, historyGoal, frequencyGoal, confirmDialog,
    setConfirmDialog, handleCloseGoalModal, handleOpenGoalModal,
    handleEditGoal, handleCloseMilestoneModal, handleEditMilestone,
    handleCloseHabitModal, handleSelectTemplate, handleCloseTemplateModal,
    handleCreateFromScratch, handleOpenCheckInModal, handleCloseCheckInModal,
    handleOpenHistoryTimeline, handleCloseHistoryTimeline,
    handleOpenFrequencyModal, handleCloseFrequencyModal, handleNewButtonClick,
  } = modals;

  const {
    handleCreateGoal, handleDeleteGoal, handleCreateMilestone,
    handleDeleteMilestone, handleCreateHabit, handleCreateCheckIn,
    handleConfirmDelete, handleToggleMilestone, handleGoalStatusChange,
    handleSearchChange, handleViewModeChange, handleReorderGoals,
    handlePriorityChange, handleTogglePin,
  } = handlers;

  // ─── Early returns ─────────────────────────────────────────────────────────
  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <FeatureGateWrapper
      feature="goals"
      title="Goals & Milestones"
      description="Track your family goals, set milestones, and celebrate achievements together. Upgrade to Pro to unlock this feature."
    >
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Goals & Milestones' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={loadData} disabled={loading}>
          <div className="p-4 sm:p-6 md:p-8 lg:p-5">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-goals flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl md:text-3xl lg:text-4xl font-bold bg-gradient-goals bg-clip-text text-transparent">
                  Goals & Milestones
                </h1>
                <p className="text-sm sm:text-base text-gray-400">
                  Achieve your dreams together
                </p>
              </div>
              {/* Online users indicator */}
              {onlineUsers.length > 0 && (
                <div className="mt-2 sm:mt-0 sm:ml-4">
                  <OnlineUsersIndicator count={onlineUsers.length} />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Simplified Navigation - Core tabs only */}
              <div className="flex items-center gap-1 p-1 bg-gray-900/60 rounded-xl border border-gray-700/50 sm:min-w-[380px]">
                <button
                  onClick={() => handleViewModeChange('goals')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'goals'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Goals</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('milestones')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'milestones'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">Milestones</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('habits')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'habits'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Habits</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('activity')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'activity'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Activity</span>
                </button>
              </div>
              <button
                onClick={() => handleNewButtonClick(viewMode)}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>New {viewMode === 'goals' ? 'Goal' : viewMode === 'milestones' ? 'Milestone' : viewMode === 'habits' ? 'Habit' : 'Goal'}</span>
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <CollapsibleStatsGrid
            icon={Target}
            title="Goals Stats"
            summary={loading ? 'Loading...' : `${stats.active} active • ${stats.completed} done`}
            iconGradient="bg-gradient-goals"
          >
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
            {/* Active Goals */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Active Goals</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-goals rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.active}</p>
                {stats.active > 0 && (
                  <div className="flex items-center gap-1 text-indigo-400">
                    <Target className="w-3 h-3" />
                    <span className="text-xs font-medium">Ongoing</span>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.inProgress}</p>
                {stats.inProgress > 0 && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Working on it</span>
                  </div>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Milestones</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.milestonesReached}</p>
                {stats.milestonesReached > 0 && (
                  <div className="flex items-center gap-1 text-indigo-400">
                    <Award className="w-3 h-3" />
                    <span className="text-xs font-medium">Reached!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Completed</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.completed}</p>
                {(stats.active + stats.completed) > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {(() => {
                        const percentage = Math.round((stats.completed / (stats.active + stats.completed)) * 100);
                        if (percentage >= 67) return `${percentage}% 🎉`;
                        if (percentage >= 34) return `${percentage}%`;
                        return percentage > 0 ? `${percentage}%` : 'Start';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            </>
            )}
          </CollapsibleStatsGrid>

          {/* Goals/Milestones List */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6">
            {/* Search Bar - inside container */}
            <div className={`apple-search-container goals-search group mb-4 ${isSearchTyping ? 'apple-search-typing' : ''}`}>
              <Search className="apple-search-icon" />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="apple-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="apple-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Header with Month Badge and Status Filter - Hide for habits since it has custom header */}
            {viewMode !== 'habits' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {viewMode === 'goals' ? `All Goals (${filteredGoals.length})` :
                   viewMode === 'milestones' ? `Achievement Wall (${filteredMilestones.length})` :
                   'Activity Feed'}
                </h2>
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
                {viewMode === 'goals' && (
                  <button
                    onClick={() => handleNewButtonClick(viewMode)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all text-xs font-medium flex items-center gap-1 sm:hidden"
                  >
                    <Plus className="w-3 h-3" />
                    New
                  </button>
                )}
              </div>

              {/* Filter Controls Container - Only show for goals view */}
              {viewMode === 'goals' && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {/* Combined Filter - Mobile: single row with all options, Desktop: two separate rows */}
                  <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-1 w-full sm:w-auto">
                    {/* Mobile: Combined single-row filter */}
                    <div className="grid grid-cols-5 gap-0.5 sm:hidden">
                      <button
                        onClick={() => { setStatusFilter('all'); setAssignmentFilter('all'); }}
                        className={`px-2 py-2.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                          statusFilter === 'all' && assignmentFilter === 'all' && !focusMode
                            ? 'bg-gradient-goals text-white shadow-md'
                            : 'text-gray-400 hover:bg-indigo-900/20'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => { setStatusFilter('active'); setAssignmentFilter('all'); setFocusMode(false); }}
                        className={`px-2 py-2.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                          statusFilter === 'active' && assignmentFilter === 'all' && !focusMode
                            ? 'bg-gradient-goals text-white shadow-md'
                            : 'text-gray-400 hover:bg-indigo-900/20'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => { setStatusFilter('completed'); setAssignmentFilter('all'); setFocusMode(false); }}
                        className={`px-2 py-2.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                          statusFilter === 'completed' && assignmentFilter === 'all' && !focusMode
                            ? 'bg-gradient-goals text-white shadow-md'
                            : 'text-gray-400 hover:bg-indigo-900/20'
                        }`}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => { setStatusFilter('all'); setAssignmentFilter('assigned-to-me'); setFocusMode(false); }}
                        className={`px-2 py-2.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                          assignmentFilter === 'assigned-to-me' && !focusMode
                            ? 'bg-gradient-goals text-white shadow-md'
                            : 'text-gray-400 hover:bg-indigo-900/20'
                        }`}
                      >
                        Mine
                      </button>
                      <button
                        onClick={() => { setFocusMode(!focusMode); if (!focusMode) { setStatusFilter('all'); setAssignmentFilter('all'); } }}
                        className={`px-2 py-2.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                          focusMode
                            ? 'bg-gradient-goals text-white shadow-md'
                            : 'text-gray-400 hover:bg-indigo-900/20'
                        }`}
                        title="Focus on top 3 priority goals"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Top 3</span>
                      </button>
                    </div>

                    {/* Desktop: Status Filter */}
                    <div className="hidden sm:flex gap-1">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                          statusFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-400 hover:bg-gray-800/60'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                          statusFilter === 'active'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-400 hover:bg-gray-800/60'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                          statusFilter === 'completed'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-400 hover:bg-gray-800/60'
                        }`}
                      >
                        Completed
                      </button>
                    </div>
                  </div>

                  {/* Desktop: Assignment Filter */}
                  <div className="hidden sm:flex bg-gray-900/60 border border-gray-700 rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setAssignmentFilter('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                        assignmentFilter === 'all'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:bg-indigo-900/20'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAssignmentFilter('assigned-to-me')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                        assignmentFilter === 'assigned-to-me'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:bg-indigo-900/20'
                      }`}
                    >
                      Mine
                    </button>
                    <button
                      onClick={() => setAssignmentFilter('unassigned')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-[90px] ${
                        assignmentFilter === 'unassigned'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:bg-indigo-900/20'
                      }`}
                    >
                      Unassigned
                    </button>
                  </div>
                </div>
              )}

              {/* Focus Mode Toggle - Desktop only (mobile has it in combined filter) */}
              {viewMode === 'goals' && filteredGoals.length > 3 && (
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={`hidden sm:flex px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap items-center gap-2 ${
                    focusMode
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-400 hover:bg-gray-800/50 border border-gray-700'
                  }`}
                  title="Show only top 3 priority goals"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Focus Mode</span>
                </button>
              )}
            </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {viewMode === 'goals' ? (
                  [...Array(5)].map((_, i) => <GoalCardSkeleton key={i} />)
                ) : (
                  [...Array(5)].map((_, i) => <MilestoneCardSkeleton key={i} />)
                )}
              </div>
            ) : viewMode === 'goals' ? (
              /* Goals View */
              filteredGoals.length === 0 ? (
                searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Target className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No matching goals</h3>
                    <p className="text-sm text-gray-400 max-w-sm mb-6">
                      Try adjusting your search to find what you&apos;re looking for.
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    feature="goals"
                    title="Every journey starts with a goal"
                    description="Set your first goal and start tracking your progress."
                    primaryAction={{ label: 'Set a Goal', onClick: handleOpenGoalModal }}
                  />
                )
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <SortableGoalsList
                    goals={filteredGoals}
                    onReorder={handleReorderGoals}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onCheckIn={handleOpenCheckInModal}
                    onShowHistory={handleOpenHistoryTimeline}
                    onFrequencySettings={handleOpenFrequencyModal}
                    onStatusChange={handleGoalStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onTogglePin={handleTogglePin}
                    getUsersViewingGoal={getUsersViewingGoal}
                  />
                </div>
              )
            ) : viewMode === 'milestones' ? (
              /* Milestones View */
              filteredMilestones.length === 0 ? (
                searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Award className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No matching milestones</h3>
                    <p className="text-sm text-gray-400 max-w-sm mb-6">
                      Try adjusting your search to find what you&apos;re looking for.
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    feature="goals"
                    icon={Award}
                    title="Break goals into milestones"
                    description="Add milestones to your goals to track progress step by step."
                  />
                )
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
            ) : viewMode === 'habits' ? (
              /* Habits View */
              <div className="space-y-6">
                {/* Custom header for Habits without button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg sm:text-xl font-bold text-white">
                          Habit Tracker
                        </h2>
                        <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-sm font-medium rounded-full">
                          {format(new Date(), 'MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Build consistent healthy habits daily
                      </p>
                    </div>
                  </div>
                </div>
                {spaceId && <HabitTracker spaceId={spaceId} />}
              </div>
            ) : (
              /* Activity View */
              <div className="space-y-6">
                <ActivityFeed
                  spaceId={spaceId}
                  className="max-h-[600px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </PullToRefresh>
      </PageErrorBoundary>
      {/* Always render modals with fallback spaceId */}
      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplateModal}
        onSelectTemplate={handleSelectTemplate}
        onCreateFromScratch={handleCreateFromScratch}
        spaceId={spaceId}
      />
      <NewGoalModal
        isOpen={isGoalModalOpen}
        onClose={handleCloseGoalModal}
        onSave={handleCreateGoal}
        editGoal={editingGoal}
        spaceId={spaceId}
        availableGoals={goals.filter(g => g.status === 'active')}
        selectedTemplate={selectedTemplate}
        spaceMembers={spaceMembers}
      />
      <NewMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={handleCloseMilestoneModal}
        onSave={handleCreateMilestone}
        editMilestone={editingMilestone}
        goalId={goals[0]?.id || spaceId}
        availableGoals={goals.filter(g => g.status === 'active')}
      />
      <NewHabitModal
        isOpen={isHabitModalOpen}
        onClose={handleCloseHabitModal}
        onSave={handleCreateHabit}
        editHabit={editingHabit}
        spaceId={spaceId}
      />
      {checkInGoal && (
        <GoalCheckInModal
          isOpen={isCheckInModalOpen}
          onClose={handleCloseCheckInModal}
          onSave={handleCreateCheckIn}
          goalTitle={checkInGoal.title}
          goalId={checkInGoal.id}
          currentProgress={checkInGoal.progress}
        />
      )}
      {historyGoal && (
        <CheckInHistoryTimeline
          goalId={historyGoal.id}
          isOpen={isHistoryTimelineOpen}
          onClose={handleCloseHistoryTimeline}
        />
      )}
      {frequencyGoal && (
        <CheckInFrequencyModal
          isOpen={isFrequencyModalOpen}
          onClose={handleCloseFrequencyModal}
          goalId={frequencyGoal.id}
          goalTitle={frequencyGoal.title}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: 'delete-goal', id: '' })}
        onConfirm={handleConfirmDelete}
        title={confirmDialog.action === 'delete-goal' ? 'Delete Goal' : 'Delete Milestone'}
        message={confirmDialog.action === 'delete-goal'
          ? 'Are you sure you want to delete this goal? This action cannot be undone.'
          : 'Are you sure you want to delete this milestone? This action cannot be undone.'}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </FeatureLayout>
    </FeatureGateWrapper>
  );
}
