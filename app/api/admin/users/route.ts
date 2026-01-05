import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { withCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Query parameter validation schema
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  refresh: z.enum(['true', 'false']).optional(),
});

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

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
        // Fetch users from auth.users table using admin client
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: limit,
        });

        if (authError) {
          throw new Error(`Failed to fetch auth users: ${authError.message}`);
        }

        // Get beta access information for users
        const userIds = authUsers.users.map((user: any) => user.id);

        let betaUsers: any[] = [];
        if (userIds.length > 0) {
          const { data: betaData, error: betaError } = await supabaseAdmin
            .from('beta_access_requests')
            .select('user_id, access_granted')
            .in('user_id', userIds)
            .eq('access_granted', true);

          if (!betaError) {
            betaUsers = betaData || [];
          }
        }

        // Create a set of beta user IDs for quick lookup
        const betaUserIds = new Set(betaUsers.map(beta => beta.user_id));

        // Transform users data
        const users = authUsers.users.map((user: any) => ({
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          is_beta: betaUserIds.has(user.id),
          status: user.last_sign_in_at ? 'active' : 'inactive',
          user_metadata: user.user_metadata,
        }));

        return {
          users,
          totalUsers: authUsers.total || users.length,
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