'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { taskAttachmentsService, TaskAttachment } from '@/lib/services/task-attachments-service';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    attachmentId: string | null;
  }>({ isOpen: false, attachmentId: null });

  useEffect(() => {
    if (isOpen) loadAttachments();
  }, [isOpen, taskId]);

  async function loadAttachments() {
    try {
      const data = await taskAttachmentsService.getAttachments(taskId);
      setAttachments(data);
    } catch (error) {
      logger.error('Error loading attachments:', error, { component: 'AttachmentsModal', action: 'component_action' });
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
      logger.error('Error uploading file:', error, { component: 'AttachmentsModal', action: 'component_action' });
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
      logger.error('Error downloading file:', error, { component: 'AttachmentsModal', action: 'component_action' });
    }
  }

  function handleDeleteClick(attachmentId: string) {
    setConfirmDialog({ isOpen: true, attachmentId });
  }

  async function handleDeleteConfirm() {
    if (!confirmDialog.attachmentId) return;

    try {
      await taskAttachmentsService.deleteAttachment(confirmDialog.attachmentId);
      setConfirmDialog({ isOpen: false, attachmentId: null });
      loadAttachments();
    } catch (error) {
      logger.error('Error deleting attachment:', error, { component: 'AttachmentsModal', action: 'component_action' });
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

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attachments"
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-blue-500 to-blue-600"
    >
      <div className="space-y-4">
        {loading ? (
            <div className="text-center py-8 text-gray-500">Loading attachments...</div>
          ) : (
            <>
              <label htmlFor="field-1" className="flex items-center justify-center gap-2 p-6 mb-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Click to upload file (max 50MB)'}
                </span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                id="field-1" />
              </label>

              {uploading && (
                <div className="mb-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
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
                      className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg"
                    >
                      {getFileIcon((attachment as any).mime_type)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {attachment.file_name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(attachment)}
                          className="p-2 text-blue-600 hover:bg-blue-900 rounded-lg"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(attachment.id)}
                          className="p-2 text-red-600 hover:bg-red-900 rounded-lg"
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
    </Modal>

    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={() => setConfirmDialog({ isOpen: false, attachmentId: null })}
      onConfirm={handleDeleteConfirm}
      title="Delete Attachment"
      message="Are you sure you want to delete this attachment? This action cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
    />
    </>
  );
}
