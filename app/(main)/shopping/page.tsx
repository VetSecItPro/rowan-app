'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Search, Plus, List, CheckCircle2, Clock, Package, X, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ShoppingListCard } from '@/components/shopping/ShoppingListCard';
import { NewShoppingListModal } from '@/components/shopping/NewShoppingListModal';
import { SaveTemplateModal } from '@/components/shopping/SaveTemplateModal';
import { TemplatePickerModal } from '@/components/shopping/TemplatePickerModal';
import { ScheduleTripModal } from '@/components/shopping/ScheduleTripModal';
import { FrequentItemsPanel } from '@/components/shopping/FrequentItemsPanel';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import GuidedShoppingCreation from '@/components/guided/GuidedShoppingCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { shoppingService, ShoppingList, CreateListInput } from '@/lib/services/shopping-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';

export default function ShoppingPage() {
  const { currentSpace, user } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week'>('all');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [listForTemplate, setListForTemplate] = useState<ShoppingList | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showScheduleTripModal, setShowScheduleTripModal] = useState(false);
  const [listToSchedule, setListToSchedule] = useState<ShoppingList | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, listId: '' });

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

    // Filter by time (this week)
    if (timeFilter === 'week') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      filtered = filtered.filter(l => {
        const createdDate = new Date(l.created_at);
        return createdDate >= startOfWeek && createdDate <= endOfWeek;
      });
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
  }, [lists, searchQuery, statusFilter, timeFilter]);

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

  // Real-time subscription for shopping lists
  useEffect(() => {
    if (!currentSpace) return;

    const channel = shoppingService.subscribeToLists(currentSpace.id, (payload) => {
      // Reload lists when any change occurs
      loadLists();
    });

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace]);

  // Memoized callback for creating/updating lists
  const handleCreateList = useCallback(async (listData: CreateListInput & { store_name?: string; budget?: number; items?: { id?: string; name: string; quantity: number; assigned_to?: string }[] }) => {
    try {
      if (editingList) {
        // Extract items before updating the list
        const { items, ...listDataOnly } = listData;

        await shoppingService.updateList(editingList.id, listDataOnly);

        // Only add NEW items (items without an ID)
        if (items && items.length > 0) {
          const newItems = items.filter(item => !item.id);
          for (const item of newItems) {
            const createdItem = await shoppingService.createItem({
              list_id: editingList.id,
              name: item.name,
              quantity: item.quantity || 1,
            } as any);

            // Update assigned_to if provided
            if (item.assigned_to) {
              await shoppingService.updateItem(createdItem.id, { assigned_to: item.assigned_to } as any);
            }
          }
        }
        // Real-time subscription will handle the update
      } else {
        // Extract items before creating the list
        const { items, ...listDataOnly } = listData;

        // Optimistic update - add to UI immediately
        const optimisticList: ShoppingList = {
          id: `temp-${Date.now()}`, // Temporary ID
          title: listDataOnly.title,
          status: listDataOnly.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          space_id: listDataOnly.space_id,
          description: listDataOnly.description || undefined,
          store_name: (listDataOnly as any).store_name || undefined,
          budget: (listDataOnly as any).budget || undefined,
          // items_count property doesn't exist in ShoppingList interface, removing
          // total_amount property doesn't exist in ShoppingList interface, removing
          completed_at: undefined,
        };

        setLists(prev => [optimisticList, ...prev]);

        try {
          console.log('Creating list with data:', listDataOnly);
          const newList = await shoppingService.createList(listDataOnly);
          console.log('List created:', newList);

          // Add items if provided
          if (items && items.length > 0) {
            console.log('Adding items:', items);
            for (const item of items) {
              const createdItem = await shoppingService.createItem({
                list_id: newList.id,
                name: item.name,
                quantity: item.quantity || 1,
              } as any);
              console.log('Item created:', createdItem);

              // Update assigned_to if provided
              if (item.assigned_to) {
                await shoppingService.updateItem(createdItem.id, { assigned_to: item.assigned_to } as any);
              }
            }
          }

          // Real-time subscription will replace the optimistic list with the real one
        } catch (error) {
          // Revert optimistic update on error
          setLists(prev => prev.filter(list => list.id !== optimisticList.id));
          throw error;
        }
      }

      setEditingList(null);
    } catch (error) {
      console.error('Failed to save list:', error);
      alert('Failed to save shopping list. Please try again.');
    }
  }, [editingList, setLists, user]);

  // Memoized callback for deleting lists
  const handleDeleteList = useCallback(async (listId: string) => {
    setConfirmDialog({ isOpen: true, listId });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const listId = confirmDialog.listId;
    setConfirmDialog({ isOpen: false, listId: '' });

    // Optimistic update - remove from UI immediately
    setLists(prevLists => prevLists.filter(list => list.id !== listId));

    try {
      await shoppingService.deleteList(listId);
      // Success - already removed from UI
    } catch (error) {
      console.error('Failed to delete list:', error);
      // Revert on error - reload lists to restore deleted item
      loadLists();
    }
  }, [confirmDialog]);

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

  // Memoized callback for updating item quantity
  const handleUpdateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    // Optimistic update
    setLists(prevLists =>
      prevLists.map(list => ({
        ...list,
        items: list.items?.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      }))
    );

    try {
      await shoppingService.updateItem(itemId, { quantity: newQuantity } as any);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      // Revert on error
      loadLists();
    }
  }, []);

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
    setShowTemplatePicker(true);
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback(async (templateId: string) => {
    if (!currentSpace) return;
    try {
      await shoppingService.createListFromTemplate(templateId, currentSpace.id);
      loadLists();
    } catch (error) {
      console.error('Failed to create list from template:', error);
      throw error;
    }
  }, [currentSpace]);

  // Handle start fresh (open modal)
  const handleStartFresh = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Memoized callback for search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Handle typing animation
    if (value.length > 0) {
      setIsSearchTyping(true);
      const timeoutId = setTimeout(() => setIsSearchTyping(false), 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearchTyping(false);
    }
  }, []);

  // Memoized callback for clearing search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchTyping(false);
  }, []);

  // Memoized callbacks for stat card clicks
  const handleTotalListsClick = useCallback(() => {
    setStatusFilter('all');
    setTimeFilter('all');
  }, []);

  const handleActiveListsClick = useCallback(() => {
    setStatusFilter('active');
    setTimeFilter('all');
  }, []);

  const handleItemsThisWeekClick = useCallback(() => {
    setStatusFilter('all');
    setTimeFilter('week');
  }, []);

  const handleCompletedListsClick = useCallback(() => {
    setStatusFilter('completed');
    setTimeFilter('all');
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

  const handleSaveAsTemplate = useCallback((list: ShoppingList) => {
    setListForTemplate(list);
    setShowTemplateModal(true);
  }, []);

  const handleSaveTemplate = useCallback(async (name: string, description: string) => {
    if (!currentSpace || !listForTemplate || !listForTemplate.items) return;

    try {
      await shoppingService.createTemplate(
        currentSpace.id,
        name,
        description,
        listForTemplate.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          category: item.category,
        }))
      );

      // Show success message
      alert('Template saved successfully!');
      setShowTemplateModal(false);
      setListForTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }, [currentSpace, listForTemplate]);

  const handleScheduleTrip = useCallback((list: ShoppingList) => {
    setListToSchedule(list);
    setShowScheduleTripModal(true);
  }, []);

  const handleScheduleTripSubmit = useCallback(async (eventData: {
    title: string;
    date: string;
    time: string;
    duration: number;
    reminderMinutes?: number;
  }) => {
    if (!currentSpace || !listToSchedule) return;

    try {
      // First, create the calendar event
      const { calendarService } = await import('@/lib/services/calendar-service');

      // Combine date and time into a proper datetime
      const startDateTime = new Date(`${eventData.date}T${eventData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);

      const calendarEvent = await calendarService.createEvent({
        space_id: currentSpace.id,
        title: eventData.title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        description: `Shopping trip for list: ${listToSchedule.title}`,
        category: 'personal',
        location: listToSchedule.store_name || undefined,
      });

      // Create a reminder if reminderMinutes is specified
      if (eventData.reminderMinutes && eventData.reminderMinutes > 0) {
        const { remindersService } = await import('@/lib/services/reminders-service');

        // Calculate reminder time (event start time minus reminder minutes)
        const reminderTime = new Date(startDateTime.getTime() - eventData.reminderMinutes * 60000);

        const reminder = await remindersService.createReminder({
          space_id: currentSpace.id,
          title: `Shopping Trip: ${listToSchedule.title}`,
          description: `Reminder for shopping trip${listToSchedule.store_name ? ` at ${listToSchedule.store_name}` : ''}`,
          emoji: '🛒',
          category: 'personal',
          reminder_type: 'time',
          reminder_time: reminderTime.toISOString(),
          location: listToSchedule.store_name || undefined,
          priority: 'medium',
          status: 'active',
        });

        // Link the reminder to the shopping list
        await shoppingIntegrationService.linkToReminder(
          reminder.id,
          listToSchedule.id,
          undefined,
          'time'
        );
      }

      // Link the shopping list to the calendar event
      await shoppingIntegrationService.linkToCalendar(
        listToSchedule.id,
        calendarEvent.id,
        eventData.reminderMinutes
      );

      // Show success message
      alert(`Shopping trip scheduled for ${eventData.date} at ${eventData.time}!`);
      setShowScheduleTripModal(false);
      setListToSchedule(null);
    } catch (error) {
      console.error('Failed to schedule trip:', error);
      throw error;
    }
  }, [currentSpace, listToSchedule]);

  const handleCreateTask = useCallback(async (list: ShoppingList) => {
    if (!currentSpace) return;

    try {
      // Create a task linked to the shopping list
      const { tasksService } = await import('@/lib/services/tasks-service');

      const task = await tasksService.createTask({
        space_id: currentSpace.id,
        title: `Complete shopping: ${list.title}`,
        description: `Shopping list with ${list.items?.length || 0} items${list.store_name ? ` at ${list.store_name}` : ''}`,
        priority: 'medium',
        status: 'pending',
        assigned_to: null,
        due_date: null,
        category: 'shopping',
        calendar_sync: false,
        quick_note: null,
        tags: null,
        estimated_hours: null,
        created_by: user?.id || '',
      });

      // Link the task to the shopping list
      await shoppingIntegrationService.linkToTask(list.id, task.id);

      // Show success message
      alert(`Task created: ${task.title}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  }, [currentSpace]);

  // Handler for adding frequent items
  const handleAddFrequentItem = useCallback(async (itemName: string, category: string) => {
    if (!currentSpace) return;

    try {
      // Find the first active list or create a "Quick Add" list
      let targetList = lists.find(l => l.status === 'active');

      if (!targetList) {
        // Create a new "Quick Add" list
        targetList = await shoppingService.createList({
          space_id: currentSpace.id,
          title: 'Quick Add List',
          description: 'Items added from frequent suggestions',
        });
      }

      // Add the item to the list
      await shoppingService.createItem({
        list_id: targetList.id,
        name: itemName,
        quantity: 1,
        category,
      });

      // Reload lists to show the update
      await loadLists();
    } catch (error) {
      console.error('Failed to add frequent item:', error);
    }
  }, [currentSpace, lists]);

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
          <div className="stats-grid-mobile gap-4 sm:gap-6">
            <button
              onClick={handleItemsThisWeekClick}
              className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Items This Week</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.itemsThisWeek}</p>
                {memoizedStats.itemsThisWeek > 0 && (
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <Package className="w-3 h-3" />
                    <span className="text-xs font-medium">New items</span>
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleActiveListsClick}
              className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active Lists</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.activeLists}</p>
                {memoizedStats.activeLists > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">In progress</span>
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={handleCompletedListsClick}
              className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed Lists</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.completedLists}</p>
                {memoizedStats.totalLists > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {(() => {
                        const percentage = Math.round((memoizedStats.completedLists / memoizedStats.totalLists) * 100);
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
              className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Lists</h3>
                <div className="w-12 h-12 bg-gradient-shopping rounded-xl flex items-center justify-center"><List className="w-6 h-6 text-white" /></div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{memoizedStats.totalLists}</p>
                {memoizedStats.totalLists > 0 && (
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <List className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </button>
          </div>
          )}

          {/* Frequent Items Panel - Only show when NOT in guided flow and when there are active lists */}
          {!showGuidedFlow && currentSpace && lists.length > 0 && (
            <FrequentItemsPanel
              spaceId={currentSpace.id}
              onAddItem={handleAddFrequentItem}
            />
          )}

          {/* Apple-Inspired Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
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
          </div>
          )}

          {/* Shopping Lists - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            {/* Header with Month Badge and Status Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {timeFilter === 'week' ? 'This Week\'s Lists' : 'All Shopping Lists'} ({filteredLists.length})
                </h2>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                  {timeFilter === 'week' ? 'This Week' : format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Status Filter - Segmented Buttons */}
              <div className="bg-gray-50 dark:bg-gray-900 border-2 border-emerald-200 dark:border-emerald-700 rounded-lg p-1 flex gap-1 w-fit">
                <button
                  onClick={() => { setStatusFilter('all'); setTimeFilter('all'); }}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'all' && timeFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setTimeFilter('week'); }}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                    timeFilter === 'week'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => { setStatusFilter('active'); setTimeFilter('all'); }}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'active' && timeFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => { setStatusFilter('completed'); setTimeFilter('all'); }}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                    statusFilter === 'completed' && timeFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                      <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-24" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded flex-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLists.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No lists found</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">{searchQuery || statusFilter !== 'active' ? 'Try adjusting your filters' : 'Create your first shopping list!'}</p>
                {!searchQuery && statusFilter === 'active' && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button onClick={handleOpenNewListModal} className="btn-touch shimmer-shopping text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Create List
                    </button>
                    {!hasCompletedGuide && (
                      <button
                        onClick={() => setShowGuidedFlow(true)}
                        className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
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
          )}
        </div>
      </div>
      {currentSpace && (
        <>
          <TemplatePickerModal
            isOpen={showTemplatePicker}
            onClose={() => setShowTemplatePicker(false)}
            onSelectTemplate={handleSelectTemplate}
            onStartFresh={handleStartFresh}
            spaceId={currentSpace.id}
          />
          <NewShoppingListModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleCreateList} editList={editingList} spaceId={currentSpace.id} />
          {listForTemplate && (
            <SaveTemplateModal
              isOpen={showTemplateModal}
              onClose={() => {
                setShowTemplateModal(false);
                setListForTemplate(null);
              }}
              onSave={handleSaveTemplate}
              list={listForTemplate}
            />
          )}
          {listToSchedule && (
            <ScheduleTripModal
              isOpen={showScheduleTripModal}
              onClose={() => {
                setShowScheduleTripModal(false);
                setListToSchedule(null);
              }}
              onSchedule={handleScheduleTripSubmit}
              list={listToSchedule}
            />
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, listId: '' })}
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
