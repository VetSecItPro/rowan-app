import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const EmailRequestSchema = z.object({
  type: z.string().min(1),
  recipient: z.string().email(),
  subject: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()).optional(),
});

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function canNotifyUser(callerId: string, recipientId: string): Promise<boolean> {
  if (callerId === recipientId) return true;

  const [callerSpacesResult, recipientSpacesResult] = await Promise.all([
    supabaseAdmin
      .from('space_members')
      .select('space_id')
      .eq('user_id', callerId),
    supabaseAdmin
      .from('space_members')
      .select('space_id')
      .eq('user_id', recipientId),
  ]);

  if (callerSpacesResult.error || recipientSpacesResult.error) {
    logger.error('Error checking space membership for email', {
      component: 'api-route',
      action: 'api_request',
      callerError: callerSpacesResult.error,
      recipientError: recipientSpacesResult.error,
    });
    return false;
  }

  const callerSpaces = callerSpacesResult.data || [];
  const recipientSpaces = recipientSpacesResult.data || [];
  const recipientSpaceIds = new Set(recipientSpaces.map((space) => space.space_id));
  return callerSpaces.some((space) => recipientSpaceIds.has(space.space_id));
}

export async function POST(req: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = EmailRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { type, recipient, subject, data } = parsed.data;
    // Sanitize HTML to prevent phishing/XSS via email injection
    let html = typeof data?.html === 'string' ? data.html : undefined;
    if (html) {
      // Strip dangerous tags: scripts, forms, iframes, objects, embeds
      html = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed\b[^>]*\/?>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*\S+/gi, '');
    }
    const text = typeof data?.text === 'string' ? data.text : undefined;

    if (!html && !text) {
      return NextResponse.json(
        { success: false, error: 'Email content missing' },
        { status: 400 }
      );
    }

    const { data: recipientUser, error: recipientError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', recipient)
      .maybeSingle();

    if (recipientError || !recipientUser) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const authorized = await canNotifyUser(user.id, recipientUser.id);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to notify this user' },
        { status: 403 }
      );
    }

    const emailOptions = {
      from: 'Rowan <notifications@rowanapp.com>',
      to: recipient,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      tags: [
        { name: 'type', value: type.slice(0, 64) },
      ],
    };

    const { error: sendError } = await resend.emails.send(emailOptions as Parameters<typeof resend.emails.send>[0]);

    if (sendError) {
      logger.error('Resend email send failed', sendError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: sendError.message || 'Email send failed' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Email notification API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
