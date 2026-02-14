// ICS File Upload API Route
// Handles one-time import of events from uploaded .ics files

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { icsImportService } from '@/lib/services/calendar';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

export const maxDuration = 60;


// Validation schema for ICS file import
const ICSFileImportSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  ics_content: z.string().min(1, 'ICS content is required'),
  file_name: z.string().optional(),
});

// Maximum file size: 1MB
const MAX_FILE_SIZE = 1024 * 1024;

/** Imports calendar events from an uploaded ICS file */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 1MB.' },
        { status: 413 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ICSFileImportSchema.parse(body);

    // Additional size check on content
    if (validatedData.ics_content.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File content too large. Maximum size is 1MB.' },
        { status: 413 }
      );
    }

    // Verify user has access to the space
    const { data: spaceMember, error: spaceError } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('space_id', validatedData.space_id)
      .eq('user_id', user.id)
      .single();

    if (spaceError || !spaceMember) {
      return NextResponse.json(
        { error: 'Space not found or access denied' },
        { status: 403 }
      );
    }

    // Validate ICS content before importing
    const validation = icsImportService.validateICSContent(validatedData.ics_content);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid ICS file',
          details: validation.error,
        },
        { status: 400 }
      );
    }

    // Import events from ICS content
    const importResult = await icsImportService.importICSFile(
      validatedData.ics_content,
      validatedData.space_id,
      user.id,
      validatedData.file_name
    );

    if (!importResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to import events',
          details: importResult.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      events_imported: importResult.eventsImported,
      calendar_name: validation.calendarName,
      file_name: validatedData.file_name,
      message: `Successfully imported ${importResult.eventsImported} events`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import ICS file' },
      { status: 500 }
    );
  }
}
