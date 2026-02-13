'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { shoppingService, ShoppingList, CreateListInput } from '@/lib/services/shopping-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { calendarService } from '@/lib/services/calendar-service';
import { remindersService } from '@/lib/services/reminders-service';
import { QUERY_KEYS } from '@/lib/react-query/query-client';
import { logger } from '@/lib/logger';
import { showError, showSuccess, showWarning, showInfo } from '@/lib/utils/toast';
import type { StatusFilter, TimeFilter } from '@/lib/hooks/useShoppingData';
import type { ConfirmDialogState } from '@/lib/hooks/useShoppingModals';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateListData = CreateListInput & {
  store_name?: string;
  budget?: number;
  items?: {
    id?: string;
    name: string;
    quantity: number;
    assigned_to?: string;
  }[];
};

export type ScheduleTripEventData = {
  title: string;
  date: string;
  time: string;
  duration: number;
  reminderMinutes?: number;
};

// ─── Dependencies interface ───────────────────────────────────────────────────

export interface UseShoppingHandlersDeps {
  // Auth
  user: { id: string; email?: string } | null;
  currentSpace: { id: string } | null;
  spaceId: string | undefined;

  // Core data
  lists: ShoppingList[];

  // Data refresh
  invalidateShopping: () => void;

  // Modal state setters (from useShoppingModals)
  editingList: ShoppingList | null;
  setEditingList: React.Dispatch<React.SetStateAction<ShoppingList | null>>;
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  listForTemplate: ShoppingList | null;
  setShowTemplateModal: React.Dispatch<React.SetStateAction<boolean>>;
  setListForTemplate: React.Dispatch<React.SetStateAction<ShoppingList | null>>;
  listToSchedule: ShoppingList | null;
  setShowScheduleTripModal: React.Dispatch<React.SetStateAction<boolean>>;
  setListToSchedule: React.Dispatch<React.SetStateAction<ShoppingList | null>>;

  // Search/filter setters (from useShoppingData)
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<StatusFilter>>;
  setTimeFilter: React.Dispatch<React.SetStateAction<TimeFilter>>;
}

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseShoppingHandlersReturn {
  handleCreateList: (listData: CreateListData) => Promise<void>;
  handleDeleteList: (listId: string) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCompleteList: (listId: string) => Promise<void>;
  handleToggleItem: (itemId: string, checked: boolean) => Promise<void>;
  handleUpdateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  handleSelectTemplate: (templateId: string) => Promise<void>;
  handleSaveTemplate: (name: string, description: string) => Promise<void>;
  handleScheduleTripSubmit: (eventData: ScheduleTripEventData) => Promise<void>;
  handleCreateTask: (list: ShoppingList) => Promise<void>;
  handleAddFrequentItem: (itemName: string, category: string) => Promise<void>;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearSearch: () => void;
  handleTotalListsClick: () => void;
  handleActiveListsClick: () => void;
  handleItemsThisWeekClick: () => void;
  handleCompletedListsClick: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useShoppingHandlers(deps: UseShoppingHandlersDeps): UseShoppingHandlersReturn {
  const {
    user,
    currentSpace,
    spaceId,
    lists,
    invalidateShopping,
    editingList,
    setEditingList,
    confirmDialog,
    setConfirmDialog,
    listForTemplate,
    setShowTemplateModal,
    setListForTemplate,
    listToSchedule,
    setShowScheduleTripModal,
    setListToSchedule,
    setSearchQuery,
    setIsSearchTyping,
    setStatusFilter,
    setTimeFilter,
  } = deps;

  const queryClient = useQueryClient();

  // ─── List CRUD handlers ────────────────────────────────────────────────────

  const handleCreateList = useCallback(async (listData: CreateListData) => {
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
            });

            // Update assigned_to if provided
            if (item.assigned_to) {
              await shoppingService.updateItem(createdItem.id, { assigned_to: item.assigned_to });
            }
          }
        }
        invalidateShopping();
      } else {
        // Extract items before creating the list
        const { items, ...listDataOnly } = listData;

        // Optimistic update via query cache
        const optimisticList: ShoppingList = {
          id: `temp-${Date.now()}`,
          title: listDataOnly.title,
          status: listDataOnly.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          space_id: listDataOnly.space_id,
          description: listDataOnly.description || undefined,
          store_name: listDataOnly.store_name || undefined,
          budget: listDataOnly.budget || undefined,
          created_by: user?.id || '',
          completed_at: undefined,
        };

        queryClient.setQueryData<ShoppingList[]>(
          QUERY_KEYS.shopping.lists(spaceId || ''),
          (old) => [optimisticList, ...(old || [])],
        );

        try {
          const newList = await shoppingService.createList(listDataOnly);

          // Add items if provided
          if (items && items.length > 0) {
            for (const item of items) {
              const createdItem = await shoppingService.createItem({
                list_id: newList.id,
                name: item.name,
                quantity: item.quantity || 1,
              });

              // Update assigned_to if provided
              if (item.assigned_to) {
                await shoppingService.updateItem(createdItem.id, { assigned_to: item.assigned_to });
              }
            }
          }

          // Invalidate to replace optimistic data with real data
          invalidateShopping();
        } catch (error) {
          // Revert optimistic update on error
          queryClient.setQueryData<ShoppingList[]>(
            QUERY_KEYS.shopping.lists(spaceId || ''),
            (old) => (old || []).filter(list => list.id !== optimisticList.id),
          );
          throw error;
        }
      }

      setEditingList(null);
    } catch (error) {
      logger.error('Failed to save list:', error, { component: 'page', action: 'execution' });
      showError('Failed to save shopping list. Please try again.');
    }
  }, [editingList, user, spaceId, queryClient, invalidateShopping, setEditingList]);

  const handleDeleteList = useCallback((listId: string) => {
    // Prevent actions on optimistic lists (temp IDs)
    if (listId.startsWith('temp-')) {
      showInfo('Please wait for the list to finish saving before deleting.');
      return;
    }

    setConfirmDialog({ isOpen: true, listId });
  }, [setConfirmDialog]);

  const handleConfirmDelete = useCallback(async () => {
    const listId = confirmDialog.listId;
    setConfirmDialog({ isOpen: false, listId: '' });

    // Optimistic update via query cache
    const previousLists = queryClient.getQueryData<ShoppingList[]>(QUERY_KEYS.shopping.lists(spaceId || ''));
    queryClient.setQueryData<ShoppingList[]>(
      QUERY_KEYS.shopping.lists(spaceId || ''),
      (old) => (old || []).filter(list => list.id !== listId),
    );

    try {
      await shoppingService.deleteList(listId);
      invalidateShopping();
    } catch (error) {
      logger.error('Failed to delete list:', error, { component: 'page', action: 'execution' });
      // Revert on error
      if (previousLists) {
        queryClient.setQueryData(QUERY_KEYS.shopping.lists(spaceId || ''), previousLists);
      }
    }
  }, [confirmDialog, spaceId, queryClient, invalidateShopping, setConfirmDialog]);

  const handleCompleteList = useCallback(async (listId: string) => {
    // Prevent actions on optimistic lists (temp IDs)
    if (listId.startsWith('temp-')) {
      showInfo('Please wait for the list to finish saving before completing.');
      return;
    }

    try {
      // Optimistic update via query cache
      queryClient.setQueryData<ShoppingList[]>(
        QUERY_KEYS.shopping.lists(spaceId || ''),
        (old) => (old || []).map(list =>
          list.id === listId ? { ...list, status: 'completed' as const } : list
        ),
      );

      await shoppingService.updateList(listId, { status: 'completed' });
      invalidateShopping();
    } catch (error) {
      logger.error('Failed to complete list:', error, { component: 'page', action: 'execution' });
      invalidateShopping();
    }
  }, [spaceId, queryClient, invalidateShopping]);

  // ─── Item handlers ─────────────────────────────────────────────────────────

  const handleToggleItem = useCallback(async (itemId: string, checked: boolean) => {
    // Optimistic update via query cache
    queryClient.setQueryData<ShoppingList[]>(
      QUERY_KEYS.shopping.lists(spaceId || ''),
      (old) => (old || []).map(list => ({
        ...list,
        items: list.items?.map(item =>
          item.id === itemId ? { ...item, checked } : item
        )
      })),
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
      logger.error('Failed to toggle item:', error, { component: 'page', action: 'execution' });
      invalidateShopping();
    }
  }, [lists, handleCompleteList, spaceId, queryClient, invalidateShopping]);

  const handleUpdateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    // Optimistic update via query cache
    queryClient.setQueryData<ShoppingList[]>(
      QUERY_KEYS.shopping.lists(spaceId || ''),
      (old) => (old || []).map(list => ({
        ...list,
        items: list.items?.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      })),
    );

    try {
      await shoppingService.updateItem(itemId, { quantity: newQuantity });
    } catch (error) {
      logger.error('Failed to update quantity:', error, { component: 'page', action: 'execution' });
      invalidateShopping();
    }
  }, [spaceId, queryClient, invalidateShopping]);

  // ─── Template handlers ─────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback(async (templateId: string) => {
    if (!spaceId) return;
    try {
      await shoppingService.createListFromTemplate(templateId, spaceId);
      invalidateShopping();
    } catch (error) {
      logger.error('Failed to create list from template:', error, { component: 'page', action: 'execution' });
      throw error;
    }
  }, [spaceId, invalidateShopping]);

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
      showSuccess('Template saved successfully!');
      setShowTemplateModal(false);
      setListForTemplate(null);
    } catch (error) {
      logger.error('Failed to save template:', error, { component: 'page', action: 'execution' });
      throw error;
    }
  }, [currentSpace, listForTemplate, setShowTemplateModal, setListForTemplate]);

  // ─── Schedule trip handler ─────────────────────────────────────────────────

  const handleScheduleTripSubmit = useCallback(async (eventData: ScheduleTripEventData) => {
    if (!currentSpace || !listToSchedule) {
      logger.error('Missing required data: currentSpace or listToSchedule', undefined, { component: 'page', action: 'execution' });
      showError('Unable to schedule trip. Please try again.');
      return;
    }

    try {
      logger.info('Starting trip scheduling...', { component: 'page', data: { eventData, listId: listToSchedule.id } });

      // Combine date and time into a proper datetime
      const startDateTime = new Date(`${eventData.date}T${eventData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);

      logger.info('Creating calendar event...', { component: 'page' });

      // First, create the calendar event
      const calendarEvent = await calendarService.createEvent({
        space_id: currentSpace.id,
        title: eventData.title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        description: `Shopping trip for list: ${listToSchedule.title}`,
        category: 'personal',
        location: listToSchedule.store_name || undefined,
      });

      logger.info('Calendar event created:', { component: 'page', data: calendarEvent.id });

      // Create a reminder if reminderMinutes is specified
      let reminder = null;
      if (eventData.reminderMinutes && eventData.reminderMinutes > 0) {
        logger.info('Creating reminder...', { component: 'page' });

        // Calculate reminder time (event start time minus reminder minutes)
        const reminderTime = new Date(startDateTime.getTime() - eventData.reminderMinutes * 60000);

        reminder = await remindersService.createReminder({
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

        logger.info('Reminder created:', { component: 'page', data: reminder.id });

        // Link the reminder to the shopping list
        await shoppingIntegrationService.linkToReminder(
          reminder.id,
          listToSchedule.id,
          undefined,
          'time'
        );

        logger.info('Reminder linked to shopping list', { component: 'page' });
      }

      // Link the shopping list to the calendar event
      logger.info('Linking calendar event to shopping list...', { component: 'page' });
      await shoppingIntegrationService.linkToCalendar(
        listToSchedule.id,
        calendarEvent.id,
        eventData.reminderMinutes
      );

      logger.info('Trip scheduling completed successfully', { component: 'page' });

      // Show success message
      showSuccess(`Shopping trip scheduled for ${eventData.date} at ${eventData.time}!`);
      setShowScheduleTripModal(false);
      setListToSchedule(null);
    } catch (error) {
      logger.error('Failed to schedule trip:', error, { component: 'page', action: 'execution' });
      let errorMessage = 'Failed to schedule shopping trip. ';

      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }

      showError(errorMessage);
      throw error;
    }
  }, [currentSpace, listToSchedule, setShowScheduleTripModal, setListToSchedule]);

  // ─── Task creation handler ─────────────────────────────────────────────────

  const handleCreateTask = useCallback(async (list: ShoppingList) => {
    if (!currentSpace) return;

    // Prevent actions on optimistic lists (temp IDs)
    if (list.id.startsWith('temp-')) {
      showInfo('Please wait for the list to finish saving before creating a task.');
      return;
    }

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
      showSuccess(`Task created: ${task.title}`);
    } catch (error) {
      logger.error('Failed to create task:', error, { component: 'page', action: 'execution' });
      showError('Failed to create task. Please try again.');
    }
  }, [currentSpace, user?.id]);

  // ─── Frequent items handler ────────────────────────────────────────────────

  const handleAddFrequentItem = useCallback(async (itemName: string, category: string) => {
    if (!spaceId) return;

    try {
      // Find the first active list or create a "Quick Add" list
      let targetList = lists.find(l => l.status === 'active');

      if (!targetList) {
        // Create a new "Quick Add" list
        targetList = await shoppingService.createList({
          space_id: spaceId,
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

      invalidateShopping();
    } catch (error) {
      logger.error('Failed to add frequent item:', error, { component: 'page', action: 'execution' });
    }
  }, [spaceId, lists, invalidateShopping]);

  // ─── Search handlers ───────────────────────────────────────────────────────

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
  }, [setSearchQuery, setIsSearchTyping]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchTyping(false);
  }, [setSearchQuery, setIsSearchTyping]);

  // ─── Stat card click handlers ──────────────────────────────────────────────

  const handleTotalListsClick = useCallback(() => {
    setStatusFilter('all');
    setTimeFilter('all');
  }, [setStatusFilter, setTimeFilter]);

  const handleActiveListsClick = useCallback(() => {
    setStatusFilter('active');
    setTimeFilter('all');
  }, [setStatusFilter, setTimeFilter]);

  const handleItemsThisWeekClick = useCallback(() => {
    setStatusFilter('all');
    setTimeFilter('week');
  }, [setStatusFilter, setTimeFilter]);

  const handleCompletedListsClick = useCallback(() => {
    setStatusFilter('completed');
    setTimeFilter('all');
  }, [setStatusFilter, setTimeFilter]);

  return {
    handleCreateList,
    handleDeleteList,
    handleConfirmDelete,
    handleCompleteList,
    handleToggleItem,
    handleUpdateQuantity,
    handleSelectTemplate,
    handleSaveTemplate,
    handleScheduleTripSubmit,
    handleCreateTask,
    handleAddFrequentItem,
    handleSearchChange,
    handleClearSearch,
    handleTotalListsClick,
    handleActiveListsClick,
    handleItemsThisWeekClick,
    handleCompletedListsClick,
  };
}
