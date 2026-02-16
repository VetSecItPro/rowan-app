'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { CheckSquare, Search, Clock, CheckCircle2, AlertCircle, Home, FileText, TrendingUp, Minus, ChevronDown, X } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { AIContextualHint } from '@/components/ai/AIContextualHint';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Dropdown } from '@/components/ui/Dropdown';
import { TaskCardSkeleton } from '@/components/ui/Skeleton';
import {
  LazyUnifiedItemModal,
  LazyUnifiedDetailsModal,
  LazyTaskFilterPanel,
  LazyBulkActionsBar,
  LazyTaskTemplatePickerModal,
  LazyDraggableItemList,
} from '@/lib/utils/lazy-components';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { PointsDisplay } from '@/components/rewards';

// Hooks
import { useTasksData } from '@/lib/hooks/useTasksData';
import { useTasksModals } from '@/lib/hooks/useTasksModals';
import { useTasksHandlers } from '@/lib/hooks/useTasksHandlers';

export default function TasksPage() {
  // --- Hook wiring ---
  const data = useTasksData();
  const modals = useTasksModals();
  const handlers = useTasksHandlers({
    user: data.user,
    currentSpace: data.currentSpace,
    spaceId: data.spaceId,
    tasks: data.tasks,
    setTasks: data.setTasks,
    setChores: data.setChores,
    setChoreLoading: data.setChoreLoading,
    refreshTasks: data.refreshTasks,
    refreshChores: data.refreshChores,
    loadData: data.loadData,
    editingItem: modals.editingItem,
    modalDefaultType: modals.modalDefaultType,
    closeUnifiedModal: modals.closeUnifiedModal,
    closeTemplatePicker: modals.closeTemplatePicker,
    clearSelectedTaskIds: modals.clearSelectedTaskIds,
  });

  // --- Destructure for clean JSX access ---
  const {
    currentSpace,
    user,
    spaceId,
    loading,
    realtimeLoading,
    choreRealtimeLoading,
    choreLoading,
    searchQuery,
    setSearchQuery,
    isSearchTyping,
    setIsSearchTyping,
    statusFilter,
    setStatusFilter,
    filters: _filters,
    setFilters,
    showFilters,
    enableDragDrop,
    stats,
    filteredItems,
    paginatedItems,
    hasMoreItems,
    remainingItemsCount,
    ITEMS_PER_PAGE,
    linkedShoppingLists,
    handleLoadMore,
    handleShowAll,
    loadData,
    handleSearchChange,
  } = data;

  const {
    isUnifiedModalOpen,
    modalDefaultType,
    editingItem,
    isDetailsModalOpen,
    selectedItem,
    isTemplatePickerOpen,
    selectedTaskIds,
    openCreateModal,
    openEditModal,
    closeUnifiedModal,
    openDetailsModal,
    closeDetailsModal,
    setSelectedTaskIds,
  } = modals;

  const {
    handleSaveItem,
    handleStatusChange,
    handleDeleteItem,
    handleSaveAsTemplate,
    handleBulkActionComplete,
    handleTemplateSelect,
  } = handlers;

  // --- Early return guard ---
  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tasks & Chores' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={loadData}>
        <div className="min-h-full p-3 sm:p-8 md:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 md:space-y-8">
          {/* Header - Compact on Mobile */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Title Row */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-tasks flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-3xl md:text-3xl lg:text-4xl font-bold bg-gradient-tasks bg-clip-text text-transparent">
                  Tasks & Chores
                </h1>
                <p className="text-xs sm:text-base text-gray-400 hidden sm:block">
                  Organize daily tasks and household chores together
                </p>
              </div>
            </div>

            {/* Action Row - Points + Buttons all on one line on mobile */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
              {/* Points Display - Compact */}
              {user && spaceId && (
                <PointsDisplay
                  userId={user.id}
                  spaceId={spaceId}
                  variant="compact"
                  showStreak={false}
                />
              )}

              {/* Pill-shaped action buttons */}
              <button
                data-testid="add-task-button"
                onClick={() => openCreateModal('task')}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>New Task</span>
              </button>
              <button
                onClick={() => openCreateModal('chore')}
                disabled={choreLoading}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50"
              >
                {choreLoading ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span>{choreLoading ? '...' : 'New Chore'}</span>
              </button>
              <button
                onClick={() => modals.openTemplatePicker()}
                className="p-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium flex-shrink-0"
                title="Create task from template"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Templates</span>
              </button>
            </div>
          </div>


          {/* Stats Dashboard - Hidden on mobile */}
          <div className="hidden sm:block">
            {/* Stats cards - only visible on desktop */}
            <div className="stats-grid-mobile gap-4 sm:gap-6 md:gap-6 grid">
              {/* Pending */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Pending</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-500 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.pending}</p>
                  {stats.pending > 0 && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs font-medium">To start</span>
                    </div>
                  )}
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.inProgress}</p>
                  {stats.inProgress > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">Active</span>
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
                  {stats.total > 0 && (
                    <div className="flex items-center gap-1 text-green-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {(() => {
                          const percentage = Math.round((stats.completed / stats.total) * 100);
                          if (percentage >= 67) return `${percentage}% 🎉`;
                          if (percentage >= 34) return `${percentage}%`;
                          return percentage > 0 ? `${percentage}%` : 'Start';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Tasks & Chores */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Total Tasks & Chores</h3>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-tasks rounded-xl flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</p>
                  {stats.total > 0 && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Minus className="w-3 h-3" />
                      <span className="text-xs font-medium">Overall</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Search Bar - Compact on mobile */}
          <div className="w-full">
            <div className={`apple-search-container tasks-search group ${isSearchTyping ? 'apple-search-typing' : ''} !py-2 sm:!py-3`}>
              <Search className="apple-search-icon !w-4 !h-4 sm:!w-5 sm:!h-5" />
              <input
                type="search"
                placeholder="Search tasks and chores..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="apple-search-input !text-sm sm:!text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchTyping(false);
                  }}
                  className="apple-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {/* Tasks List - Fill remaining screen height on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 flex-1 min-h-0">
            {/* Filters Sidebar - Only show when filters are enabled */}
            {showFilters && currentSpace && (
              <div className="lg:col-span-1">
                <LazyTaskFilterPanel spaceId={currentSpace.id} onFilterChange={setFilters} />
              </div>
            )}

            {/* Main Content - Stretch to bottom */}
            <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col min-h-0`}>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-2 sm:p-4 relative flex-1 flex flex-col min-h-[50vh] sm:min-h-0" style={{zIndex: 'auto'}}>
                {/* Compact Header with Status Filter */}
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs sm:text-base font-semibold text-white">
                      All Tasks & Chores
                    </h2>
                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] font-medium rounded">
                      {filteredItems.length}
                    </span>
                  </div>

                  {/* Compact Status Filter */}
                  <Dropdown
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value || 'all')}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'in_progress', label: 'Active' },
                      { value: 'completed', label: 'Done' }
                    ]}
                    placeholder="Filter..."
                    className="text-xs max-w-[90px] sm:max-w-[120px]"
                  />
                </div>

                {loading || realtimeLoading || choreRealtimeLoading || choreLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <TaskCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  searchQuery || statusFilter !== 'all' ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                        <CheckSquare className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No matching items</h3>
                      <p className="text-sm text-gray-400 max-w-sm mb-6">
                        Try adjusting your filters to find what you&apos;re looking for.
                      </p>
                    </div>
                  ) : (
                    <>
                      <EmptyState
                        feature="tasks"
                        title="Ready to get organized?"
                        description="Create your first task to start conquering your to-do list."
                        primaryAction={{ label: 'Add Task', onClick: () => openCreateModal('task') }}
                      />
                      <AIContextualHint
                        featureKey="tasks"
                        prompt="Add 'clean kitchen' to my tasks for today"
                      />
                    </>
                  )
                ) : enableDragDrop && currentSpace ? (
                  /* Unified drag-and-drop for all items with scrollbar */
                  <div className="space-y-2">
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      <LazyDraggableItemList
                        spaceId={currentSpace.id}
                        initialItems={paginatedItems}
                        onStatusChange={handleStatusChange}
                        onEdit={openEditModal}
                        onDelete={handleDeleteItem}
                        onViewDetails={openDetailsModal}
                      />
                    </div>

                    {/* Pagination Controls for Drag-and-Drop Mode */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400">
                          Showing {paginatedItems.length} of {filteredItems.length} items
                          <span className="ml-1 text-gray-400">({remainingItemsCount} more)</span>
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleLoadMore}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Load {remainingItemsCount > ITEMS_PER_PAGE ? ITEMS_PER_PAGE : remainingItemsCount} More
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleShowAll}
                            className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Show All ({remainingItemsCount})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Regular list when drag-drop disabled */
                  <div className="space-y-2">
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {paginatedItems.map((item) => (
                        <TaskCard
                          key={item.id}
                          task={item}
                          onStatusChange={handleStatusChange}
                          onEdit={openEditModal}
                          onDelete={handleDeleteItem}
                          onViewDetails={openDetailsModal}
                          onSaveAsTemplate={handleSaveAsTemplate}
                          linkedShoppingList={item.type === 'task' ? linkedShoppingLists[item.id] : undefined}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400">
                          Showing {paginatedItems.length} of {filteredItems.length} items
                          <span className="ml-1 text-gray-400">({remainingItemsCount} more)</span>
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleLoadMore}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Load {remainingItemsCount > ITEMS_PER_PAGE ? ITEMS_PER_PAGE : remainingItemsCount} More
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleShowAll}
                            className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center gap-2 font-medium"
                          >
                            Show All ({remainingItemsCount})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </PullToRefresh>
      </PageErrorBoundary>

      {/* Unified Modals */}
      {user && (
        <>
          <LazyUnifiedItemModal
            isOpen={isUnifiedModalOpen}
            onClose={closeUnifiedModal}
            onSave={handleSaveItem}
            editItem={editingItem}
            spaceId={currentSpace?.id}
            userId={user.id}
            defaultType={modalDefaultType}
            mode={editingItem ? "quickEdit" : "create"}
          />

          {currentSpace && (
            <>
              <LazyUnifiedDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={closeDetailsModal}
                item={selectedItem}
                onEdit={openEditModal}
                onDelete={handleDeleteItem}
                onSave={handleSaveItem}
                spaceId={currentSpace.id}
                userId={user.id}
              />

              {/* Advanced Feature Modals */}

              <LazyTaskTemplatePickerModal
                isOpen={isTemplatePickerOpen}
                onClose={() => modals.closeTemplatePicker()}
                onSelect={handleTemplateSelect}
                spaceId={currentSpace.id}
              />
            </>
          )}


        </>
      )}

      {/* Bulk Actions Bar */}
      {currentSpace && (
        <LazyBulkActionsBar
          selectedTaskIds={selectedTaskIds}
          onClearSelection={() => setSelectedTaskIds([])}
          onActionComplete={handleBulkActionComplete}
        />
      )}

    </FeatureLayout>
  );
}
