import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tasksService } from '@/lib/services/tasks-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';

/**
 * GET /api/tasks
 * Get all tasks for a space with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, spaceId);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigned_to = searchParams.get('assigned_to');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query options
    const options: any = {};
    if (status) options.status = status;
    if (priority) options.priority = priority;
    if (assigned_to) options.assigned_to = assigned_to;
    if (category) options.category = category;
    if (search) options.search = search;

    // Get tasks from service
    const tasks = await tasksService.getTasks(spaceId, options);

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('[API] /api/tasks GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { space_id, title } = body;

    // Validate required fields
    if (!space_id || !title) {
      return NextResponse.json(
        { error: 'space_id and title are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Create task using service
    const task = await tasksService.createTask({
      ...body,
      created_by: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('[API] /api/tasks POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
