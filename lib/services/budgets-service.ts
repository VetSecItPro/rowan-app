import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Expense Types
export interface Expense {
  id: string;
  space_id: string;
  title: string;
  amount: number;
  category?: string;
  payment_method?: string;
  paid_by?: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date?: string;
  paid_at?: string;
  recurring?: boolean;
  notes?: string;
  split_type?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  space_id: string;
  title: string;
  amount: number;
  category?: string;
  payment_method?: string;
  paid_by?: string;
  status?: 'pending' | 'paid' | 'overdue';
  due_date?: string;
  date?: string;
  paid_at?: string;
  recurring?: boolean;
  description?: string;
}

// Budget Types
export interface BudgetStats {
  monthlyBudget: number;
  spentThisMonth: number;
  remaining: number;
  pendingBills: number;
}

// Removed: HouseholdStats moved to appropriate services (chores-service.ts for chores, this file for budgets)

export interface Budget {
  id: string;
  space_id: string;
  monthly_budget: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Smart Budget Alerts fields
  threshold_50_enabled?: boolean;
  threshold_75_enabled?: boolean;
  threshold_90_enabled?: boolean;
  notifications_enabled?: boolean;
  notification_preferences?: {
    email: boolean;
    push: boolean;
    toast: boolean;
  };
  last_alert_sent_at?: string;
  last_alert_threshold?: number;
}

export interface CreateBudgetInput {
  space_id: string;
  monthly_budget: number;
}

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/**
 * Service for managing budgets and expenses within a household space.
 * Provides CRUD operations for expenses, budget management, and real-time subscriptions.
 */
export const projectsService = {
  /**
   * Retrieves all expenses for a given space, ordered by due date.
   * @param spaceId - The unique identifier of the space
   * @param supabaseClient - Optional Supabase client instance for server-side usage
   * @returns Array of expense records
   * @throws Error if the database query fails
   */
  async getExpenses(spaceId: string, supabaseClient?: SupabaseClient): Promise<Expense[]> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('expenses')
      .select('id, space_id, title, amount, category, date, due_date, paid_by, description, notes, project_id, status, payment_method, paid_at, recurring, is_recurring, recurring_frequency, split_type, created_by, created_at, updated_at')
      .eq('space_id', spaceId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves a single expense by its unique identifier.
   * @param id - The expense ID
   * @param supabaseClient - Optional Supabase client instance
   * @returns The expense record or null if not found
   * @throws Error if the database query fails
   */
  async getExpenseById(id: string, supabaseClient?: SupabaseClient): Promise<Expense | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('expenses')
      .select('id, space_id, title, amount, category, date, due_date, paid_by, description, notes, project_id, status, payment_method, paid_at, recurring, is_recurring, recurring_frequency, split_type, created_by, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a new expense record in the database.
   * Defaults status to 'pending' and recurring to false if not specified.
   * @param input - The expense creation data
   * @param supabaseClient - Optional Supabase client instance
   * @returns The newly created expense record
   * @throws Error if the insert operation fails
   */
  async createExpense(input: CreateExpenseInput, supabaseClient?: SupabaseClient): Promise<Expense> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        ...input,
        status: input.status || 'pending',
        recurring: input.recurring || false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates an existing expense record.
   * Automatically sets paid_at timestamp when status changes to 'paid',
   * and clears it when status changes to any other value.
   * @param id - The expense ID to update
   * @param updates - Partial expense data to update
   * @param supabaseClient - Optional Supabase client instance
   * @returns The updated expense record
   * @throws Error if the update operation fails
   */
  async updateExpense(id: string, updates: Partial<CreateExpenseInput>, supabaseClient?: SupabaseClient): Promise<Expense> {
    const supabase = getSupabaseClient(supabaseClient);
    const finalUpdates: Partial<Omit<CreateExpenseInput, 'paid_at'>> & { paid_at?: string | null } = { ...updates };

    if (updates.status === 'paid' && !finalUpdates.paid_at) {
      finalUpdates.paid_at = new Date().toISOString();
    }

    if (updates.status && updates.status !== 'paid') {
      finalUpdates.paid_at = null;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Permanently deletes an expense record.
   * @param id - The expense ID to delete
   * @param supabaseClient - Optional Supabase client instance
   * @throws Error if the delete operation fails
   */
  async deleteExpense(id: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = getSupabaseClient(supabaseClient);
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Retrieves the budget configuration for a space.
   * Returns null for invalid space IDs or if no budget exists.
   * @param spaceId - The space ID
   * @param supabaseClient - Optional Supabase client instance
   * @returns The budget record or null if not found
   */
  async getBudget(spaceId: string, supabaseClient?: SupabaseClient): Promise<Budget | null> {
    // Return null if spaceId is invalid
    if (!spaceId || spaceId === 'undefined' || spaceId === 'null') {
      return null;
    }

    try {
      const supabase = getSupabaseClient(supabaseClient);
      const { data, error } = await supabase
        .from('budgets')
        .select('id, space_id, monthly_budget, created_by, created_at, updated_at')
        .eq('space_id', spaceId)
        .maybeSingle();

      if (error) {
        logger.error('getBudget error:', error, { component: 'lib-budgets-service', action: 'service_call' });
        return null;
      }
      return data;
    } catch (error) {
      logger.error('getBudget exception:', error, { component: 'lib-budgets-service', action: 'service_call' });
      return null;
    }
  },

  /**
   * Creates or updates the budget for a space.
   * If a budget already exists, updates it; otherwise creates a new one.
   * @param input - The budget configuration data
   * @param userId - The ID of the user setting the budget
   * @param supabaseClient - Optional Supabase client instance
   * @returns The created or updated budget record
   * @throws Error if the upsert operation fails
   */
  async setBudget(input: CreateBudgetInput, userId: string, supabaseClient?: SupabaseClient): Promise<Budget> {
    const supabase = getSupabaseClient(supabaseClient);
    // Check if budget exists
    const existing = await this.getBudget(input.space_id, supabase);

    if (existing) {
      // Update existing budget
      const { data, error } = await supabase
        .from('budgets')
        .update({
          monthly_budget: input.monthly_budget,
          updated_at: new Date().toISOString(),
        })
        .eq('space_id', input.space_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from('budgets')
        .insert([{
          ...input,
          created_by: userId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Calculates budget statistics for the current month.
   * Includes monthly budget, spending totals, remaining balance, and pending bills count.
   * Returns default values (all zeros) if an error occurs.
   *
   * Calculation approach:
   * - Filter expenses to current month (based on created_at, not due_date)
   * - Include both 'paid' and 'pending' in spent calculation (committed money)
   * - Remaining = budget - spent (can be negative if over budget)
   * - Pending bills count includes all pending regardless of month
   *
   * Why include pending in spent? Pending expenses represent committed money.
   * Users should see their true remaining budget including unpaid bills.
   *
   * @param spaceId - The space ID
   * @param supabaseClient - Optional Supabase client instance
   * @returns Budget statistics for the current month
   */
  async getBudgetStats(spaceId: string, supabaseClient?: SupabaseClient): Promise<BudgetStats> {
    try {
      const supabase = getSupabaseClient(supabaseClient);
      const [budget, expenses] = await Promise.all([
        this.getBudget(spaceId, supabase),
        this.getExpenses(spaceId, supabase),
      ]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter to current month only
      const thisMonthExpenses = expenses.filter(e =>
        new Date(e.created_at) >= monthStart
      );

      // Include both paid and pending - pending is committed money
      const spentThisMonth = thisMonthExpenses
        .filter(e => e.status === 'paid' || e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0);

      const monthlyBudget = budget?.monthly_budget || 0;

      return {
        monthlyBudget,
        spentThisMonth,
        remaining: monthlyBudget - spentThisMonth, // Can be negative if over budget
        pendingBills: expenses.filter(e => e.status === 'pending').length,
      };
    } catch (error) {
      logger.error('getBudgetStats error:', error, { component: 'lib-budgets-service', action: 'service_call' });
      // Return safe defaults on error to prevent UI crashes
      return {
        monthlyBudget: 0,
        spentThisMonth: 0,
        remaining: 0,
        pendingBills: 0,
      };
    }
  },

  // Removed: getHouseholdStats - moved to household page to combine choresService and projectsService

  /**
   * Subscribe to real-time expense changes for a space
   * Enables multi-user collaboration by syncing expenses instantly
   *
   * @param spaceId - The space ID to subscribe to
   * @param callback - Function called when expenses change (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel - Channel object to unsubscribe later
   *
   * @example
   * ```typescript
   * const channel = projectsService.subscribeToExpenses(spaceId, (payload) => {
   *   if (payload.eventType === 'INSERT') {
   *     setExpenses(prev => [...prev, payload.new]);
   *   }
   * });
   * // Later: cleanup
   * supabase.removeChannel(channel);
   * ```
   */
  subscribeToExpenses(
    spaceId: string,
    callback: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => void
  ): RealtimeChannel {
    const supabase = createClient();
    return supabase
      .channel(`expenses:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `space_id=eq.${spaceId}`,
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to real-time budget changes for a space
   * Enables multi-user collaboration on budget settings
   *
   * @param spaceId - The space ID to subscribe to
   * @param callback - Function called when budget changes (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel - Channel object to unsubscribe later
   */
  subscribeTobudget(
    spaceId: string,
    callback: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => void
  ): RealtimeChannel {
    const supabase = createClient();
    return supabase
      .channel(`budgets:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `space_id=eq.${spaceId}`,
        },
        callback
      )
      .subscribe();
  },
};
