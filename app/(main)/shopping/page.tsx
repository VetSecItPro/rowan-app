'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { ShoppingCart, Search, Plus, List, CheckCircle2, Clock, Package, X, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { AIContextualHint } from '@/components/ai/AIContextualHint';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { ShoppingListCard } from '@/components/shopping/ShoppingListCard';
// Lazy-loaded components for better initial page load
import {
  LazyNewShoppingListModal,
  LazySaveTemplateModal,
  LazyShoppingTemplatePickerModal,
  LazyScheduleTripModal,
  LazyConfirmDialog,
} from '@/lib/utils/lazy-components';

import { useShoppingData } from '@/lib/hooks/useShoppingData';
import { useShoppingModals } from '@/lib/hooks/useShoppingModals';
import { useShoppingHandlers } from '@/lib/hooks/useShoppingHandlers';

export default function ShoppingPage() {
  // ─── Hooks ─────────────────────────────────────────────────────────────────
  const data = useShoppingData();
  const modals = useShoppingModals();
  const handlers = useShoppingHandlers({
    user: data.user,
    currentSpace: data.currentSpace,
    spaceId: data.spaceId,
    lists: data.lists,
    invalidateShopping: data.invalidateShopping,
    editingList: modals.editingList,
    setEditingList: modals.setEditingList,
    confirmDialog: modals.confirmDialog,
    setConfirmDialog: modals.setConfirmDialog,
    listForTemplate: modals.listForTemplate,
    setShowTemplateModal: modals.setShowTemplateModal,
    setListForTemplate: modals.setListForTemplate,
    listToSchedule: modals.listToSchedule,
    setShowScheduleTripModal: modals.setShowScheduleTripModal,
    setListToSchedule: modals.setListToSchedule,
    setSearchQuery: data.setSearchQuery,
    setIsSearchTyping: data.setIsSearchTyping,
    setStatusFilter: data.setStatusFilter,
    setTimeFilter: data.setTimeFilter,
  });

  // ─── Destructure for clean JSX access ──────────────────────────────────────
  const {
    currentSpace, lists, stats, loading, refetchLists,
    searchQuery, isSearchTyping, statusFilter, timeFilter, filteredLists,
  } = data;

  const {
    isModalOpen, editingList, showTemplatePicker, showTemplateModal,
    listForTemplate, showScheduleTripModal, listToSchedule, confirmDialog,
    handleOpenNewListModal, handleCloseModal, handleEditList,
    handleOpenTemplatePicker, handleSaveAsTemplate, handleScheduleTrip,
    handleStartFresh, handleCloseConfirmDialog,
  } = modals;

  const {
    handleCreateList, handleDeleteList, handleConfirmDelete, handleCompleteList,
    handleToggleItem, handleUpdateQuantity, handleSelectTemplate,
    handleSaveTemplate, handleScheduleTripSubmit, handleCreateTask,
    handleSearchChange, handleClearSearch,
    handleTotalListsClick, handleActiveListsClick, handleItemsThisWeekClick,
    handleCompletedListsClick,
  } = handlers;

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Shopping Lists' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={async () => { await refetchLists(); }}>
        <div className="p-4 sm:p-6 md:p-8 lg:p-5">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-white">Shopping Lists</h1>
                <p className="text-sm sm:text-base text-gray-400">Collaborative shopping made easy</p>
              </div>
            </div>
            <button onClick={handleOpenNewListModal} className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors flex items-center justify-center gap-2 font-medium shadow-md">
              <Plus className="w-5 h-5" />
              New Shopping List
            </button>
          </div>

          {/* Stats Dashboard */}
          <CollapsibleStatsGrid
            icon={ShoppingCart}
            title="Shopping Stats"
            summary={`${stats.activeLists} active • ${stats.itemsThisWeek} items`}
            iconGradient="bg-emerald-500"
          >
            <button
              onClick={handleItemsThisWeekClick}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-5 md:p-6 hover:bg-gray-700 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Items This Week</h3>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.itemsThisWeek}</p>
                {stats.itemsThisWeek > 0 && (
                  <div className="flex items-center gap-1 text-purple-400">
                    <Package className="w-3 h-3" />
                    <span className="text-xs font-medium">New items</span>
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleActiveListsClick}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-5 md:p-6 hover:bg-gray-700 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Active Lists</h3>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.activeLists}</p>
                {stats.activeLists > 0 && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">In progress</span>
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleCompletedListsClick}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-5 md:p-6 hover:bg-gray-700 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Completed Lists</h3>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.completedLists}</p>
                {stats.totalLists > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {(() => {
                        const percentage = Math.round((stats.completedLists / stats.totalLists) * 100);
                        if (percentage >= 67) return `${percentage}% 🎉`;
                        if (percentage >= 34) return `${percentage}%`;
                        return percentage > 0 ? `${percentage}%` : 'Start';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleTotalListsClick}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-5 md:p-6 hover:bg-gray-700 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium">Total Lists</h3>
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center"><List className="w-5 h-5 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalLists}</p>
                {stats.totalLists > 0 && (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <List className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </button>
          </CollapsibleStatsGrid>

          {/* Search Bar - No outer container on mobile */}
          <div className={`apple-search-container shopping-search group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
            <Search className="apple-search-icon" />
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="Search lists..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="apple-search-input"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className={`apple-search-clear ${searchQuery ? 'visible' : ''}`}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Shopping Lists */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 sm:p-5 md:p-6">
            {/* Header with Month Badge and Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {timeFilter === 'week' ? 'This Week\'s Lists' : 'All Shopping Lists'} ({filteredLists.length})
                </h2>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-xs sm:text-sm font-medium rounded-full">
                  {timeFilter === 'week' ? 'This Week' : format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Status Filter - Compact Segmented Buttons */}
              <div className="flex-shrink-0">
                <div className="bg-gray-900/80 border border-emerald-700/50 rounded-full p-0.5 flex gap-0.5">
                  <button
                    onClick={() => { data.setStatusFilter('all'); data.setTimeFilter('all'); }}
                    className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-medium rounded-full transition-all whitespace-nowrap active:scale-[0.97] ${
                      statusFilter === 'all' && timeFilter === 'all'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => { data.setTimeFilter('week'); data.setStatusFilter('all'); }}
                    className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-medium rounded-full transition-all whitespace-nowrap active:scale-[0.97] ${
                      timeFilter === 'week'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => { data.setStatusFilter('active'); data.setTimeFilter('all'); }}
                    className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-medium rounded-full transition-all whitespace-nowrap active:scale-[0.97] ${
                      statusFilter === 'active' && timeFilter === 'all'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => { data.setStatusFilter('completed'); data.setTimeFilter('all'); }}
                    className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-medium rounded-full transition-all whitespace-nowrap active:scale-[0.97] ${
                      statusFilter === 'completed' && timeFilter === 'all'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-xl p-6 shadow-lg animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 bg-gray-600 rounded w-48" />
                      <div className="h-8 bg-gray-600 rounded w-24" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-gray-600 rounded" />
                          <div className="h-4 bg-gray-600 rounded flex-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLists.length === 0 ? (
              searchQuery || statusFilter !== 'active' ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <ShoppingCart className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No matching lists</h3>
                  <p className="text-sm text-gray-400 max-w-sm mb-6">
                    Try adjusting your filters to find what you&apos;re looking for.
                  </p>
                </div>
              ) : (
                <>
                  <EmptyState
                    feature="shopping"
                    title="Time to stock up!"
                    description="Create your first shopping list to keep track of what you need."
                    primaryAction={{ label: 'Create Shopping List', onClick: handleOpenNewListModal }}
                  />
                  <AIContextualHint
                    featureKey="shopping"
                    prompt="Add milk, eggs, and bread to my grocery list"
                  />
                </>
              )
            ) : (
              <div className="min-h-[600px] max-h-[900px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {filteredLists.map((list) => (
                  <ShoppingListCard
                    key={list.id}
                    list={list}
                    onEdit={handleEditList}
                    onDelete={handleDeleteList}
                    onToggleItem={handleToggleItem}
                    onCompleteList={handleCompleteList}
                    onSaveAsTemplate={handleSaveAsTemplate}
                    onScheduleTrip={handleScheduleTrip}
                    onCreateTask={handleCreateTask}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </PullToRefresh>
      </PageErrorBoundary>
      {currentSpace && (
        <>
          <LazyShoppingTemplatePickerModal
            isOpen={showTemplatePicker}
            onClose={() => modals.setShowTemplatePicker(false)}
            onSelectTemplate={handleSelectTemplate}
            onStartFresh={handleStartFresh}
            spaceId={currentSpace.id}
          />
          <LazyNewShoppingListModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleCreateList} editList={editingList} spaceId={currentSpace.id} onUseTemplate={handleOpenTemplatePicker} />
          {listForTemplate && (
            <LazySaveTemplateModal
              isOpen={showTemplateModal}
              onClose={() => {
                modals.setShowTemplateModal(false);
                modals.setListForTemplate(null);
              }}
              onSave={handleSaveTemplate}
              list={listForTemplate}
            />
          )}
          {listToSchedule && (
            <LazyScheduleTripModal
              isOpen={showScheduleTripModal}
              onClose={() => {
                modals.setShowScheduleTripModal(false);
                modals.setListToSchedule(null);
              }}
              onSchedule={handleScheduleTripSubmit}
              list={listToSchedule}
            />
          )}
        </>
      )}

      <LazyConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Shopping List"
        message="Are you sure you want to delete this shopping list? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </FeatureLayout>
  );
}
