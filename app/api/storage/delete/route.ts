/**
 * Storage Delete API Route
 * DELETE /api/storage/delete
 * Deletes files from storage and recalculates usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recalculateStorageUsage } from '@/lib/services/storage-service';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';

const DeleteRequestSchema = z.object({
  spaceId: z.string().uuid(),
  fileIds: z.array(z.string()).min(1),
});

/** Deletes files from storage and recalculates usage */
export async function DELETE(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = DeleteRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { spaceId, fileIds } = validation.data;

    // Verify user has access to this space
    const { data: spaceMember, error: memberError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !spaceMember) {
      return NextResponse.json(
        { error: 'Access denied to this space' },
        { status: 403 }
      );
    }

    // Get file paths for the given IDs
    const { data: files, error: fetchError } = await supabase
      .from('objects')
      .select('id, name, bucket_id, metadata')
      .in('id', fileIds);

    if (fetchError) {
      logger.error('Error fetching files for deletion:', fetchError, {
        component: 'StorageDeleteAPI',
        action: 'FETCH_FILES',
      });
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files found to delete' },
        { status: 404 }
      );
    }

    type StorageObjectRow = {
      id: string;
      name: string;
      bucket_id: string;
      metadata?: { space_id?: string } | null;
    };
    const fileRows = (files ?? []) as StorageObjectRow[];

    // Verify all files belong to the specified space
    const invalidFiles = fileRows.filter((file) => {
      const metadata = file.metadata || {};
      return metadata.space_id !== spaceId;
    });

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: 'Some files do not belong to the specified space' },
        { status: 403 }
      );
    }

    // Delete files from storage
    const deletePromises = fileRows.map((file) => {
      return supabase.storage.from(file.bucket_id).remove([file.name]);
    });

    const deleteResults = await Promise.allSettled(deletePromises);

    // Count successful deletions
    const successCount = deleteResults.filter(
      (result) => result.status === 'fulfilled' && !result.value.error
    ).length;

    const failureCount = deleteResults.length - successCount;

    if (failureCount > 0) {
      logger.warn(`Failed to delete ${failureCount} out of ${deleteResults.length} files`, {
        component: 'StorageDeleteAPI',
        action: 'DELETE_FILES',
        failureCount,
        totalCount: deleteResults.length,
      });
    }

    // Recalculate storage usage
    await recalculateStorageUsage(spaceId);

    return NextResponse.json(
      {
        success: true,
        deleted: successCount,
        failed: failureCount,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in storage delete API:', error, {
      component: 'StorageDeleteAPI',
      action: 'DELETE',
    });
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    );
  }
}
