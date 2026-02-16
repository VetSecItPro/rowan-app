import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  archiveOldExpenses,
  archiveOldTasks,
  archiveOldCalendarEvents,
} from '@/lib/services/bulk-operations-service';
import { checkExpensiveOperationRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

const ArchiveRequestSchema = z.object({
  partnership_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  data_type: z.enum(['expenses', 'tasks', 'calendar_events']),
  older_than_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be a valid date string (YYYY-MM-DD)'),
}).refine(
  (data) => data.space_id || data.partnership_id,
  { message: 'space_id or partnership_id is required' }
);

/**
 * Archive (Delete) Old Data API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 5: Data Minimization
 * - Deletes old data to reduce actively processed information
 * Note: No archive columns exist on these tables, so archiving = permanent deletion.
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

    // Validate request body
    const body = await request.json();
    const parsed = ArchiveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { partnership_id, space_id, data_type, older_than_date } = parsed.data;
    const spaceId = (space_id || partnership_id)!;

    // Verify user has access to this space
    const { data: membership } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Perform archiving based on data type (enum validated by Zod)
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
