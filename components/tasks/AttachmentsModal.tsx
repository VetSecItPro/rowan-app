'use client';

import { useState, useEffect } from 'react';
import { X, Paperclip, Upload, Download, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { taskAttachmentsService, TaskAttachment } from '@/lib/services/task-attachments-service';

interface AttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  userId: string;
}

export function AttachmentsModal({ isOpen, onClose, taskId, userId }: AttachmentsModalProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen) loadAttachments();
  }, [isOpen, taskId]);

  async function loadAttachments() {
    try {
      const data = await taskAttachmentsService.getAttachments(taskId);
      setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await taskAttachmentsService.uploadAttachment(taskId, file, userId);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
        loadAttachments();
      }, 500);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDownload(attachment: TaskAttachment) {
    try {
      const url = await taskAttachmentsService.getAttachmentUrl((attachment as any).file_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await taskAttachmentsService.deleteAttachment(attachmentId);
      loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    return <FileText className="w-8 h-8 text-gray-500" />;
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attachments</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading attachments...</div>
          ) : (
            <>
              <label className="flex items-center justify-center gap-2 p-6 mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Click to upload file (max 50MB)'}
                </span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {uploading && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {attachments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No attachments yet</div>
              ) : (
                <div className="grid gap-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      {getFileIcon((attachment as any).mime_type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {attachment.file_name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(attachment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(attachment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
