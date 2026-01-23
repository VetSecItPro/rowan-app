import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface FileUploadResult {
  id: string;
  file_name: string;
  file_type: 'image' | 'video' | 'document' | 'audio';
  file_size: number;
  mime_type: string;
  storage_path: string;
  thumbnail_path?: string;
  width?: number;
  height?: number;
  duration?: number;
  public_url: string;
  thumbnail_url?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
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
  'text/csv',
];

const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
];

// Magic bytes signatures for file type validation
const MAGIC_BYTES_SIGNATURES = {
  // Images
  'image/jpeg': ['FFD8FF', 'FFD8'],
  'image/png': ['89504E47'],
  'image/gif': ['474946'],
  'image/webp': ['52494646'], // "RIFF" + 4 bytes + "WEBP"
  'image/bmp': ['424D'],
  'image/svg+xml': ['3C737667', '3C3F786D'], // "<svg" or "<?xml"

  // Documents
  'application/pdf': ['25504446'],
  'application/msword': ['D0CF11E0'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304'],

  // Audio
  'audio/mp3': ['494433', 'FFFB'],
  'audio/wav': ['52494646'], // "RIFF"
  'audio/ogg': ['4F676753'], // "OggS"

  // Video
  'video/mp4': ['00000018667479', '00000020667479'], // ftyp box
  'video/webm': ['1A45DFA3'],
  'video/avi': ['52494646'], // "RIFF" + 4 bytes + "AVI "
};

/**
 * Check file magic bytes to verify actual file type
 */
async function validateMagicBytes(file: File): Promise<boolean> {
  const expectedSignatures = MAGIC_BYTES_SIGNATURES[file.type as keyof typeof MAGIC_BYTES_SIGNATURES];

  if (!expectedSignatures) {
    // If no magic bytes defined for this type, allow it (backwards compatibility)
    return true;
  }

  try {
    // Read first 32 bytes of the file
    const arrayBuffer = await file.slice(0, 32).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const hex = Array.from(uint8Array)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');

    // Check if file starts with any of the expected signatures
    return expectedSignatures.some(signature => hex.startsWith(signature));
  } catch (error) {
    logger.warn('Magic bytes validation failed:', { component: 'lib-file-upload-service', error: error });
    return false;
  }
}

export const fileUploadService = {
  /**
   * Validate file before upload
   */
  async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    // Check MIME type
    const allAllowed = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
      ...ALLOWED_AUDIO_TYPES,
    ];

    if (!allAllowed.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed: ${file.type}`,
      };
    }

    // Validate magic bytes to prevent file type spoofing
    const magicBytesValid = await validateMagicBytes(file);
    if (!magicBytesValid) {
      return {
        valid: false,
        error: `File content does not match declared type: ${file.type}. This may indicate a malicious file.`,
      };
    }

    return { valid: true };
  },

  /**
   * Determine file type from MIME type
   */
  getFileType(mimeType: string): 'image' | 'video' | 'document' | 'audio' {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
    if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
    return 'document';
  },

  /**
   * Generate thumbnail for image
   */
  async generateImageThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate thumbnail dimensions (max 300px)
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to generate thumbnail'));
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Get image dimensions
   */
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Get video metadata
   */
  async getVideoMetadata(
    file: File
  ): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: Math.floor(video.duration),
        });
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  },

  /**
   * Get audio duration
   */
  async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        resolve(Math.floor(audio.duration));
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => reject(new Error('Failed to load audio'));
      audio.src = URL.createObjectURL(file);
    });
  },

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    file: File,
    spaceId: string,
    messageId: string,
    _onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    const supabase = createClient();

    // First, refresh the session to ensure we have a valid, non-expired token
    // This is critical because storage API rejects stale/expired tokens with 400 errors
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      logger.warn('Session refresh failed, attempting to continue:', { component: 'lib-file-upload-service', error: refreshError });
    }

    // Validate user exists with Supabase Auth server (not from cached cookies)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required. Please refresh the page and try again.');
    }

    // Validate file
    const validation = await this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileType = this.getFileType(file.type);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${spaceId}/${messageId}/${fileName}`;

    // Upload main file - explicitly set contentType to handle browser variations
    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(storagePath);

    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;
    let thumbnailPath: string | undefined;
    let thumbnailUrl: string | undefined;

    // Process image
    if (fileType === 'image') {
      try {
        const dimensions = await this.getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;

        // Generate and upload thumbnail
        const thumbnailBlob = await this.generateImageThumbnail(file);
        const thumbnailStoragePath = `${spaceId}/${messageId}/thumb-${fileName}`;

        const { error: thumbError } = await supabase.storage
          .from('message-attachments')
          .upload(thumbnailStoragePath, thumbnailBlob);

        if (!thumbError) {
          thumbnailPath = thumbnailStoragePath;
          const { data: thumbUrlData } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(thumbnailStoragePath);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      } catch (error) {
        logger.error('Failed to process image:', error, { component: 'lib-file-upload-service', action: 'service_call' });
      }
    }

    // Process video
    if (fileType === 'video') {
      try {
        const metadata = await this.getVideoMetadata(file);
        width = metadata.width;
        height = metadata.height;
        duration = metadata.duration;
      } catch (error) {
        logger.error('Failed to get video metadata:', error, { component: 'lib-file-upload-service', action: 'service_call' });
      }
    }

    // Process audio
    if (fileType === 'audio') {
      try {
        duration = await this.getAudioDuration(file);
      } catch (error) {
        logger.error('Failed to get audio duration:', error, { component: 'lib-file-upload-service', action: 'service_call' });
      }
    }

    // Save attachment record to database
    // Note: uploaded_by is required by RLS policy and must match auth.uid()
    const { data: attachmentData, error: dbError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        uploaded_by: user.id,
        width,
        height,
        duration,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('message-attachments').remove([storagePath]);
      if (thumbnailPath) {
        await supabase.storage.from('message-attachments').remove([thumbnailPath]);
      }
      throw new Error(`Database error: ${dbError.message}`);
    }

    return {
      ...attachmentData,
      public_url: urlData.publicUrl,
      thumbnail_url: thumbnailUrl,
    };
  },

  /**
   * Delete file from storage and database
   */
  async deleteFile(attachmentId: string): Promise<void> {
    const supabase = createClient();

    // Get attachment data
    const { data: attachment, error: fetchError } = await supabase
      .from('message_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new Error('Attachment not found');
    }

    // Delete from storage
    const pathsToDelete = [attachment.storage_path];
    if (attachment.thumbnail_path) {
      pathsToDelete.push(attachment.thumbnail_path);
    }

    const { error: storageError } = await supabase.storage
      .from('message-attachments')
      .remove(pathsToDelete);

    if (storageError) {
      logger.error('Failed to delete from storage:', storageError, { component: 'lib-file-upload-service', action: 'service_call' });
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('message_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      throw new Error(`Failed to delete attachment: ${dbError.message}`);
    }
  },
};
