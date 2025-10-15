'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, ExternalLink, FileIcon } from 'lucide-react';
import { reminderAttachmentsService, ReminderAttachment } from '@/lib/services/reminder-attachments-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface AttachmentListProps {
  reminderId: string;
  refreshTrigger?: number; // Increment this to refresh the list
}

export function AttachmentList({ reminderId, refreshTrigger }: AttachmentListProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<ReminderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);

  // Fetch attachments
  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await reminderAttachmentsService.getAttachments(reminderId);
      setAttachments(data);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [reminderId, refreshTrigger]);

  // Delete attachment
  const handleDelete = async (attachmentId: string) => {
    if (!user) return;
    setAttachmentToDelete(attachmentId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!user || !attachmentToDelete) return;

    setDeletingId(attachmentToDelete);
    setShowDeleteConfirm(false);

    try {
      await reminderAttachmentsService.deleteAttachment(attachmentToDelete, user.id);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentToDelete));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert(`Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
      setAttachmentToDelete(null);
    }
  };

  // Download file
  const handleDownload = (attachment: ReminderAttachment) => {
    if (attachment.type === 'file' && attachment.file_path) {
      const url = reminderAttachmentsService.getFileUrl(attachment.file_path);
      window.open(url, '_blank');
    } else if (attachment.type === 'url' && attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        Loading attachments...
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        No attachments yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            onDelete={() => handleDelete(attachment.id)}
            onDownload={() => handleDownload(attachment)}
            isDeleting={deletingId === attachment.id}
            canDelete={user?.id === attachment.uploaded_by}
          />
        ))}
      </div>

      {/* Delete Attachment Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAttachmentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}

// =============================================
// ATTACHMENT ITEM COMPONENT
// =============================================

interface AttachmentItemProps {
  attachment: ReminderAttachment;
  onDelete: () => void;
  onDownload: () => void;
  isDeleting: boolean;
  canDelete: boolean;
}

function AttachmentItem({
  attachment,
  onDelete,
  onDownload,
  isDeleting,
  canDelete,
}: AttachmentItemProps) {
  const isImage = reminderAttachmentsService.isImage(attachment);
  const icon = reminderAttachmentsService.getAttachmentIcon(attachment);
  const fileSize = reminderAttachmentsService.formatFileSize(attachment.file_size);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg group hover:shadow-md transition-shadow">
      {/* Icon/Thumbnail */}
      <div className="flex-shrink-0">
        {isImage && attachment.type === 'file' && attachment.file_path ? (
          <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-800">
            <img
              src={reminderAttachmentsService.getFileUrl(attachment.file_path)}
              alt={attachment.display_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl">
            {icon}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {attachment.display_name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {attachment.type === 'file' && <span>{fileSize}</span>}
          {attachment.uploader && <span>• {attachment.uploader.name}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Download/Open Button */}
        {(attachment.type === 'file' || attachment.type === 'url') && (
          <button
            onClick={onDownload}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label={attachment.type === 'url' ? 'Open link' : 'Download file'}
          >
            {attachment.type === 'url' ? (
              <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
            aria-label="Delete attachment"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}
