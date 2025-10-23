'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  /**
   * Current image URL (if any)
   */
  currentImageUrl?: string;
  /**
   * Callback when image is uploaded successfully
   */
  onUploadSuccess: (url: string) => void;
  /**
   * Upload endpoint (e.g., '/api/upload/avatar', '/api/upload/recipe')
   */
  uploadEndpoint: string;
  /**
   * Optional label for the upload area
   */
  label?: string;
  /**
   * Optional description for the upload area
   */
  description?: string;
  /**
   * Maximum file size in MB (default: 5)
   */
  maxSizeMB?: number;
  /**
   * Aspect ratio for preview (e.g., 'square', 'landscape', 'portrait')
   */
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  /**
   * Optional CSS class name
   */
  className?: string;
}

export default function ImageUpload({
  currentImageUrl,
  onUploadSuccess,
  uploadEndpoint,
  label = 'Upload Image',
  description = 'Drag and drop or click to select',
  maxSizeMB = 5,
  aspectRatio = 'square',
  className = '',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  /**
   * Validate file before upload
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  };

  /**
   * Upload file to server
   */
  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      if (data.success && data.url) {
        setPreview(data.url);
        onUploadSuccess(data.url);
      } else {
        throw new Error('Upload succeeded but no URL returned');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Handle drag leave
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle remove image
   */
  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {label}
        </label>
      )}

      {/* Upload Area */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${aspectRatioClasses[aspectRatio]}
          ${
            isDragging
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Preview */}
        {preview ? (
          <div className="relative w-full h-full">
            {preview.startsWith('data:') ? (
              // Use regular img for data URLs (FileReader results)
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              // Use next/image for URLs
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>
          </div>
        ) : (
          // Empty state
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                  {error ? (
                    <X className="w-8 h-8 text-red-500" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {error || description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {error
                    ? 'Click to try again'
                    : `Max ${maxSizeMB}MB • JPG, PNG, WEBP, GIF`}
                </p>
              </>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-base md:text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
