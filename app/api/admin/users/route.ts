import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { z } from 'zod';

// Query parameter validation schema
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  refresh: z.enum(['true', 'false']).optional(),
});

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

type ProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * GET /api/admin/users
 * Get all users for admin management
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify admin authentication (checks both middleware header and cookie)
    const auth = await verifyAdminAuth(req);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = QueryParamsSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
      refresh: searchParams.get('refresh') || undefined,
    });
    const { page, limit } = validatedParams;
    const forceRefresh = validatedParams.refresh === 'true';

    // Fetch users with caching (2 minute TTL)
    const { users, totalUsers } = await withCache(
      ADMIN_CACHE_KEYS.usersList(page, limit),
      async () => {
        // Query profiles table — same source as Recent Activity
        const offset = (page - 1) * limit;
        const { data: profiles, error: profilesError, count } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, avatar_url, created_at, updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (profilesError) {
          throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        const profileRecords = (profiles || []) as ProfileRecord[];

        // Determine active status: updated within the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const users = profileRecords.map((profile) => ({
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || '',
          created_at: profile.created_at,
          last_sign_in_at: profile.updated_at,
          status: profile.updated_at >= thirtyDaysAgo ? 'active' : 'inactive',
        }));

        return {
          users,
          totalUsers: count ?? users.length,
        };
      },
      { ttl: ADMIN_CACHE_TTL.usersList, skipCache: forceRefresh }
    );

    // Log admin access

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/users',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
