import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface UpcomingBill {
  event_id: string;
  expense_id: string;
  title: string;
  amount: number;
  due_date: string;
  category: string | null;
  payment_method: string | null;
  days_until_due: number;
}

// ==================== BILL CALENDAR INTEGRATION ====================

/**
 * Creates a calendar event for a recurring bill
 */
export async function createBillCalendarEvent(expenseId: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('create_bill_calendar_event', {
    p_expense_id: expenseId,
  });

  if (error) {
    logger.error('Error creating bill calendar event:', error, { component: 'lib-bill-calendar-service', action: 'service_call' });
    return null;
  }

  return data;
}

/**
 * Gets upcoming bills in the next N days
 */
export async function getUpcomingBills(
  spaceId: string,
  daysAhead = 30
): Promise<UpcomingBill[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_upcoming_bills', {
    p_space_id: spaceId,
    p_days_ahead: daysAhead,
  });

  if (error) {
    logger.error('Error getting upcoming bills:', error, { component: 'lib-bill-calendar-service', action: 'service_call' });
    return [];
  }

  return data || [];
}

/**
 * Gets bills due this week
 */
export async function getBillsDueThisWeek(spaceId: string): Promise<UpcomingBill[]> {
  return getUpcomingBills(spaceId, 7);
}

/**
 * Gets bills due today
 */
export async function getBillsDueToday(spaceId: string): Promise<UpcomingBill[]> {
  const allBills = await getUpcomingBills(spaceId, 1);
  return allBills.filter((bill) => bill.days_until_due === 0);
}

/**
 * Gets overdue bills (bills with past due dates)
 */
export async function getOverdueBills(spaceId: string): Promise<UpcomingBill[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      title,
      start_time,
      expenses:expense_id (
        id,
        amount,
        category,
        payment_method
      )
    `
    )
    .eq('space_id', spaceId)
    .eq('event_type', 'bill_due')
    .lt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    logger.error('Error getting overdue bills:', error, { component: 'lib-bill-calendar-service', action: 'service_call' });
    return [];
  }

  // Transform data to UpcomingBill format
  return (
    data?.map((event: any) => ({
      event_id: event.id,
      expense_id: event.expenses?.id || '',
      title: event.title,
      amount: event.expenses?.amount || 0,
      due_date: event.start_time,
      category: event.expenses?.category || null,
      payment_method: event.expenses?.payment_method || null,
      days_until_due: Math.floor(
        (new Date(event.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
    })) || []
  );
}

/**
 * Marks a bill as paid by updating the expense
 */
export async function markBillAsPaid(expenseId: string): Promise<void> {
  const supabase = createClient();

  // Update expense to mark as paid (you might want to add a 'paid' field to expenses table)
  const { error } = await supabase
    .from('expenses')
    .update({ notes: 'Paid - ' + new Date().toISOString() })
    .eq('id', expenseId);

  if (error) {
    logger.error('Error marking bill as paid:', error, { component: 'lib-bill-calendar-service', action: 'service_call' });
    throw error;
  }
}

/**
 * Gets total bills due in the next N days
 */
export async function getTotalBillsUpcoming(
  spaceId: string,
  daysAhead = 30
): Promise<{ count: number; totalAmount: number }> {
  const bills = await getUpcomingBills(spaceId, daysAhead);

  return {
    count: bills.length,
    totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
  };
}

/**
 * Real-time subscription to upcoming bills
 */
export function subscribeToUpcomingBills(
  spaceId: string,
  callback: (bill: UpcomingBill) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`bill-calendar-${spaceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `space_id=eq.${spaceId}`,
      },
      async (payload: { new: Record<string, unknown> }) => {
        const event = payload.new as { event_type?: string; expense_id?: string; id?: string };
        if (event.event_type === 'bill_due' && event.expense_id) {
          // Fetch full bill details
          const bills = await getUpcomingBills(spaceId, 30);
          const newBill = bills.find((b) => b.event_id === event.id);
          if (newBill) {
            callback(newBill);
          }
        }
      }
    )
    .subscribe();

  return channel;
}

// Export service object
export const billCalendarService = {
  createBillCalendarEvent,
  getUpcomingBills,
  getBillsDueThisWeek,
  getBillsDueToday,
  getOverdueBills,
  markBillAsPaid,
  getTotalBillsUpcoming,
  subscribeToUpcomingBills,
};
