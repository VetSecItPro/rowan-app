/**
 * Reminder Attachments Service
 * Handles file uploads, URLs, and cross-feature links for reminders
 */

import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

// =============================================
// TYPES & INTERFACES
// =============================================

export type AttachmentType = 'file' | 'url' | 'link_task' | 'link_shopping' | 'link_event';

export interface ReminderAttachment {
  id: string;
  reminder_id: string;
  type: AttachmentType;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  url?: string;
  linked_id?: string;
  display_name: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

// =============================================
// ZOD SCHEMAS
// =============================================

const attachmentTypeSchema = z.enum(['file', 'url', 'link_task', 'link_shopping', 'link_event']);

const reminderAttachmentSchema = z.object({
  id: z.string().uuid(),
  reminder_id: z.string().uuid(),
  type: attachmentTypeSchema,
  file_path: z.string().optional(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  url: z.string().url().optional(),
  linked_id: z.string().uuid().optional(),
  display_name: z.string().min(1).max(255),
  uploaded_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

const createFileAttachmentSchema = z.object({
  reminder_id: z.string().uuid(),
  display_name: z.string().min(1).max(255),
});

const createUrlAttachmentSchema = z.object({
  reminder_id: z.string().uuid(),
  url: z.string().url(),
  display_name: z.string().min(1).max(255),
});

const createLinkAttachmentSchema = z.object({
  reminder_id: z.string().uuid(),
  type: z.enum(['link_task', 'link_shopping', 'link_event']),
  linked_id: z.string().uuid(),
  display_name: z.string().min(1).max(255),
});

// =============================================
// CONSTANTS
// =============================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',
];

// =============================================
// SERVICE FUNCTIONS
// =============================================

export const reminderAttachmentsService = {
  /**
   * Get all attachments for a reminder
   */
  async getAttachments(reminderId: string): Promise<ReminderAttachment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_attachments')
      .select(`
        *,
        uploader:uploaded_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('reminder_id', reminderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      throw new Error('Failed to fetch attachments');
    }

    return data || [];
  },

  /**
   * Upload a file attachment
   */
  async uploadFile(
    reminderId: string,
    file: File,
    uploadedBy: string
  ): Promise<ReminderAttachment> {
    // Validate file
    this.validateFile(file);

    const validated = createFileAttachmentSchema.parse({
      reminder_id: reminderId,
      display_name: file.name,
    });

    const supabase = createClient();

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${reminderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('reminder-attachments')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error('Failed to upload file');
    }

    // Create attachment record
    const { data, error } = await supabase
      .from('reminder_attachments')
      .insert({
        reminder_id: validated.reminder_id,
        type: 'file',
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        display_name: validated.display_name,
        uploaded_by: uploadedBy,
      })
      .select(`
        *,
        uploader:uploaded_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('reminder-attachments').remove([fileName]);
      console.error('Error creating attachment record:', error);
      throw new Error('Failed to create attachment record');
    }

    return data;
  },

  /**
   * Create a URL attachment
   */
  async createUrlAttachment(
    reminderId: string,
    url: string,
    displayName: string,
    uploadedBy: string
  ): Promise<ReminderAttachment> {
    const validated = createUrlAttachmentSchema.parse({
      reminder_id: reminderId,
      url,
      display_name: displayName,
    });

    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_attachments')
      .insert({
        reminder_id: validated.reminder_id,
        type: 'url',
        url: validated.url,
        display_name: validated.display_name,
        uploaded_by: uploadedBy,
      })
      .select(`
        *,
        uploader:uploaded_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating URL attachment:', error);
      throw new Error('Failed to create URL attachment');
    }

    return data;
  },

  /**
   * Create a link attachment (to task, shopping list, or event)
   */
  async createLinkAttachment(
    reminderId: string,
    type: 'link_task' | 'link_shopping' | 'link_event',
    linkedId: string,
    displayName: string,
    uploadedBy: string
  ): Promise<ReminderAttachment> {
    const validated = createLinkAttachmentSchema.parse({
      reminder_id: reminderId,
      type,
      linked_id: linkedId,
      display_name: displayName,
    });

    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_attachments')
      .insert({
        reminder_id: validated.reminder_id,
        type: validated.type,
        linked_id: validated.linked_id,
        display_name: validated.display_name,
        uploaded_by: uploadedBy,
      })
      .select(`
        *,
        uploader:uploaded_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating link attachment:', error);
      throw new Error('Failed to create link attachment');
    }

    return data;
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const supabase = createClient();

    // Get attachment details first
    const { data: attachment, error: fetchError } = await supabase
      .from('reminder_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('uploaded_by', userId) // Verify ownership
      .single();

    if (fetchError || !attachment) {
      console.error('Error fetching attachment:', fetchError);
      throw new Error('Attachment not found or unauthorized');
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('reminder_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      console.error('Error deleting attachment:', deleteError);
      throw new Error('Failed to delete attachment');
    }

    // Delete file from storage if it's a file attachment
    if (attachment.type === 'file' && attachment.file_path) {
      await supabase.storage
        .from('reminder-attachments')
        .remove([attachment.file_path]);
    }
  },

  /**
   * Get public URL for a file attachment
   */
  getFileUrl(filePath: string): string {
    const supabase = createClient();
    const { data } = supabase.storage
      .from('reminder-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('File type not allowed. Supported types: images, PDFs, documents, and text files');
    }
  },

  /**
   * Check if attachment is an image
   */
  isImage(attachment: ReminderAttachment): boolean {
    return attachment.mime_type?.startsWith('image/') || false;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Get icon for attachment type
   */
  getAttachmentIcon(attachment: ReminderAttachment): string {
    if (attachment.type === 'url') return '🔗';
    if (attachment.type === 'link_task') return '✅';
    if (attachment.type === 'link_shopping') return '🛒';
    if (attachment.type === 'link_event') return '📅';

    // For files, determine by MIME type
    if (attachment.mime_type?.startsWith('image/')) return '🖼️';
    if (attachment.mime_type === 'application/pdf') return '📄';
    if (attachment.mime_type?.includes('word')) return '📝';
    if (attachment.mime_type?.includes('excel') || attachment.mime_type?.includes('spreadsheet')) return '📊';
    if (attachment.mime_type?.startsWith('text/')) return '📃';

    return '📎';
  },
};
