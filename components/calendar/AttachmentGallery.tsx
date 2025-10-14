'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, FileText, Download, Trash2, X, Loader2, Paperclip } from 'lucide-react';
import { eventAttachmentsService, EventAttachment } from '@/lib/services/event-attachments-service';
import { useAuth } from '@/lib/contexts/auth-context';

interface AttachmentGalleryProps {
  eventId: string;
  spaceId: string;
  canUpload?: boolean;
  canDelete?: boolean;
}

export function AttachmentGallery({ eventId, spaceId, canUpload = true, canDelete = true }: AttachmentGalleryProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [eventId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await eventAttachmentsService.getAttachments(eventId);
      setAttachments(data);

      // Load URLs for all attachments
      const urls: Record<string, string> = {};
      for (const attachment of data) {
        try {
          const url = await eventAttachmentsService.getAttachmentUrl(attachment);
          urls[attachment.id] = url;
        } catch (error) {
          console.error(`Failed to load URL for attachment ${attachment.id}:`, error);
        }
      }
      setAttachmentUrls(urls);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await eventAttachmentsService.uploadAttachment({
          event_id: eventId,
          space_id: spaceId,
          file
        });
      }
      await loadAttachments();
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload one or more files. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await eventAttachmentsService.deleteAttachment(attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));

      // Remove URL from cache
      const newUrls = { ...attachmentUrls };
      delete newUrls[attachmentId];
      setAttachmentUrls(newUrls);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete attachment. Please try again.');
    }
  };

  const handleDownload = async (attachment: EventAttachment) => {
    try {
      const url = attachmentUrls[attachment.id];
      if (!url) return;

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const isImageFile = (mimeType: string | null) => {
    return mimeType?.startsWith('image/') || false;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const images = attachments.filter(a => isImageFile(a.mime_type));
  const files = attachments.filter(a => !isImageFile(a.mime_type));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      {canUpload && (
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Attachments</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          />
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && (
        <div className="text-center py-12">
          <Paperclip className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No attachments yet</p>
          {canUpload && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Click the button above to add files
            </p>
          )}
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Images ({images.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((attachment) => {
              const url = attachmentUrls[attachment.id];
              return (
                <div
                  key={attachment.id}
                  className="relative group aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={attachment.file_name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(url)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  )}

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-800" />
                    </button>
                    {canDelete && attachment.uploaded_by === user?.id && (
                      <button
                        onClick={() => handleDelete(attachment.id)}
                        className="p-2 bg-red-500/90 hover:bg-red-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>

                  {/* File Name Tooltip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white truncate">
                    {attachment.file_name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Files ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((attachment) => (
              <div
                key={attachment.id}
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDelete && attachment.uploaded_by === user?.id && (
                      <button
                        onClick={() => handleDelete(attachment.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
