'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { fileUploadService, FileUploadResult } from '@/lib/services/file-upload-service';
import { toast } from 'sonner';

interface AttachmentUploaderProps {
  messageId: string;
  spaceId: string;
  onUploadComplete: (attachment: FileUploadResult) => void;
}

export function AttachmentUploader({
  messageId,
  spaceId,
  onUploadComplete,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await fileUploadService.validateFile(file);
    if (!validation.valid) {
      toast.error('Invalid file', {
        description: validation.error,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await fileUploadService.uploadFile(
        file,
        spaceId,
        messageId,
        (progress) => setUploadProgress(progress)
      );

      onUploadComplete(result);
      toast.success('File uploaded', {
        description: file.name,
      });
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Upload file"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : (
          <Upload className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {uploading && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg p-2 min-w-[200px] z-10">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
