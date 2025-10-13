'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Search, Plus, List, CheckCircle2, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ShoppingListCard } from '@/components/shopping/ShoppingListCard';
import { NewShoppingListModal } from '@/components/shopping/NewShoppingListModal';
import GuidedShoppingCreation from '@/components/guided/GuidedShoppingCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { shoppingService, ShoppingList, CreateListInput } from '@/lib/services/shopping-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';

export default function ShoppingPage() {
  const { currentSpace, user } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);

  const [stats, setStats] = useState({
    totalLists: 0,
    activeLists: 0,
    itemsThisWeek: 0,
    completedLists: 0,
  });

  // Memoized filtered lists calculation
  const filteredLists = useMemo(() => {
    let filtered = lists;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [lists, searchQuery, statusFilter]);

  // Memoized stats calculations
  const memoizedStats = useMemo(() => stats, [stats]);

  // Load lists function (stable reference not needed as it's called in useEffect)
  async function loadLists() {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [listsData, statsData, userProgressResult] = await Promise.all([
        shoppingService.getLists(currentSpace.id),
        shoppingService.getShoppingStats(currentSpace.id),
        getUserProgress(user.id),
      ]);
      setLists(listsData);
      setStats(statsData);

      // Check if user has completed the guided shopping flow
      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_shopping_item_added);
      }

      // Show guided flow if no lists exist, user hasn't completed the guide, AND user hasn't skipped it
      if (
        listsData.length === 0 &&
        !userProgress?.first_shopping_item_added &&
        !userProgress?.skipped_shopping_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace, user]);

  // Memoized callback for creating/updating lists
  const handleCreateList = useCallback(async (listData: CreateListInput & { store?: string; items?: { id?: string; name: string; quantity: number }[] }) => {
    try {
      if (editingList) {
        // Extract items before updating the list
        const { items, ...listDataOnly } = listData;

        await shoppingService.updateList(editingList.id, listDataOnly);

        // Only add NEW items (items without an ID)
        if (items && items.length > 0) {
          const newItems = items.filter(item => !item.id);
          for (const item of newItems) {
            await shoppingService.createItem({
              list_id: editingList.id,
              name: item.name,
              quantity: item.quantity || 1,
            });
          }
        }
      } else {
        // Extract items before creating the list
        const { items, ...listDataOnly } = listData;

        const newList = await shoppingService.createList(listDataOnly);

        // Add items if provided
        if (items && items.length > 0) {
          for (const item of items) {
            await shoppingService.createItem({
              list_id: newList.id,
              name: item.name,
              quantity: item.quantity || 1,
            });
          }
        }
      }
      loadLists();
      setEditingList(null);
    } catch (error) {
      console.error('Failed to save list:', error);
    }
  }, [editingList]);

  // Memoized callback for deleting lists
  const handleDeleteList = useCallback(async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;
    try {
      await shoppingService.deleteList(listId);
      loadLists();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  }, []);

  // Memoized callback for completing lists
  const handleCompleteList = useCallback(async (listId: string) => {
    try {
      // Optimistically update list status
      setLists(prevLists =>
        prevLists.map(list =>
          list.id === listId ? { ...list, status: 'completed' as const } : list
        )
      );

      // Optimistically update stats
      setStats(prevStats => ({
        ...prevStats,
        activeLists: prevStats.activeLists - 1,
        completedLists: prevStats.completedLists + 1,
      }));

      // Mark as completed in database (keep for history/productivity tracking)
      await shoppingService.updateList(listId, { status: 'completed' });
    } catch (error) {
      console.error('Failed to complete list:', error);
      // Revert on error
      loadLists();
    }
  }, []);

  // Memoized callback for toggling items
  const handleToggleItem = useCallback(async (itemId: string, checked: boolean) => {
    // Optimistic update
    setLists(prevLists =>
      prevLists.map(list => ({
        ...list,
        items: list.items?.map(item =>
          item.id === itemId ? { ...item, checked } : item
        )
      }))
    );

    try {
      await shoppingService.toggleItem(itemId, checked);

      // Check if all items in the list are now checked
      const updatedList = lists.find(list =>
        list.items?.some(item => item.id === itemId)
      );

      if (updatedList && updatedList.items && updatedList.items.length > 0) {
        const allChecked = updatedList.items.every(item =>
          item.id === itemId ? checked : item.checked
        );

        // Auto-complete the list if all items are checked
        if (allChecked && checked) {
          await handleCompleteList(updatedList.id);
        }
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
      // Revert on error
      loadLists();
    }
  }, [lists, handleCompleteList]);

  // Memoized callback for editing lists
  const handleEditList = useCallback((list: ShoppingList) => {
    setEditingList(list);
    setIsModalOpen(true);
  }, []);

  // Memoized callback for closing modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingList(null);
  }, []);

  // Memoized callback for opening new list modal
  const handleOpenNewListModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Memoized callback for search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoized callback for status filter change
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as 'all' | 'active' | 'completed');
  }, []);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadLists(); // Reload to show newly created list
  }, []);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'shopping_guide');
      } catch (error) {
        console.error('Failed to mark shopping guide as skipped:', error);
      }
    }
  }, [user]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Shopping Lists' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-shopping flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-shopping bg-clip-text text-transparent">Shopping Lists</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Collaborative shopping made easy</p>
              </div>
            </div>
            <button onClick={handleOpenNewListModal} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 shimmer-shopping text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              New List
            </button>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedShoppingCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Dashboard - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Lists</h3>
                <div className="w-12 h-12 bg-gradient-shopping rounded-xl flex items-center justify-center"><List className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.totalLists}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active Lists</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.activeLists}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Items This Week</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.itemsThisWeek}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed Lists</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.completedLists}</p>
            </div>
          </div>
          )}

          {/* Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search lists..." value={searchQuery} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
            </div>
          </div>
          )}

          {/* Shopping Lists - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {/* Header with Month Badge and Status Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Shopping Lists ({filteredLists.length})
                </h2>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Status Filter - Segmented Buttons */}
              <div className="bg-gray-50 dark:bg-gray-900 border-2 border-emerald-200 dark:border-emerald-700 rounded-lg p-1 flex gap-1 w-fit">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'active'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[80px] ${
                    statusFilter === 'completed'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading lists...</p>
              </div>
            ) : filteredLists.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No lists found</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">{searchQuery || statusFilter !== 'active' ? 'Try adjusting your filters' : 'Create your first shopping list!'}</p>
                {!searchQuery && statusFilter === 'active' && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button onClick={handleOpenNewListModal} className="px-6 py-3 shimmer-shopping text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Create List
                    </button>
                    {!hasCompletedGuide && (
                      <button
                        onClick={() => setShowGuidedFlow(true)}
                        className="px-6 py-3 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Try Guided Creation
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {filteredLists.map((list) => (
                  <ShoppingListCard key={list.id} list={list} onEdit={handleEditList} onDelete={handleDeleteList} onToggleItem={handleToggleItem} onCompleteList={handleCompleteList} />
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
      {currentSpace && (
        <NewShoppingListModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleCreateList} editList={editingList} spaceId={currentSpace.id} />
      )}
    </FeatureLayout>
  );
}
