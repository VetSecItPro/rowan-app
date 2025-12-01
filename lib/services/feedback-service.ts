import { createClient } from '@/lib/supabase/client';
import type { FeedbackSubmission, CreateFeedbackInput, UpdateFeedbackInput, FeedbackStatus } from '@/lib/types';

export const feedbackService = {
  /**
   * Submit new feedback
   */
  async submitFeedback(input: CreateFeedbackInput & { user_id: string; space_id?: string }): Promise<{ success: boolean; data?: FeedbackSubmission; error?: string }> {
    try {
      const supabase = createClient();

      // Upload screenshot if provided
      let screenshot_url: string | null = null;
      if (input.screenshot) {
        const uploadResult = await this.uploadScreenshot(input.user_id, input.screenshot);
        if (!uploadResult.success) {
          return { success: false, error: uploadResult.error };
        }
        screenshot_url = uploadResult.url!;
      }

      // Insert feedback
      const { data, error } = await supabase
        .from('feedback_submissions')
        .insert({
          user_id: input.user_id,
          space_id: input.space_id || null,
          feedback_type: input.feedback_type || null,
          feature_name: input.feature_name || null,
          page_url: input.page_url || null,
          description: input.description,
          screenshot_url,
          browser_info: input.browser_info || null,
          status: 'new',
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as FeedbackSubmission };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, error: 'Failed to submit feedback' };
    }
  },

  /**
   * Upload screenshot to Supabase storage
   */
  async uploadScreenshot(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const supabase = createClient();

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${timestamp}-${file.name}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from('feedback-screenshots')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading screenshot:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('feedback-screenshots')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return { success: false, error: 'Failed to upload screenshot' };
    }
  },

  /**
   * Get user's own feedback submissions
   */
  async getUserFeedback(userId: string): Promise<{ success: boolean; data?: FeedbackSubmission[]; error?: string }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as FeedbackSubmission[] };
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      return { success: false, error: 'Failed to fetch feedback' };
    }
  },

  /**
   * Get all feedback submissions (admin only)
   */
  async getAllFeedback(filters?: {
    status?: FeedbackStatus;
    feedback_type?: string;
    search?: string;
  }): Promise<{ success: boolean; data?: FeedbackSubmission[]; error?: string }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('feedback_submissions')
        .select(`
          *,
          user:users(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.feedback_type) {
        query = query.eq('feedback_type', filters.feedback_type);
      }

      if (filters?.search) {
        query = query.or(`description.ilike.%${filters.search}%,feature_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as FeedbackSubmission[] };
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return { success: false, error: 'Failed to fetch feedback' };
    }
  },

  /**
   * Get single feedback submission by ID
   */
  async getFeedbackById(id: string): Promise<{ success: boolean; data?: FeedbackSubmission; error?: string }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('feedback_submissions')
        .select(`
          *,
          user:users(id, name, email, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as FeedbackSubmission };
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return { success: false, error: 'Failed to fetch feedback' };
    }
  },

  /**
   * Update feedback (admin only)
   */
  async updateFeedback(id: string, input: UpdateFeedbackInput): Promise<{ success: boolean; data?: FeedbackSubmission; error?: string }> {
    try {
      const supabase = createClient();

      const { data, error} = await supabase
        .from('feedback_submissions')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as FeedbackSubmission };
    } catch (error) {
      console.error('Error updating feedback:', error);
      return { success: false, error: 'Failed to update feedback' };
    }
  },

  /**
   * Delete feedback (admin only)
   */
  async deleteFeedback(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Get feedback to delete screenshot if exists
      const { data: feedback } = await supabase
        .from('feedback_submissions')
        .select('screenshot_url')
        .eq('id', id)
        .single();

      // Delete screenshot if exists
      if (feedback?.screenshot_url) {
        const path = feedback.screenshot_url.split('/feedback-screenshots/')[1];
        if (path) {
          await supabase.storage
            .from('feedback-screenshots')
            .remove([path]);
        }
      }

      // Delete feedback
      const { error } = await supabase
        .from('feedback_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting feedback:', error);
      return { success: false, error: 'Failed to delete feedback' };
    }
  },

  /**
   * Get feedback count by status (admin only)
   */
  async getFeedbackStats(): Promise<{ success: boolean; data?: Record<FeedbackStatus, number>; error?: string }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('status');

      if (error) {
        console.error('Error fetching feedback stats:', error);
        return { success: false, error: error.message };
      }

      const stats = data.reduce((acc, item) => {
        const status = item.status as FeedbackStatus;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<FeedbackStatus, number>);

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      return { success: false, error: 'Failed to fetch feedback stats' };
    }
  },
};
