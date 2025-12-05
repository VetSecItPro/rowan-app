import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import LRUCache from 'lru-cache';
import { eventParserService } from '@/lib/services/ai/event-parser-service';

// Request validation schema
const ParseEventRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text is too long'),
  timezone: z.string().optional(),
  referenceDate: z.string().optional(),
});

// Rate limiter: 20 requests per hour per user
const redis = Redis.fromEnv();
const eventParserRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: 'ai_event_parser',
});

// Fallback cache for when Redis is unavailable
const fallbackCache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 1000,
  ttl: 60 * 60 * 1000, // 1 hour
});

async function checkRateLimit(userId: string): Promise<{ success: boolean; remaining?: number; reset?: Date }> {
  try {
    const result = await eventParserRateLimit.limit(userId);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset ? new Date(result.reset) : undefined,
    };
  } catch (error) {
    console.warn('[EventParser] Rate limit fallback - Redis unavailable:', error);

    // Fallback to in-memory cache
    const now = Date.now();
    const cached = fallbackCache.get(userId);

    if (cached) {
      if (cached.resetAt < now) {
        // Reset expired
        fallbackCache.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
        return { success: true, remaining: 19 };
      }

      if (cached.count >= 20) {
        return {
          success: false,
          remaining: 0,
          reset: new Date(cached.resetAt),
        };
      }

      cached.count += 1;
      fallbackCache.set(userId, cached);
      return { success: true, remaining: 20 - cached.count };
    }

    fallbackCache.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { success: true, remaining: 19 };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. You can parse up to 20 events per hour.',
          retryAfter: rateLimitResult.reset?.toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset?.toISOString() || '',
          },
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedBody = ParseEventRequestSchema.safeParse(body);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: validatedBody.error.issues[0].message },
        { status: 400 }
      );
    }

    const { text, timezone, referenceDate } = validatedBody.data;

    // Parse the event using AI
    const parseResult = await eventParserService.parseEventText(text, {
      timezone: timezone || 'America/New_York',
      referenceDate: referenceDate ? new Date(referenceDate) : new Date(),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error },
        { status: 422 }
      );
    }

    // Return successful parse result
    return NextResponse.json(
      {
        success: true,
        event: parseResult.data,
        rateLimitRemaining: rateLimitResult.remaining,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
        },
      }
    );
  } catch (error) {
    console.error('[EventParser API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
