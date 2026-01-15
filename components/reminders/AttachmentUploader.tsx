'use client';

import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { reminderAttachmentsService } from '@/lib/services/reminder-attachments-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

interface AttachmentUploaderProps {
  reminderId: string;
  onUploadComplete: () => void;
}

export function AttachmentUploader({ reminderId, onUploadComplete }: AttachmentUploaderProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlDisplayName, setUrlDisplayName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload files
  const uploadFiles = async (files: File[]) => {
    if (!user) return;

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => f.name).join(', ');
      alert(`Files exceed 2MB limit: ${names}`);
      return;
    }

    setIsUploading(true);

    try {
      // Upload files sequentially
      for (const file of files) {
        try {
          await reminderAttachmentsService.uploadFile(reminderId, file, user.id);
        } catch (error) {
          logger.error('Error uploading ${file.name}:', error, { component: 'AttachmentUploader', action: 'component_action' });
          alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      onUploadComplete();
    } finally {
      setIsUploading(false);
    }
  };

  // Handle URL submission
  const handleUrlSubmit = async () => {
    if (!user || !urlValue.trim()) return;

    setIsUploading(true);

    try {
      await reminderAttachmentsService.createUrlAttachment(
        reminderId,
        urlValue.trim(),
        urlDisplayName.trim() || urlValue.trim(),
        user.id
      );

      setUrlValue('');
      setUrlDisplayName('');
      setShowUrlInput(false);
      onUploadComplete();
    } catch (error) {
      logger.error('Error creating URL attachment:', error, { component: 'AttachmentUploader', action: 'component_action' });
      alert(`Failed to add URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-pink-500 bg-pink-900/10'
            : 'border-gray-700 hover:border-pink-600'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
              <p className="text-sm text-gray-400">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 mb-2">
                Drag and drop files here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-pink-400 font-medium hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Max 2MB • Images, PDFs, Documents
              </p>
            </>
          )}
        </div>
      </div>

      {/* URL Input Toggle */}
      {!showUrlInput ? (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          disabled={isUploading}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <LinkIcon className="w-4 h-4" />
          Add Link
        </button>
      ) : (
        <div className="space-y-2 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              Add URL
            </span>
            <button
              type="button"
              onClick={() => {
                setShowUrlInput(false);
                setUrlValue('');
                setUrlDisplayName('');
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
            disabled={isUploading}
          />

          <input
            type="text"
            value={urlDisplayName}
            onChange={(e) => setUrlDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
            disabled={isUploading}
          />

          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim() || isUploading}
            className="w-full px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add URL'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
