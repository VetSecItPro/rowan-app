/**
 * POST /api/storage/check-quota  (Phase 11.2)
 *
 * Server-side storage-quota pre-check. Message attachments upload directly from
 * the browser to Supabase Storage, so the only place to enforce the per-space
 * storage limit before the bytes land is a server endpoint the client calls
 * first. Returns whether a file of the given size would fit under the space's
 * quota. The client (file-upload-service) calls this and aborts on denial.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkStorageQuota } from '@/lib/services/storage-service';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

// 100 MB hard ceiling on a single declared file size (sanity bound; the actual
// per-file and per-space limits are enforced by checkStorageQuota + storage RLS).
const MAX_DECLARED_FILE_BYTES = 100 * 1024 * 1024;

const CheckQuotaSchema = z.object({
  spaceId: z.string().uuid('Invalid space ID'),
  fileSizeBytes: z.number().int().positive().max(MAX_DECLARED_FILE_BYTES),
});

export async function POST(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success: rateOk } = await checkGeneralRateLimit(ip);
    if (!rateOk) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CheckQuotaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
    }
    const { spaceId, fileSizeBytes } = parsed.data;

    // Must be a member of the space to check (and ultimately upload to) it.
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch {
      return NextResponse.json({ error: 'You do not have access to this space' }, { status: 403 });
    }

    const result = await checkStorageQuota(spaceId, fileSizeBytes);
    if (!result.success) {
      // Fail closed on a quota-check error so we never let an upload bypass the limit.
      return NextResponse.json({ error: 'Could not verify storage quota' }, { status: 500 });
    }

    if (!result.data.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          error: 'This space has reached its storage limit. Free up space or upgrade for more.',
          currentBytes: result.data.currentBytes,
          limitBytes: result.data.limitBytes,
          availableBytes: result.data.availableBytes,
        },
        { status: 413 }, // Payload Too Large — the file would exceed the quota
      );
    }

    return NextResponse.json({
      allowed: true,
      currentBytes: result.data.currentBytes,
      limitBytes: result.data.limitBytes,
      availableBytes: result.data.availableBytes,
    });
  } catch (error) {
    logger.error('[API] /api/storage/check-quota error:', error, { component: 'api-route', action: 'check_quota' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
