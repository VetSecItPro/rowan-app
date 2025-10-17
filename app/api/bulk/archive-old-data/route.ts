import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  archiveOldExpenses,
  archiveOldTasks,
  archiveOldCalendarEvents,
} from '@/lib/services/bulk-operations-service';

/**
 * Archive Old Data API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 5: Data Minimization
 * - Archives old data to reduce actively processed information
 * - Archived data remains accessible but not in default views
 */

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { partnership_id, data_type, older_than_date } = body;

    if (!partnership_id || !data_type || !older_than_date) {
      return NextResponse.json(
        { error: 'Partnership ID, data type, and older_than_date are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this partnership
    const { data: membership } = await supabase
      .from('partnership_members')
      .select('*')
      .eq('partnership_id', partnership_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Perform archiving based on data type
    let result;
    switch (data_type) {
      case 'expenses':
        result = await archiveOldExpenses(partnership_id, older_than_date);
        break;
      case 'tasks':
        result = await archiveOldTasks(partnership_id, older_than_date);
        break;
      case 'calendar_events':
        result = await archiveOldCalendarEvents(partnership_id, older_than_date);
        break;
      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      archived_count: result.archived_count,
      data_type,
      older_than_date,
    });
  } catch (error) {
    console.error('Archive old data error:', error);
    return NextResponse.json(
      { error: 'Failed to archive data' },
      { status: 500 }
    );
  }
}
