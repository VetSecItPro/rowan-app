/**
 * Storage Service
 * Handles file uploads, deletions, and URL generation for Supabase Storage
 */

import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Allowed MIME types for different buckets
 */
const ALLOWED_MIME_TYPES = {
  avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  recipes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

/**
 * File size limits (in bytes)
 */
const FILE_SIZE_LIMITS = {
  avatars: 5 * 1024 * 1024, // 5MB
  recipes: 10 * 1024 * 1024, // 10MB
};

type BucketName = 'avatars' | 'recipes';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Validate file before upload
 */
function validateFile(
  file: File,
  bucket: BucketName
): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = FILE_SIZE_LIMITS[bucket];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[bucket];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file path
 */
function generateFilePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = fileName.split('.').pop();
  return `${userId}/${timestamp}-${randomString}.${extension}`;
}

/**
 * Upload a file to a storage bucket
 * @param bucket - The storage bucket name
 * @param file - The file to upload
 * @param userId - The user ID (for folder organization)
 * @returns Upload result with URL and path
 */
export async function uploadFile(
  bucket: BucketName,
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file, bucket);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const supabase = createClient();

    // Generate unique file path
    const filePath = generateFilePath(userId, file.name);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error(`[storage-service] uploadFile error (${bucket}):`, error);
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'uploadFile',
        bucket,
      },
    });
    return {
      success: false,
      error: 'Failed to upload file',
    };
  }
}

/**
 * Delete a file from a storage bucket
 * @param bucket - The storage bucket name
 * @param filePath - The path to the file in the bucket
 * @returns Delete result
 */
export async function deleteFile(
  bucket: BucketName,
  filePath: string
): Promise<DeleteResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error(`[storage-service] deleteFile error (${bucket}):`, error);
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'deleteFile',
        bucket,
      },
    });
    return {
      success: false,
      error: 'Failed to delete file',
    };
  }
}

/**
 * Get a public URL for a file
 * @param bucket - The storage bucket name
 * @param filePath - The path to the file in the bucket
 * @returns Public URL
 */
export function getPublicUrl(bucket: BucketName, filePath: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload avatar image and update user profile
 * @param file - The avatar image file
 * @param userId - The user ID
 * @returns Upload result with URL
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    const supabase = createClient();

    // Get current avatar URL to delete old one
    const { data: user } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    // Upload new avatar
    const uploadResult = await uploadFile('avatars', file, userId);

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: uploadResult.url })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Delete old avatar if it exists
    if (user?.avatar_url) {
      // Extract path from URL
      const oldPath = user.avatar_url.split('/avatars/')[1];
      if (oldPath) {
        await deleteFile('avatars', oldPath);
      }
    }

    return uploadResult;
  } catch (error) {
    console.error('[storage-service] uploadAvatar error:', error);
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'uploadAvatar',
      },
    });
    return {
      success: false,
      error: 'Failed to upload avatar',
    };
  }
}

/**
 * Upload recipe image
 * @param file - The recipe image file
 * @param userId - The user ID
 * @returns Upload result with URL
 */
export async function uploadRecipeImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    const uploadResult = await uploadFile('recipes', file, userId);
    return uploadResult;
  } catch (error) {
    console.error('[storage-service] uploadRecipeImage error:', error);
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'uploadRecipeImage',
      },
    });
    return {
      success: false,
      error: 'Failed to upload recipe image',
    };
  }
}

