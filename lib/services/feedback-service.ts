/**
 * Feedback Service
 * Handles CRUD operations for the user_feedback table.
 * User-facing operations use the RLS client; admin operations use supabaseAdmin.
 */

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizePlainText } from '@/lib/sanitize';
import type { UserFeedback, FeedbackCategory, FeedbackStatus } from '@/lib/types';

// =============================================
// USER-FACING (RLS client)
// =============================================

interface SubmitFeedbackInput {
  userId: string;
  category: FeedbackCategory;
  title: string;
  description: string;
}

/** Submit feedback from a logged-in user. */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean; data?: UserFeedback; error?: string }> {
  try {
    const supabase = await createClient();

    const sanitizedTitle = sanitizePlainText(input.title);
    const sanitizedDescription = sanitizePlainText(input.description);

    if (!sanitizedTitle || sanitizedTitle.length < 3) {
      return { success: false, error: 'Title must be at least 3 characters' };
    }
    if (!sanitizedDescription || sanitizedDescription.length < 10) {
      return { success: false, error: 'Description must be at least 10 characters' };
    }

    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: input.userId,
        category: input.category,
        title: sanitizedTitle,
        description: sanitizedDescription,
      })
      .select('id, user_id, category, title, description, status, created_at, updated_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as UserFeedback };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit feedback' };
  }
}

/** Get a user's own feedback submissions (excludes deleted, omits admin_notes). */
export async function getUserFeedback(userId: string): Promise<{ success: boolean; data?: UserFeedback[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_feedback')
      .select('id, user_id, category, title, description, status, created_at, updated_at')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data ?? []) as UserFeedback[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch feedback' };
  }
}

// =============================================
// ADMIN (supabaseAdmin — bypasses RLS)
// =============================================

interface GetAllFeedbackParams {
  page?: number;
  limit?: number;
  status?: FeedbackStatus | 'all';
  category?: FeedbackCategory | 'all';
  search?: string;
}

interface FeedbackListResult {
  items: UserFeedback[];
  total: number;
}

/** Admin: paginated list with filters. */
export async function getAllFeedback(params: GetAllFeedbackParams): Promise<{ success: boolean; data?: FeedbackListResult; error?: string }> {
  try {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('user_feedback')
      .select('id, user_id, category, title, description, status, admin_notes, created_at, updated_at', { count: 'exact' });

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.category && params.category !== 'all') {
      query = query.eq('category', params.category);
    }

    if (params.search) {
      const sanitized = sanitizePlainText(params.search)
        .replace(/[%_\\]/g, '\\$&'); // Escape SQL LIKE wildcards
      if (sanitized) {
        query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        items: (data ?? []) as UserFeedback[],
        total: count ?? 0,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch feedback' };
  }
}

interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  admin_notes?: string;
}

/** Admin: update feedback status or notes. */
export async function updateFeedbackStatus(id: string, input: UpdateFeedbackInput): Promise<{ success: boolean; data?: UserFeedback; error?: string }> {
  try {
    const updateData: Record<string, string> = {};

    if (input.status) {
      updateData.status = input.status;
    }

    if (input.admin_notes !== undefined) {
      updateData.admin_notes = sanitizePlainText(input.admin_notes);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .update(updateData)
      .eq('id', id)
      .select('id, user_id, category, title, description, status, admin_notes, created_at, updated_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as UserFeedback };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update feedback' };
  }
}

interface FeedbackStats {
  total: number;
  open: number;
  in_progress: number;
  done: number;
  bug_reports: number;
  feature_requests: number;
  general: number;
}

/** Admin: counts by status + category for stats bar. */
export async function getFeedbackStats(): Promise<{ success: boolean; data?: FeedbackStats; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .select('status, category')
      .neq('status', 'deleted');

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = data ?? [];
    const stats: FeedbackStats = {
      total: rows.length,
      open: rows.filter(r => r.status === 'open').length,
      in_progress: rows.filter(r => r.status === 'in_progress').length,
      done: rows.filter(r => r.status === 'done').length,
      bug_reports: rows.filter(r => r.category === 'bug_report').length,
      feature_requests: rows.filter(r => r.category === 'feature_request').length,
      general: rows.filter(r => r.category === 'general').length,
    };

    return { success: true, data: stats };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch feedback stats' };
  }
}
