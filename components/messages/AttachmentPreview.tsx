'use client';

import Image from 'next/image';
import { FileText, Download, X, Play, Pause, Volume2 } from 'lucide-react';
import { FileUploadResult } from '@/lib/services/file-upload-service';
import { useState, useRef } from 'react';
import { sanitizeUrl } from '@/lib/sanitize';

interface AttachmentPreviewProps {
  attachment: FileUploadResult;
  onDelete?: () => void;
  compact?: boolean;
}

export function AttachmentPreview({ attachment, onDelete, compact = false }: AttachmentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const safePublicUrl = sanitizeUrl(attachment.public_url);
  const safeThumbnailUrl = attachment.thumbnail_url ? sanitizeUrl(attachment.thumbnail_url) : '';

  if (!safePublicUrl) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioToggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (attachment.file_type === 'image') {
    return (
      <div className="relative group">
        <Image
          src={safeThumbnailUrl || safePublicUrl}
          alt={attachment.file_name}
          width={compact ? 80 : 640}
          height={compact ? 80 : 384}
          sizes={compact ? '80px' : '100vw'}
          className={`rounded-lg object-cover ${
            compact ? 'w-20 h-20' : 'max-w-sm max-h-96 w-full'
          }`}
        />
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            aria-label="Delete attachment"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <a
          href={safePublicUrl}
          download={attachment.file_name}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 p-1.5 bg-gray-900/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-900"
          aria-label="Download image"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  }

  if (attachment.file_type === 'video') {
    return (
      <div className="relative group">
        <video
          ref={videoRef}
          src={safePublicUrl}
          className={`rounded-lg ${compact ? 'w-40 h-24' : 'max-w-lg w-full'}`}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <button
          onClick={handleVideoToggle}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 bg-gray-900/70 text-white rounded-full hover:bg-gray-900 transition-all"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        {attachment.duration && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-gray-900/70 text-white text-xs rounded">
            {formatDuration(attachment.duration)}
          </div>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            aria-label="Delete attachment"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (attachment.file_type === 'audio') {
    return (
      <div className="relative group">
        <div className={`flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg ${
          compact ? 'w-48' : 'w-full max-w-sm'
        }`}>
          <button
            onClick={handleAudioToggle}
            className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors flex-shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate flex items-center gap-2">
              <Volume2 className="w-4 h-4 flex-shrink-0" />
              Voice Message
            </p>
            <p className="text-xs text-gray-400">
              {attachment.duration ? formatDuration(attachment.duration) : 'Audio'}
            </p>
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-red-500 hover:text-red-600 flex-shrink-0"
              aria-label="Delete attachment"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <audio
          ref={audioRef}
          src={safePublicUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
    );
  }

  // Document
  return (
    <div className="relative group">
      <a
        href={safePublicUrl}
        download={attachment.file_name}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors ${
          compact ? 'w-48' : 'w-full max-w-sm'
        }`}
      >
        <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {attachment.file_name}
          </p>
          <p className="text-xs text-gray-400">
            {formatFileSize(attachment.file_size)}
          </p>
        </div>
        <Download className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </a>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          aria-label="Delete attachment"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
