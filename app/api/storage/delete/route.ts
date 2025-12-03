/**
 * Storage Delete API Route
 * DELETE /api/storage/delete
 * Deletes files from storage and recalculates usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recalculateStorageUsage } from '@/lib/services/storage-service';
import { z } from 'zod';

const DeleteRequestSchema = z.object({
  spaceId: z.string().uuid(),
  fileIds: z.array(z.string()).min(1),
});

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
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
      console.error('Error fetching files for deletion:', fetchError);
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

    // Verify all files belong to the specified space
    const invalidFiles = files.filter((file: any) => {
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
    const deletePromises = files.map((file: any) => {
      return supabase.storage.from(file.bucket_id).remove([file.name]);
    });

    const deleteResults = await Promise.allSettled(deletePromises);

    // Count successful deletions
    const successCount = deleteResults.filter(
      (result) => result.status === 'fulfilled' && !result.value.error
    ).length;

    const failureCount = deleteResults.length - successCount;

    if (failureCount > 0) {
      console.error(
        `Failed to delete ${failureCount} out of ${deleteResults.length} files`
      );
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
    console.error('Error in storage delete API:', error);
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    );
  }
}
