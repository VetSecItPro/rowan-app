// Unified Calendar Service
// Phase 9: Fetches and combines all calendar-displayable items

import { createClient } from '@/lib/supabase/client';
import { calendarService } from '@/lib/services/calendar-service';
import { tasksService } from '@/lib/services/tasks-service';
import { mealsService } from '@/lib/services/meals-service';
import { remindersService } from '@/lib/services/reminders-service';
import { unifiedCalendarMapper } from './unified-calendar-mapper';
import type {
  UnifiedCalendarItem,
  UnifiedCalendarFilters,
  UnifiedCalendarFetchOptions,
  UnifiedCalendarFetchResult,
  DEFAULT_UNIFIED_FILTERS,
} from '@/lib/types/unified-calendar-item';

/**
 * Unified Calendar Service
 * Fetches all calendar-displayable items and combines them into a unified format
 *
 * This service is designed to be additive - it doesn't modify any existing services
 * and only reads data from them.
 */
export const unifiedCalendarService = {
  /**
   * Fetch all unified calendar items for a date range
   *
   * @param options - Fetch options including date range and filters
   * @returns Promise<UnifiedCalendarFetchResult> - Combined items from all sources
   */
  async getUnifiedItems(options: UnifiedCalendarFetchOptions): Promise<UnifiedCalendarFetchResult> {
    const {
      startDate,
      endDate,
      filters = {
        showEvents: true,
        showTasks: true,
        showMeals: true,
        showReminders: true,
        showGoals: true,
      },
      includeCompleted = false,
      spaceId,
    } = options;

    const allItems: UnifiedCalendarItem[] = [];
    const errors: string[] = [];

    // Fetch all item types in parallel for performance
    const fetchPromises: Promise<void>[] = [];

    // Fetch calendar events
    if (filters.showEvents) {
      fetchPromises.push(
        this.fetchEvents(spaceId, startDate, endDate)
          .then((items) => {
            allItems.push(...items);
          })
          .catch((error) => {
            console.error('[UnifiedCalendar] Error fetching events:', error);
            errors.push('Failed to fetch calendar events');
          })
      );
    }

    // Fetch tasks with due dates
    if (filters.showTasks) {
      fetchPromises.push(
        this.fetchTasks(spaceId, startDate, endDate, includeCompleted)
          .then((items) => {
            allItems.push(...items);
          })
          .catch((error) => {
            console.error('[UnifiedCalendar] Error fetching tasks:', error);
            errors.push('Failed to fetch tasks');
          })
      );
    }

    // Fetch scheduled meals
    if (filters.showMeals) {
      fetchPromises.push(
        this.fetchMeals(spaceId, startDate, endDate)
          .then((items) => {
            allItems.push(...items);
          })
          .catch((error) => {
            console.error('[UnifiedCalendar] Error fetching meals:', error);
            errors.push('Failed to fetch meals');
          })
      );
    }

    // Fetch reminders
    if (filters.showReminders) {
      fetchPromises.push(
        this.fetchReminders(spaceId, startDate, endDate, includeCompleted)
          .then((items) => {
            allItems.push(...items);
          })
          .catch((error) => {
            console.error('[UnifiedCalendar] Error fetching reminders:', error);
            errors.push('Failed to fetch reminders');
          })
      );
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);

    // Sort all items by start time
    const sortedItems = unifiedCalendarMapper.sortByStartTime(allItems);

    // Count items by type
    const counts = unifiedCalendarMapper.countByType(sortedItems);

    return {
      items: sortedItems,
      counts,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  /**
   * Fetch and map calendar events
   */
  async fetchEvents(
    spaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UnifiedCalendarItem[]> {
    try {
      // Use the existing calendar service with recurring support
      const events = await calendarService.getEventsWithRecurring(
        spaceId,
        startDate,
        endDate,
        false // Don't include deleted
      );

      return unifiedCalendarMapper.mapEvents(events);
    } catch (error) {
      console.error('[UnifiedCalendar] fetchEvents error:', error);
      throw error;
    }
  },

  /**
   * Fetch and map tasks with due dates
   */
  async fetchTasks(
    spaceId: string,
    startDate: Date,
    endDate: Date,
    includeCompleted: boolean
  ): Promise<UnifiedCalendarItem[]> {
    try {
      // Get tasks using the existing service
      const statusFilter = includeCompleted
        ? undefined
        : ['pending', 'in-progress', 'blocked', 'on-hold'] as ('pending' | 'in-progress' | 'blocked' | 'on-hold')[];

      const tasks = await tasksService.getTasks(spaceId, {
        status: statusFilter,
      });

      // Map to unified items (mapper filters out tasks without due dates)
      const mappedItems = unifiedCalendarMapper.mapTasks(tasks);

      // Filter by date range
      return unifiedCalendarMapper.filterByDateRange(mappedItems, startDate, endDate);
    } catch (error) {
      console.error('[UnifiedCalendar] fetchTasks error:', error);
      throw error;
    }
  },

  /**
   * Fetch and map scheduled meals
   */
  async fetchMeals(
    spaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UnifiedCalendarItem[]> {
    try {
      // Get meals using the existing service
      const meals = await mealsService.getMeals(spaceId);

      // Map to unified items
      const mappedItems = unifiedCalendarMapper.mapMeals(meals);

      // Filter by date range
      return unifiedCalendarMapper.filterByDateRange(mappedItems, startDate, endDate);
    } catch (error) {
      console.error('[UnifiedCalendar] fetchMeals error:', error);
      throw error;
    }
  },

  /**
   * Fetch and map reminders
   */
  async fetchReminders(
    spaceId: string,
    startDate: Date,
    endDate: Date,
    includeCompleted: boolean
  ): Promise<UnifiedCalendarItem[]> {
    try {
      // Get reminders using the existing service
      const reminders = await remindersService.getReminders(spaceId);

      // Filter out completed if not including them
      const filteredReminders = includeCompleted
        ? reminders
        : reminders.filter((r) => r.status !== 'completed');

      // Map to unified items (mapper filters out reminders without reminder_time)
      const mappedItems = unifiedCalendarMapper.mapReminders(filteredReminders);

      // Filter by date range
      return unifiedCalendarMapper.filterByDateRange(mappedItems, startDate, endDate);
    } catch (error) {
      console.error('[UnifiedCalendar] fetchReminders error:', error);
      throw error;
    }
  },

  /**
   * Get items grouped by date for a date range
   */
  async getItemsByDate(
    options: UnifiedCalendarFetchOptions
  ): Promise<Map<string, UnifiedCalendarItem[]>> {
    const result = await this.getUnifiedItems(options);
    return unifiedCalendarMapper.groupByDate(result.items);
  },

  /**
   * Get items for a single date
   */
  async getItemsForDate(
    spaceId: string,
    date: Date,
    filters?: UnifiedCalendarFilters
  ): Promise<UnifiedCalendarItem[]> {
    // Create date range for the single day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const result = await this.getUnifiedItems({
      spaceId,
      startDate,
      endDate,
      filters,
    });

    return result.items;
  },

  /**
   * Get upcoming items (today and future)
   */
  async getUpcomingItems(
    spaceId: string,
    daysAhead: number = 7,
    filters?: UnifiedCalendarFilters
  ): Promise<UnifiedCalendarItem[]> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    const result = await this.getUnifiedItems({
      spaceId,
      startDate,
      endDate,
      filters,
    });

    return result.items;
  },

  /**
   * Get item counts for a month (for calendar dots/indicators)
   */
  async getMonthItemCounts(
    spaceId: string,
    year: number,
    month: number, // 0-indexed
    filters?: UnifiedCalendarFilters
  ): Promise<Map<string, number>> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const result = await this.getUnifiedItems({
      spaceId,
      startDate,
      endDate,
      filters,
    });

    // Group by date and count
    const grouped = unifiedCalendarMapper.groupByDate(result.items);
    const counts = new Map<string, number>();

    for (const [dateKey, items] of grouped) {
      counts.set(dateKey, items.length);
    }

    return counts;
  },
};
