import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface EventAttachment {
  id: string;
  event_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface UploadAttachmentInput {
  event_id: string;
  space_id: string;
  file: File;
}

// Allowed file types (security: no executables, scripts, or SVG)
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Service for uploading, fetching, and deleting file attachments for calendar events. */
export const eventAttachmentsService = {
  /**
   * Upload a file attachment to an event
   */
  async uploadAttachment(input: UploadAttachmentInput): Promise<EventAttachment> {
    const supabase = createClient();

    // Validate file type
    if (!ALLOWED_TYPES.includes(input.file.type)) {
      throw new Error(`File type ${input.file.type} is not allowed. Only images and documents are permitted.`);
    }

    // Validate file size
    if (input.file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomString = crypto.randomUUID();
    const fileExtension = input.file.name.split('.').pop();
    const sanitizedFileName = input.file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
    const storagePath = `events/${input.event_id}/${timestamp}-${randomString}.${fileExtension}`;

    // Upload to Supabase Storage
    const { error: storageError } = await supabase
      .storage
      .from('event-attachments')
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      logger.error('Storage upload error:', storageError, { component: 'lib-event-attachments-service', action: 'service_call' });
      throw new Error('Failed to upload file to storage');
    }

    // Create database record
    const { data, error } = await supabase
      .from('event_attachments')
      .insert([{
        event_id: input.event_id,
        space_id: input.space_id,
        file_name: sanitizedFileName,
        file_size: input.file.size,
        mime_type: input.file.type,
        storage_path: storagePath
      }])
      .select()
      .single();

    if (error) {
      // Cleanup: delete uploaded file if database insert fails
      await supabase.storage
        .from('event-attachments')
        .remove([storagePath]);

      throw error;
    }

    return data;
  },

  /**
   * Get all attachments for an event
   */
  async getAttachments(eventId: string): Promise<EventAttachment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_attachments')
      .select('id, event_id, file_name, file_size, mime_type, storage_path, uploaded_by, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a signed URL for downloading/viewing an attachment
   */
  async getAttachmentUrl(attachment: EventAttachment): Promise<string> {
    const supabase = createClient();

    const { data, error } = await supabase
      .storage
      .from('event-attachments')
      .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

    return data.signedUrl;
  },

  /**
   * Download an attachment
   */
  async downloadAttachment(attachment: EventAttachment): Promise<Blob> {
    const supabase = createClient();

    const { data, error } = await supabase
      .storage
      .from('event-attachments')
      .download(attachment.storage_path);

    if (error) throw error;
    if (!data) throw new Error('File not found');

    return data;
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    const supabase = createClient();

    // Get attachment details first
    const { data: attachment, error: fetchError } = await supabase
      .from('event_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!attachment) throw new Error('Attachment not found');

    // Delete from database first
    const { error: dbError } = await supabase
      .from('event_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;

    // Then delete from storage
    const { error: storageError } = await supabase
      .storage
      .from('event-attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      logger.error('Failed to delete file from storage:', storageError, { component: 'lib-event-attachments-service', action: 'service_call' });
      // Don't throw - database record is already deleted
    }
  },

  /**
   * Get attachment count for an event
   */
  async getAttachmentCount(eventId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('event_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (error) throw error;
    return count || 0;
  }
};
