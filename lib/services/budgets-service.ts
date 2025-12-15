import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
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

export const projectsService = {
  // Expenses
  async getExpenses(spaceId: string): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('space_id', spaceId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getExpenseById(id: string): Promise<Expense | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const supabase = createClient();
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

  async updateExpense(id: string, updates: Partial<CreateExpenseInput>): Promise<Expense> {
    const supabase = createClient();
    const finalUpdates: any = { ...updates };

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

  async deleteExpense(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Budget
  async getBudget(spaceId: string): Promise<Budget | null> {
    // Return null if spaceId is invalid
    if (!spaceId || spaceId === 'undefined' || spaceId === 'null') {
      return null;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
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

  async setBudget(input: CreateBudgetInput, userId: string): Promise<Budget> {
    const supabase = createClient();
    // Check if budget exists
    const existing = await this.getBudget(input.space_id);

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

  async getBudgetStats(spaceId: string): Promise<BudgetStats> {
    try {
      const [budget, expenses] = await Promise.all([
        this.getBudget(spaceId),
        this.getExpenses(spaceId),
      ]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthExpenses = expenses.filter(e =>
        new Date(e.created_at) >= monthStart
      );

      // Include both paid and pending expenses in spent calculation
      const spentThisMonth = thisMonthExpenses
        .filter(e => e.status === 'paid' || e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0);

      const monthlyBudget = budget?.monthly_budget || 0;

      return {
        monthlyBudget,
        spentThisMonth,
        remaining: monthlyBudget - spentThisMonth,
        pendingBills: expenses.filter(e => e.status === 'pending').length,
      };
    } catch (error) {
      logger.error('getBudgetStats error:', error, { component: 'lib-budgets-service', action: 'service_call' });
      // Return default values if there's an error
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
