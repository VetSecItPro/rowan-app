import { createClient } from '@/lib/supabase/client';

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'bi-monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'annual';

export interface RecurringExpensePattern {
  id: string;
  space_id: string;
  pattern_name: string;
  merchant_name: string | null;
  category: string | null;
  frequency: RecurrenceFrequency;
  average_amount: number;
  amount_variance: number;
  confidence_score: number;
  detection_method: string | null;
  first_occurrence: string;
  last_occurrence: string;
  occurrence_count: number;
  expense_ids: string[];
  next_expected_date: string | null;
  next_expected_amount: number | null;
  user_confirmed: boolean;
  user_ignored: boolean;
  auto_created: boolean;
  created_at: string;
  updated_at: string;
  last_analyzed_at: string;
}

interface ExpenseForAnalysis {
  id: string;
  amount: number;
  title: string | null;
  category: string;
  date: string;
  description: string | null;
}

interface PatternCandidate {
  merchant_name: string | null;
  category: string;
  frequency: RecurrenceFrequency;
  average_amount: number;
  amount_variance: number;
  expense_ids: string[];
  dates: string[];
  confidence_score: number;
}

// Frequency intervals in days
const FREQUENCY_INTERVALS: Record<RecurrenceFrequency, { days: number; tolerance: number }> = {
  daily: { days: 1, tolerance: 0 },
  weekly: { days: 7, tolerance: 1 },
  'bi-weekly': { days: 14, tolerance: 2 },
  monthly: { days: 30, tolerance: 3 },
  'bi-monthly': { days: 60, tolerance: 5 },
  quarterly: { days: 91, tolerance: 7 },
  'semi-annual': { days: 182, tolerance: 10 },
  annual: { days: 365, tolerance: 14 },
};

/**
 * Analyzes expense history to detect recurring patterns
 */
export async function analyzeRecurringPatterns(spaceId: string): Promise<RecurringExpensePattern[]> {
  const supabase = createClient();

  // Get all expenses from the last 2 years for analysis
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, amount, category, date, description, title')
    .eq('space_id', spaceId)
    .gte('date', twoYearsAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  if (!expenses || expenses.length < 3) return []; // Need at least 3 occurrences

  // Group expenses by merchant and category
  const patterns = detectPatterns(expenses as ExpenseForAnalysis[]);

  // Save high-confidence patterns to database
  const savedPatterns: RecurringExpensePattern[] = [];
  for (const pattern of patterns) {
    if (pattern.confidence_score >= 60) {
      // Only save patterns with 60%+ confidence
      const saved = await savePattern(spaceId, pattern);
      if (saved) savedPatterns.push(saved);
    }
  }

  return savedPatterns;
}

/**
 * Core pattern detection algorithm for recurring expenses.
 *
 * Algorithm:
 * 1. Group expenses by merchant (or category if no merchant name)
 * 2. For each group with 3+ expenses, calculate intervals between consecutive dates
 * 3. Match average interval to known frequencies (daily, weekly, monthly, etc.)
 * 4. Calculate confidence score based on:
 *    - Interval consistency (how regular are the payments)
 *    - Amount consistency (how similar are the amounts)
 *    - Occurrence count (more data = higher confidence)
 *
 * Minimum 3 occurrences required to detect a pattern (avoids false positives).
 * Patterns must fall within frequency tolerance (e.g., monthly = 30 days +/- 3).
 */
function detectPatterns(expenses: ExpenseForAnalysis[]): PatternCandidate[] {
  const patterns: PatternCandidate[] = [];

  // Group by merchant name (more precise) or category (fallback)
  const groupedExpenses = groupExpenses(expenses);

  for (const [, expenseGroup] of Object.entries(groupedExpenses)) {
    // Require at least 3 occurrences to establish a pattern
    if (expenseGroup.length < 3) continue;

    // Sort chronologically to calculate intervals
    expenseGroup.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate days between each consecutive expense
    const intervals: number[] = [];
    for (let i = 1; i < expenseGroup.length; i++) {
      const days = daysBetween(expenseGroup[i - 1].date, expenseGroup[i].date);
      intervals.push(days);
    }

    // Try to match interval pattern to a known frequency
    const frequency = detectFrequency(intervals);
    if (!frequency) continue; // No matching frequency found

    // Calculate amount statistics for confidence scoring
    const amounts = expenseGroup.map((e) => e.amount);
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance = calculateVariance(amounts, avgAmount);

    // Compute confidence score (0-100) based on regularity
    const confidence = calculateConfidence(intervals, frequency, variance, expenseGroup.length);

    patterns.push({
      merchant_name: expenseGroup[0].title,
      category: expenseGroup[0].category,
      frequency,
      average_amount: Math.round(avgAmount * 100) / 100,
      amount_variance: Math.round(variance * 100) / 100,
      expense_ids: expenseGroup.map((e) => e.id),
      dates: expenseGroup.map((e) => e.date),
      confidence_score: confidence,
    });
  }

  return patterns;
}

/**
 * Groups expenses by merchant name or category
 */
function groupExpenses(expenses: ExpenseForAnalysis[]): Record<string, ExpenseForAnalysis[]> {
  const groups: Record<string, ExpenseForAnalysis[]> = {};

  for (const expense of expenses) {
    // Use title if available, otherwise use category
    const key = expense.title
      ? `merchant:${expense.title.toLowerCase()}`
      : `category:${expense.category.toLowerCase()}`;

    if (!groups[key]) groups[key] = [];
    groups[key].push(expense);
  }

  return groups;
}

/**
 * Detects the most likely frequency based on interval patterns
 */
function detectFrequency(intervals: number[]): RecurrenceFrequency | null {
  if (intervals.length === 0) return null;

  const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

  // Find the frequency with the closest match
  let bestMatch: { frequency: RecurrenceFrequency; diff: number } | null = null;

  for (const [frequency, config] of Object.entries(FREQUENCY_INTERVALS)) {
    const diff = Math.abs(avgInterval - config.days);
    if (diff <= config.tolerance) {
      if (!bestMatch || diff < bestMatch.diff) {
        bestMatch = { frequency: frequency as RecurrenceFrequency, diff };
      }
    }
  }

  return bestMatch?.frequency || null;
}

/**
 * Calculates confidence score (0-100) for a detected recurring pattern.
 *
 * Scoring breakdown (max 100 points):
 * - Interval consistency: 40 points max
 *   - Deduct 2 points per day deviation from expected frequency
 *   - Example: Monthly (30 days) with actual intervals of 28, 31, 29 = low deviation = high score
 *
 * - Amount consistency: 30 points max
 *   - Deduct 1 point per dollar of standard deviation
 *   - Low variance (same amount each time) = subscription-like = high score
 *
 * - Occurrence count: 30 points max
 *   - 5 points per occurrence (6+ occurrences = max 30 points)
 *   - More history = more confident it's truly recurring
 *
 * Patterns scoring below 60 are not saved (set in analyzeRecurringPatterns).
 */
function calculateConfidence(
  intervals: number[],
  frequency: RecurrenceFrequency,
  amountVariance: number,
  occurrenceCount: number
): number {
  // Factor 1: Interval consistency (40 points max)
  // How close are actual intervals to expected frequency?
  const expectedDays = FREQUENCY_INTERVALS[frequency].days;
  const intervalDeviations = intervals.map((i) => Math.abs(i - expectedDays));
  const avgDeviation = intervalDeviations.reduce((sum, d) => sum + d, 0) / intervalDeviations.length;
  const intervalScore = Math.max(0, 40 - avgDeviation * 2);

  // Factor 2: Amount consistency (30 points max)
  // Lower variance = more like a subscription = higher confidence
  const amountScore = Math.max(0, 30 - amountVariance);

  // Factor 3: Number of occurrences (30 points max)
  // More data points = more confidence it's truly recurring
  const occurrenceScore = Math.min(30, occurrenceCount * 5);

  const confidence = intervalScore + amountScore + occurrenceScore;
  return Math.round(Math.min(100, confidence));
}

/**
 * Calculates variance in amounts
 */
function calculateVariance(amounts: number[], average: number): number {
  if (amounts.length === 0) return 0;
  const squaredDiffs = amounts.map((amt) => Math.pow(amt - average, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / amounts.length;
  return Math.sqrt(variance); // Return standard deviation
}

/**
 * Calculates days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Predicts next occurrence date
 */
function predictNextOccurrence(lastDate: string, frequency: RecurrenceFrequency): string {
  const last = new Date(lastDate);
  const days = FREQUENCY_INTERVALS[frequency].days;
  last.setDate(last.getDate() + days);
  return last.toISOString().split('T')[0];
}

/**
 * Saves a detected pattern to the database
 */
async function savePattern(spaceId: string, pattern: PatternCandidate): Promise<RecurringExpensePattern | null> {
  const supabase = createClient();

  // Check if pattern already exists
  const { data: existing } = await supabase
    .from('recurring_expense_patterns')
    .select('id')
    .eq('space_id', spaceId)
    .eq('merchant_name', pattern.merchant_name)
    .eq('category', pattern.category)
    .eq('frequency', pattern.frequency)
    .maybeSingle();

  if (existing) {
    // Update existing pattern
    const { data, error } = await supabase
      .from('recurring_expense_patterns')
      .update({
        average_amount: pattern.average_amount,
        amount_variance: pattern.amount_variance,
        confidence_score: pattern.confidence_score,
        last_occurrence: pattern.dates[pattern.dates.length - 1],
        occurrence_count: pattern.expense_ids.length,
        expense_ids: pattern.expense_ids,
        next_expected_date: predictNextOccurrence(pattern.dates[pattern.dates.length - 1], pattern.frequency),
        next_expected_amount: pattern.average_amount,
        last_analyzed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    return error ? null : data;
  }

  // Create new pattern
  const patternName = pattern.merchant_name || `${pattern.category} (Recurring)`;

  const { data, error } = await supabase
    .from('recurring_expense_patterns')
    .insert([
      {
        space_id: spaceId,
        pattern_name: patternName,
        merchant_name: pattern.merchant_name,
        category: pattern.category,
        frequency: pattern.frequency,
        average_amount: pattern.average_amount,
        amount_variance: pattern.amount_variance,
        confidence_score: pattern.confidence_score,
        detection_method: 'amount_and_date',
        first_occurrence: pattern.dates[0],
        last_occurrence: pattern.dates[pattern.dates.length - 1],
        occurrence_count: pattern.expense_ids.length,
        expense_ids: pattern.expense_ids,
        next_expected_date: predictNextOccurrence(pattern.dates[pattern.dates.length - 1], pattern.frequency),
        next_expected_amount: pattern.average_amount,
        auto_created: true,
      },
    ])
    .select()
    .single();

  return error ? null : data;
}

/**
 * Gets all recurring patterns for a space
 */
export async function getRecurringPatterns(spaceId: string): Promise<RecurringExpensePattern[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('recurring_expense_patterns')
    .select('id, space_id, pattern_name, merchant_name, category, frequency, average_amount, amount_variance, confidence_score, detection_method, first_occurrence, last_occurrence, occurrence_count, expense_ids, next_expected_date, next_expected_amount, user_confirmed, user_ignored, auto_created, created_at, updated_at, last_analyzed_at')
    .eq('space_id', spaceId)
    .eq('user_ignored', false)
    .order('confidence_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Detects potential duplicate subscriptions
 */
export async function detectDuplicateSubscriptions(spaceId: string): Promise<RecurringExpensePattern[]> {
  const patterns = await getRecurringPatterns(spaceId);

  // Group by category to find duplicates
  const categoryGroups: Record<string, RecurringExpensePattern[]> = {};
  for (const pattern of patterns) {
    const category = pattern.category || 'unknown';
    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(pattern);
  }

  // Find categories with multiple subscriptions
  const duplicates: RecurringExpensePattern[] = [];
  for (const [category, group] of Object.entries(categoryGroups)) {
    if (group.length > 1 && ['Subscriptions', 'Entertainment', 'Utilities'].includes(category)) {
      duplicates.push(...group);
    }
  }

  return duplicates;
}

/**
 * Confirms a pattern as valid
 */
export async function confirmPattern(patternId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('recurring_expense_patterns')
    .update({ user_confirmed: true, user_ignored: false })
    .eq('id', patternId);
}

/**
 * Ignores a pattern
 */
export async function ignorePattern(patternId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('recurring_expense_patterns')
    .update({ user_ignored: true })
    .eq('id', patternId);
}

/**
 * Gets upcoming recurring expenses (next 30 days)
 */
export async function getUpcomingRecurring(spaceId: string): Promise<RecurringExpensePattern[]> {
  const supabase = createClient();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const futureDate = thirtyDaysFromNow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('recurring_expense_patterns')
    .select('id, space_id, pattern_name, merchant_name, category, frequency, average_amount, amount_variance, confidence_score, detection_method, first_occurrence, last_occurrence, occurrence_count, expense_ids, next_expected_date, next_expected_amount, user_confirmed, user_ignored, auto_created, created_at, updated_at, last_analyzed_at')
    .eq('space_id', spaceId)
    .eq('user_ignored', false)
    .gte('next_expected_date', today)
    .lte('next_expected_date', futureDate)
    .order('next_expected_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Creates a scheduled expense from a recurring pattern
 */
export async function createExpenseFromPattern(
  patternId: string,
  userId: string
): Promise<{ success: boolean; expenseId?: string; error?: string }> {
  const supabase = createClient();

  // Get the pattern
  const { data: pattern, error: patternError } = await supabase
    .from('recurring_expense_patterns')
    .select('id, space_id, pattern_name, merchant_name, category, frequency, average_amount, amount_variance, confidence_score, detection_method, first_occurrence, last_occurrence, occurrence_count, expense_ids, next_expected_date, next_expected_amount, user_confirmed, user_ignored, auto_created, created_at, updated_at, last_analyzed_at')
    .eq('id', patternId)
    .single();

  if (patternError || !pattern) {
    return { success: false, error: 'Pattern not found' };
  }

  // Create new expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert([
      {
        space_id: pattern.space_id,
        merchant_name: pattern.merchant_name,
        category: pattern.category,
        amount: pattern.next_expected_amount || pattern.average_amount,
        date: pattern.next_expected_date,
        due_date: pattern.next_expected_date,
        status: 'pending',
        recurring: true,
        created_by: userId,
        description: `Auto-created from recurring pattern: ${pattern.pattern_name}`,
      },
    ])
    .select('id')
    .single();

  if (expenseError || !expense) {
    return { success: false, error: 'Failed to create expense' };
  }

  // Update pattern with new next expected date
  const newNextDate = predictNextOccurrence(pattern.next_expected_date!, pattern.frequency);
  await supabase
    .from('recurring_expense_patterns')
    .update({ next_expected_date: newNextDate })
    .eq('id', patternId);

  return { success: true, expenseId: expense.id };
}
