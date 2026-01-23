import { createClient } from '@/lib/supabase/client';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  storage_bucket: string;
  thumbnail_path?: string;
  is_image: boolean;
  is_document: boolean;
  is_video: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

export const taskAttachmentsService = {
  async uploadAttachment(taskId: string, file: File, userId: string): Promise<TaskAttachment> {
    const supabase = createClient();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${taskId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create database record
    const { data, error } = await supabase.from('task_attachments').insert({
      task_id: taskId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: filePath,
      storage_bucket: 'task-attachments',
      uploaded_by: userId,
    }).select().single();

    if (error) throw error;
    return data;
  },

  async getAttachments(taskId: string): Promise<TaskAttachment[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_attachments').select('*').eq('task_id', taskId).order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAttachmentUrl(storagePath: string): Promise<string> {
    const supabase = createClient();
    const { data } = supabase.storage.from('task-attachments').getPublicUrl(storagePath);
    return data.publicUrl;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    const supabase = createClient();
    const { data: attachment, error: fetchError } = await supabase.from('task_attachments').select('storage_path').eq('id', attachmentId).single();
    if (fetchError) throw fetchError;

    await supabase.storage.from('task-attachments').remove([attachment.storage_path]);
    const { error } = await supabase.from('task_attachments').delete().eq('id', attachmentId);
    if (error) throw error;
  },
};
