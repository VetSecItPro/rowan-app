import { createClient } from '@/lib/supabase/client';

// ==================== TYPES ====================

export type SplitType = 'equal' | 'percentage' | 'fixed' | 'income-based';
export type OwnershipType = 'shared' | 'yours' | 'theirs';
export type SplitStatus = 'pending' | 'partially-paid' | 'settled';

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  amount_paid: number;
  percentage: number | null;
  is_payer: boolean;
  status: SplitStatus;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  space_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settlement_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  expense_ids: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnershipBalance {
  id: string;
  partnership_id: string;
  space_id: string;
  user1_id: string;
  user2_id: string;
  balance: number; // Positive = user1 owes user2, Negative = user2 owes user1
  user1_income: number | null;
  user2_income: number | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSettlementInput {
  space_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settlement_date?: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  expense_ids?: string[];
  created_by: string;
}

export interface UpdateSplitExpenseInput {
  ownership?: OwnershipType;
  split_type?: SplitType;
  split_percentage_user1?: number;
  split_percentage_user2?: number;
  split_amount_user1?: number;
  split_amount_user2?: number;
  is_split?: boolean;
}

export interface BalanceSummary {
  user_id: string;
  user_email?: string;
  amount_owed: number; // What they owe
  amount_owed_to_them: number; // What is owed to them
  net_balance: number; // Negative = they owe, Positive = owed to them
}

export interface SettlementSummary {
  space_id: string;
  from_user_id: string;
  to_user_id: string;
  settlement_count: number;
  total_settled: number;
  first_settlement: string | null;
  last_settlement: string | null;
}

type ExpenseRecord = Record<string, unknown>;

type ExpenseSplitWithExpense = ExpenseSplit & {
  expenses?: ExpenseRecord;
};

type ExpenseSplitWithUser = ExpenseSplit & {
  users?: {
    email?: string | null;
  };
};

type ExpenseOwnershipRow = {
  ownership?: OwnershipType;
  amount: number | string;
};

type OwnershipStats = Record<string, { ownership: OwnershipType; total: number; count: number }>;

// ==================== EXPENSE SPLITS ====================

/**
 * Retrieves all split records for a given expense.
 * @param expenseId - The unique identifier of the expense
 * @returns Array of expense split records showing how the expense is divided
 * @throws Error if the database query fails
 */
export async function getExpenseSplits(expenseId: string): Promise<ExpenseSplit[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expense_splits')
    .select('id, expense_id, user_id, amount_owed, amount_paid, percentage, is_payer, status, settled_at, created_at, updated_at')
    .eq('expense_id', expenseId);

  if (error) throw error;
  return data || [];
}

/**
 * Retrieves all unsettled expenses where the user owes money.
 * Filters to expenses where the user is not the payer and status is not settled.
 * @param userId - The user ID to check owed expenses for
 * @param spaceId - Optional space ID to filter results to a specific space
 * @returns Array of expense splits with associated expense data
 * @throws Error if the database query fails
 */
export async function getUserOwedExpenses(
  userId: string,
  spaceId?: string
): Promise<(ExpenseSplit & { expense?: ExpenseRecord })[]> {
  const supabase = createClient();

  let query = supabase
    .from('expense_splits')
    .select('id, expense_id, user_id, amount_owed, amount_paid, percentage, is_payer, status, settled_at, created_at, updated_at, expenses!expense_id!inner(*)')
    .eq('user_id', userId)
    .eq('is_payer', false)
    .neq('status', 'settled');

  if (spaceId) {
    query = query.eq('expenses.space_id', spaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  const rows = (data ?? []) as ExpenseSplitWithExpense[];
  return rows.map((item) => ({
    ...item,
    expense: item.expenses,
  }));
}

/**
 * Updates ownership and split configuration for an expense.
 * Automatically triggers split recalculation unless is_split is explicitly set to false.
 * @param expenseId - The expense ID to update
 * @param updates - Split configuration updates (ownership, split type, percentages, amounts)
 * @throws Error if the update operation fails
 */
export async function updateExpenseSplit(
  expenseId: string,
  updates: UpdateSplitExpenseInput
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('expenses').update(updates).eq('id', expenseId);

  if (error) throw error;

  // If is_split is true, trigger recalculation
  if (updates.is_split !== false) {
    await recalculateExpenseSplits(expenseId);
  }
}

/**
 * Triggers recalculation of expense splits via database function.
 * Useful after manual edits or configuration changes.
 * @param expenseId - The expense ID to recalculate splits for
 * @throws Error if the RPC call fails
 */
export async function recalculateExpenseSplits(expenseId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('calculate_expense_splits', {
    p_expense_id: expenseId,
  });

  if (error) throw error;
}

/**
 * Records a payment toward a split, updating status accordingly.
 * Supports partial payments. Updates status to 'settled' when fully paid,
 * 'partially-paid' for partial amounts, or remains 'pending' if no payment made.
 * @param splitId - The split record ID
 * @param amount - Optional specific payment amount; defaults to full amount owed
 * @throws Error if the split is not found or update fails
 */
export async function settleExpenseSplit(splitId: string, amount?: number): Promise<void> {
  const supabase = createClient();

  // Get current split
  const { data: split, error: fetchError } = await supabase
    .from('expense_splits')
    .select('id, expense_id, user_id, amount_owed, amount_paid, percentage, is_payer, status, settled_at, created_at, updated_at')
    .eq('id', splitId)
    .single();

  if (fetchError) throw fetchError;

  const amountPaid = amount || split.amount_owed;
  const totalPaid = split.amount_paid + amountPaid;

  const newStatus: SplitStatus =
    totalPaid >= split.amount_owed
      ? 'settled'
      : totalPaid > 0
      ? 'partially-paid'
      : 'pending';

  const { error } = await supabase
    .from('expense_splits')
    .update({
      amount_paid: totalPaid,
      status: newStatus,
      settled_at: newStatus === 'settled' ? new Date().toISOString() : null,
    })
    .eq('id', splitId);

  if (error) throw error;
}

// ==================== SETTLEMENTS ====================

/**
 * Creates a settlement record representing a payment between partners.
 * Optionally marks associated expense splits as settled when expense_ids are provided.
 * @param input - Settlement details including payer, payee, amount, and optional linked expenses
 * @returns The created settlement record
 * @throws Error if the insert operation fails
 */
export async function createSettlement(input: CreateSettlementInput): Promise<Settlement> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .insert([
      {
        space_id: input.space_id,
        from_user_id: input.from_user_id,
        to_user_id: input.to_user_id,
        amount: input.amount,
        settlement_date: input.settlement_date || new Date().toISOString().split('T')[0],
        payment_method: input.payment_method || null,
        reference_number: input.reference_number || null,
        notes: input.notes || null,
        expense_ids: input.expense_ids || null,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  // If expense_ids provided, mark those splits as settled
  if (input.expense_ids && input.expense_ids.length > 0) {
    await markExpenseSplitsSettled(input.expense_ids, input.from_user_id);
  }

  return data;
}

/**
 * Marks expense splits as settled after a settlement payment
 */
async function markExpenseSplitsSettled(expenseIds: string[], userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('expense_splits')
    .update({
      status: 'settled',
      settled_at: new Date().toISOString(),
    })
    .in('expense_id', expenseIds)
    .eq('user_id', userId)
    .eq('is_payer', false);

  if (error) throw error;
}

/**
 * Retrieves settlement history for a space, ordered by most recent first.
 * @param spaceId - The space ID
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of settlement records
 * @throws Error if the database query fails
 */
export async function getSettlements(spaceId: string, limit = 50): Promise<Settlement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .select('id, space_id, from_user_id, to_user_id, amount, settlement_date, payment_method, reference_number, notes, expense_ids, created_by, created_at, updated_at')
    .eq('space_id', spaceId)
    .order('settlement_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Retrieves all settlements between two specific users in a space.
 * Includes settlements in both directions (user1 to user2 and user2 to user1).
 * @param spaceId - The space ID
 * @param user1Id - First user's ID
 * @param user2Id - Second user's ID
 * @returns Array of settlement records between the two users
 * @throws Error if the database query fails
 */
export async function getSettlementsBetweenUsers(
  spaceId: string,
  user1Id: string,
  user2Id: string
): Promise<Settlement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlements')
    .select('id, space_id, from_user_id, to_user_id, amount, settlement_date, payment_method, reference_number, notes, expense_ids, created_by, created_at, updated_at')
    .eq('space_id', spaceId)
    .or(`from_user_id.eq.${user1Id},to_user_id.eq.${user1Id}`)
    .or(`from_user_id.eq.${user2Id},to_user_id.eq.${user2Id}`)
    .order('settlement_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Permanently deletes a settlement record.
 * Note: Does not automatically reverse associated expense split status changes.
 * @param settlementId - The settlement ID to delete
 * @throws Error if the delete operation fails
 */
export async function deleteSettlement(settlementId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('settlements').delete().eq('id', settlementId);

  if (error) throw error;
}

// ==================== PARTNERSHIP BALANCES ====================

/**
 * Retrieves the current balance record between partners in a space.
 * The balance indicates who owes whom and income information for split calculations.
 * @param spaceId - The space ID
 * @returns Partnership balance record or null if not configured
 * @throws Error if the database query fails (except for "no rows" which returns null)
 */
export async function getPartnershipBalance(spaceId: string): Promise<PartnershipBalance | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('partnership_balances')
    .select('id, partnership_id, space_id, user1_id, user2_id, balance, user1_income, user2_income, last_calculated_at, created_at, updated_at')
    .eq('space_id', spaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Updates income information for both partners to enable income-based expense splitting.
 * Creates or updates the partnership balance record.
 * @param spaceId - The space ID
 * @param user1Id - First partner's user ID
 * @param user1Income - First partner's income amount
 * @param user2Id - Second partner's user ID
 * @param user2Income - Second partner's income amount
 * @throws Error if the upsert operation fails
 */
export async function updateIncomes(
  spaceId: string,
  user1Id: string,
  user1Income: number,
  user2Id: string,
  user2Income: number
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('partnership_balances').upsert(
    {
      space_id: spaceId,
      user1_id: user1Id,
      user2_id: user2Id,
      user1_income: user1Income,
      user2_income: user2Income,
      last_calculated_at: new Date().toISOString(),
    },
    { onConflict: 'space_id' }
  );

  if (error) throw error;
}

/**
 * Calculates the current running balance for all users from unsettled expense splits.
 * Returns net balance per user (positive = owed to them, negative = they owe).
 *
 * Algorithm:
 * 1. Fetch all expense splits that aren't settled yet
 * 2. For each split, track two values per user:
 *    - owed: money this user owes others (they didn't pay)
 *    - owedToThem: money others owe this user (they paid)
 * 3. Net balance = owedToThem - owed
 *    - Positive = others owe you money
 *    - Negative = you owe others money
 *
 * Edge case: Partial payments handled by subtracting amount_paid from amount_owed.
 *
 * @param spaceId - The space ID
 * @returns Array of balance summaries per user
 * @throws Error if the database query fails
 */
export async function calculateCurrentBalance(spaceId: string): Promise<BalanceSummary[]> {
  const supabase = createClient();

  // Get all unsettled splits for this space
  const { data: splits, error } = await supabase
    .from('expense_splits')
    .select('id, expense_id, user_id, amount_owed, amount_paid, percentage, is_payer, status, settled_at, created_at, updated_at, expenses!expense_id!inner(space_id), users!user_id!inner(email)')
    .eq('expenses.space_id', spaceId)
    .neq('status', 'settled');

  if (error) throw error;

  // Group by user, accumulating what they owe vs what's owed to them
  const balanceMap: Record<
    string,
    { email?: string; owed: number; owedToThem: number }
  > = {};

  const splitRows = (splits ?? []) as ExpenseSplitWithUser[];
  for (const split of splitRows) {
    const userId = split.user_id;
    if (!balanceMap[userId]) {
      balanceMap[userId] = {
        email: split.users?.email ?? undefined,
        owed: 0,
        owedToThem: 0,
      };
    }

    // Only count the remaining unpaid portion
    const amountRemaining = split.amount_owed - split.amount_paid;

    if (split.is_payer) {
      // This user paid, so money is owed TO them
      balanceMap[userId].owedToThem += amountRemaining;
    } else {
      // This user owes money
      balanceMap[userId].owed += amountRemaining;
    }
  }

  // Convert to array with rounded values (avoid floating point errors in money)
  return Object.entries(balanceMap).map(([userId, data]) => ({
    user_id: userId,
    user_email: data.email,
    amount_owed: Math.round(data.owed * 100) / 100,
    amount_owed_to_them: Math.round(data.owedToThem * 100) / 100,
    net_balance: Math.round((data.owedToThem - data.owed) * 100) / 100,
  }));
}

/**
 * Retrieves aggregated settlement statistics between user pairs.
 * Includes total amounts, counts, and date ranges from the settlement_summary view.
 * @param spaceId - The space ID
 * @returns Array of settlement summaries per user pair
 * @throws Error if the database query fails
 */
export async function getSettlementSummary(spaceId: string): Promise<SettlementSummary[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settlement_summary')
    .select('space_id, from_user_id, to_user_id, settlement_count, total_settled, first_settlement, last_settlement')
    .eq('space_id', spaceId);

  if (error) throw error;
  return data || [];
}

// ==================== FAIRNESS CALCULATIONS ====================

/**
 * Calculates expense split amounts based on income ratio.
 * Higher earner pays proportionally more. Falls back to 50/50 if no income data.
 *
 * Algorithm: Each user's share = (their income / total income) * expense amount
 * Example: User1 earns $6000, User2 earns $4000, expense is $100
 *   - User1 pays: (6000/10000) * 100 = $60 (60%)
 *   - User2 pays: (4000/10000) * 100 = $40 (40%)
 *
 * Edge case: If both incomes are 0, falls back to 50/50 split.
 *
 * @param totalAmount - The total expense amount to split
 * @param user1Income - First user's income
 * @param user2Income - Second user's income
 * @returns Split amounts and percentages for each user
 */
export function calculateIncomeBasedSplit(
  totalAmount: number,
  user1Income: number,
  user2Income: number
): { user1Amount: number; user2Amount: number; user1Percentage: number; user2Percentage: number } {
  const totalIncome = user1Income + user2Income;

  // Edge case: no income data available, use equal split
  if (totalIncome === 0) {
    return {
      user1Amount: totalAmount / 2,
      user2Amount: totalAmount / 2,
      user1Percentage: 50,
      user2Percentage: 50,
    };
  }

  // Calculate percentage of total income for each user
  const user1Percentage = (user1Income / totalIncome) * 100;
  const user2Percentage = (user2Income / totalIncome) * 100;

  return {
    // Round to cents to avoid floating point precision issues
    user1Amount: Math.round(((totalAmount * user1Income) / totalIncome) * 100) / 100,
    user2Amount: Math.round(((totalAmount * user2Income) / totalIncome) * 100) / 100,
    user1Percentage: Math.round(user1Percentage * 100) / 100,
    user2Percentage: Math.round(user2Percentage * 100) / 100,
  };
}

/**
 * Suggests an appropriate split type based on expense category and amount.
 * Shared household expenses use income-based splitting for large amounts.
 * Personal categories default to equal split (typically marked as non-split).
 * @param category - The expense category name
 * @param amount - The expense amount
 * @returns Recommended split type
 */
export function suggestSplitType(category: string, amount: number): SplitType {
  const sharedCategories = [
    'Groceries',
    'Utilities',
    'Rent',
    'Housing',
    'Insurance',
    'Household',
  ];

  const personalCategories = [
    'Clothing',
    'Personal Care',
    'Hobbies',
    'Entertainment',
    'Gifts',
  ];

  if (sharedCategories.includes(category)) {
    // Large shared expenses should use income-based
    if (amount > 500) {
      return 'income-based';
    }
    return 'equal';
  }

  if (personalCategories.includes(category)) {
    // Personal expenses shouldn't be split by default
    return 'equal'; // Return equal but mark as non-split
  }

  return 'equal';
}

// ==================== REPORTING ====================

/**
 * Retrieves expense totals grouped by ownership type (shared, yours, theirs).
 * Optionally filtered by date range.
 * @param spaceId - The space ID
 * @param startDate - Optional start date filter (YYYY-MM-DD)
 * @param endDate - Optional end date filter (YYYY-MM-DD)
 * @returns Array of ownership statistics with totals and counts
 * @throws Error if the database query fails
 */
export async function getExpensesByOwnership(
  spaceId: string,
  startDate?: string,
  endDate?: string
): Promise<{ ownership: OwnershipType; total: number; count: number }[]> {
  const supabase = createClient();

  let query = supabase.from('expenses').select('ownership, amount').eq('space_id', spaceId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;

  if (error) throw error;

  // Group by ownership
  const rows = (data ?? []) as ExpenseOwnershipRow[];
  const stats = rows.reduce<OwnershipStats>((acc, expense) => {
    const ownership = (expense.ownership || 'shared') as OwnershipType;
    if (!acc[ownership]) {
      acc[ownership] = { ownership, total: 0, count: 0 };
    }
    acc[ownership].total += Number(expense.amount);
    acc[ownership].count += 1;
    return acc;
  }, {});

  return Object.values(stats);
}

/**
 * Retrieves aggregate statistics for split expenses in a space.
 * Includes total amount split, count of split expenses, and unsettled amounts.
 * @param spaceId - The space ID
 * @returns Statistics object with totals and counts
 * @throws Error if the database query fails
 */
export async function getSplitExpenseStats(
  spaceId: string
): Promise<{
  totalSplit: number;
  splitCount: number;
  unsettledCount: number;
  unsettledAmount: number;
}> {
  const supabase = createClient();

  // Get all split expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id, amount')
    .eq('space_id', spaceId)
    .eq('is_split', true);

  if (expensesError) throw expensesError;

  const totalSplit = (expenses || []).reduce((sum: number, e: { amount: number }) => sum + parseFloat(e.amount.toString()), 0);

  // Get unsettled splits
  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select('amount_owed, amount_paid, expenses!expense_id!inner(space_id)')
    .eq('expenses.space_id', spaceId)
    .neq('status', 'settled');

  if (splitsError) throw splitsError;

  const unsettledAmount = (splits || []).reduce(
    (sum: number, s: { amount_owed: number; amount_paid: number }) => sum + (s.amount_owed - s.amount_paid),
    0
  );

  return {
    totalSplit: Math.round(totalSplit * 100) / 100,
    splitCount: expenses?.length || 0,
    unsettledCount: splits?.length || 0,
    unsettledAmount: Math.round(unsettledAmount * 100) / 100,
  };
}

/**
 * Retrieves settlement totals grouped by month for trend analysis.
 * Returns data for the specified number of past months.
 * @param spaceId - The space ID
 * @param months - Number of months of history to retrieve (default: 6)
 * @returns Array of monthly totals with counts, sorted chronologically
 * @throws Error if the database query fails
 */
export async function getMonthlySettlementTrends(
  spaceId: string,
  months = 6
): Promise<{ month: string; total: number; count: number }[]> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('settlements')
    .select('settlement_date, amount')
    .eq('space_id', spaceId)
    .gte('settlement_date', startDateStr)
    .order('settlement_date', { ascending: true });

  if (error) throw error;

  // Group by month
  const monthMap: Record<string, { total: number; count: number }> = {};

  for (const settlement of data || []) {
    const monthKey = settlement.settlement_date.substring(0, 7); // YYYY-MM
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { total: 0, count: 0 };
    }
    monthMap[monthKey].total += parseFloat(settlement.amount.toString());
    monthMap[monthKey].count += 1;
  }

  // Convert to array
  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
