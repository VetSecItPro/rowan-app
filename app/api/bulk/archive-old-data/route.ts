import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  archiveOldExpenses,
  archiveOldTasks,
  archiveOldCalendarEvents,
} from '@/lib/services/bulk-operations-service';
import { checkExpensiveOperationRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * Archive Old Data API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 5: Data Minimization
 * - Archives old data to reduce actively processed information
 * - Archived data remains accessible but not in default views
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limit check - expensive operation (5 per hour)
    const ip = extractIP(request.headers);
    const { success: rateLimitPassed } = await checkExpensiveOperationRateLimit(ip);
    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Bulk operations are limited to 5 per hour.' },
        { status: 429 }
      );
    }

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
    const { partnership_id, space_id, data_type, older_than_date } = body;
    const spaceId = space_id || partnership_id;

    if (!spaceId || !data_type || !older_than_date) {
      return NextResponse.json(
        { error: 'space_id, data type, and older_than_date are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    const { data: membership } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Perform archiving based on data type
    let result;
    switch (data_type) {
      case 'expenses':
        result = await archiveOldExpenses(spaceId, older_than_date, supabase);
        break;
      case 'tasks':
        result = await archiveOldTasks(spaceId, older_than_date, supabase);
        break;
      case 'calendar_events':
        result = await archiveOldCalendarEvents(spaceId, older_than_date, supabase);
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
    logger.error('Archive old data error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to archive data' },
      { status: 500 }
    );
  }
}
