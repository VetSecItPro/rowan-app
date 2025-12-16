/**
 * Storage Service
 * Handles file uploads, deletions, and URL generation for Supabase Storage
 */

import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

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

    const supabase = await createClient();

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
    logger.error('[storage-service] uploadFile error (${bucket}):', error, { component: 'lib-storage-service', action: 'service_call' });
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
    const supabase = await createClient();

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    logger.error('[storage-service] deleteFile error (${bucket}):', error, { component: 'lib-storage-service', action: 'service_call' });
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
export async function getPublicUrl(bucket: BucketName, filePath: string): Promise<string> {
  const supabase = await createClient();
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
    const supabase = await createClient();

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
      // SECURITY: Only delete if the path belongs to this user
      // This prevents IDOR attacks where a user sets their avatar_url to another user's file
      // then uploads a new avatar to trigger deletion of the other user's file
      if (oldPath && oldPath.startsWith(`${userId}/`)) {
        await deleteFile('avatars', oldPath);
      } else if (oldPath) {
        logger.warn(`[storage-service] Skipping deletion of avatar not owned by user ${userId}: ${oldPath}`, { component: 'lib-storage-service' });
      }
    }

    return uploadResult;
  } catch (error) {
    logger.error('[storage-service] uploadAvatar error:', error, { component: 'lib-storage-service', action: 'service_call' });
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
    logger.error('[storage-service] uploadRecipeImage error:', error, { component: 'lib-storage-service', action: 'service_call' });
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

// =============================================
// STORAGE QUOTA & TRACKING
// =============================================

import { FEATURE_LIMITS } from '../config/feature-limits';
import type { SubscriptionTier } from '../types';

/**
 * Storage usage information for a space
 */
export interface StorageUsage {
  spaceId: string;
  totalBytes: number;
  fileCount: number;
  limitBytes: number;
  percentageUsed: number;
  lastCalculated: Date;
}

/**
 * Storage quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  currentBytes: number;
  limitBytes: number;
  availableBytes: number;
  percentageUsed: number;
}

/**
 * Warning type thresholds
 */
export type WarningType = '80_percent' | '90_percent' | '100_percent';

/**
 * Get storage usage for a space
 */
export async function getSpaceStorageUsage(
  spaceId: string
): Promise<{ success: true; data: StorageUsage } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    // Get current usage from storage_usage table
    const { data: usage, error: usageError } = await supabase
      .from('storage_usage')
      .select('*')
      .eq('space_id', spaceId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw usageError;
    }

    // If no usage record exists yet, calculate it
    if (!usage) {
      const { data: calculated, error: calcError } = await supabase.rpc(
        'calculate_space_storage',
        { p_space_id: spaceId }
      );

      if (calcError) throw calcError;

      // Fetch the newly created record
      const { data: newUsage, error: newError } = await supabase
        .from('storage_usage')
        .select('*')
        .eq('space_id', spaceId)
        .single();

      if (newError) throw newError;

      return {
        success: true,
        data: mapUsageToStorageUsage(newUsage, spaceId),
      };
    }

    return {
      success: true,
      data: mapUsageToStorageUsage(usage, spaceId),
    };
  } catch (error) {
    logger.error('[storage-service] getSpaceStorageUsage error:', error, { component: 'lib-storage-service', action: 'service_call' });
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'getSpaceStorageUsage',
      },
    });
    return {
      success: false,
      error: 'Failed to get storage usage',
    };
  }
}

/**
 * Check if a file upload is within quota limits
 */
export async function checkStorageQuota(
  spaceId: string,
  fileSizeBytes: number
): Promise<{ success: true; data: QuotaCheckResult } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('check_storage_quota', {
      p_space_id: spaceId,
      p_file_size_bytes: fileSizeBytes,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('No quota check result returned');
    }

    const result = data[0];

    return {
      success: true,
      data: {
        allowed: result.allowed,
        currentBytes: result.current_bytes,
        limitBytes: result.limit_bytes,
        availableBytes: result.available_bytes,
        percentageUsed: result.percentage_used,
      },
    };
  } catch (error) {
    logger.error('[storage-service] checkStorageQuota error:', error, { component: 'lib-storage-service', action: 'service_call' });
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'checkStorageQuota',
      },
    });
    return {
      success: false,
      error: 'Failed to check storage quota',
    };
  }
}

/**
 * Check if storage warning should be shown to user
 */
export async function shouldShowStorageWarning(
  userId: string,
  spaceId: string
): Promise<
  | { success: true; shouldShow: false }
  | { success: true; shouldShow: true; warningType: WarningType; message: string }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    // Get current storage usage
    const usageResult = await getSpaceStorageUsage(spaceId);
    if (!usageResult.success) {
      return { success: false, error: usageResult.error };
    }

    const { percentageUsed } = usageResult.data;

    // Determine warning type based on percentage
    let warningType: WarningType | null = null;
    if (percentageUsed >= 100) {
      warningType = '100_percent';
    } else if (percentageUsed >= 90) {
      warningType = '90_percent';
    } else if (percentageUsed >= 80) {
      warningType = '80_percent';
    }

    // No warning needed
    if (!warningType) {
      return { success: true, shouldShow: false };
    }

    // Check if user has already dismissed this warning
    const { data: dismissal, error: dismissalError } = await supabase
      .from('storage_warnings')
      .select('*')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('warning_type', warningType)
      .maybeSingle();

    if (dismissalError) throw dismissalError;

    // If dismissed, don't show again
    if (dismissal) {
      return { success: true, shouldShow: false };
    }

    // Generate warning message
    const message = generateWarningMessage(warningType, percentageUsed);

    return {
      success: true,
      shouldShow: true,
      warningType,
      message,
    };
  } catch (error) {
    logger.error('[storage-service] shouldShowStorageWarning error:', error, { component: 'lib-storage-service', action: 'service_call' });
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'shouldShowStorageWarning',
      },
    });
    return {
      success: false,
      error: 'Failed to check storage warning',
    };
  }
}

/**
 * Dismiss a storage warning for a user
 */
export async function dismissStorageWarning(
  userId: string,
  spaceId: string,
  warningType: WarningType
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    // Get current storage usage for context
    const usageResult = await getSpaceStorageUsage(spaceId);
    if (!usageResult.success) {
      return { success: false, error: usageResult.error };
    }

    const { totalBytes, limitBytes } = usageResult.data;

    // Insert dismissal record
    const { error } = await supabase.from('storage_warnings').insert({
      user_id: userId,
      space_id: spaceId,
      warning_type: warningType,
      storage_bytes: totalBytes,
      storage_limit_bytes: limitBytes,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('[storage-service] dismissStorageWarning error:', error, { component: 'lib-storage-service', action: 'service_call' });
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'dismissStorageWarning',
      },
    });
    return {
      success: false,
      error: 'Failed to dismiss storage warning',
    };
  }
}

/**
 * Recalculate storage usage for a space (call after file upload/deletion)
 */
export async function recalculateStorageUsage(
  spaceId: string
): Promise<{ success: true; data: StorageUsage } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    // Call database function to recalculate
    const { data, error } = await supabase.rpc('calculate_space_storage', {
      p_space_id: spaceId,
    });

    if (error) throw error;

    // Fetch updated usage
    return getSpaceStorageUsage(spaceId);
  } catch (error) {
    logger.error('[storage-service] recalculateStorageUsage error:', error, { component: 'lib-storage-service', action: 'service_call' });
    Sentry.captureException(error, {
      tags: {
        service: 'storage-service',
        operation: 'recalculateStorageUsage',
      },
    });
    return {
      success: false,
      error: 'Failed to recalculate storage usage',
    };
  }
}

/**
 * Get storage limit for a subscription tier in bytes
 */
export function getStorageLimitBytes(tier: SubscriptionTier): number {
  const limitGB = FEATURE_LIMITS[tier]?.storageGB || 0.5; // Default to free tier
  return limitGB * 1024 * 1024 * 1024; // Convert GB to bytes
}

/**
 * Re-export formatBytes from utils (kept for backward compatibility)
 */
export { formatBytes } from '@/lib/utils/format';

/**
 * Generate warning message based on type
 */
function generateWarningMessage(warningType: WarningType, percentageUsed: number): string {
  const rounded = Math.round(percentageUsed);

  switch (warningType) {
    case '80_percent':
      return `You're using ${rounded}% of your storage space. You might want to review your files soon to free up space.`;
    case '90_percent':
      return `You're using ${rounded}% of your storage space. Consider deleting older or unneeded files to avoid running out of space.`;
    case '100_percent':
      return `Your storage is full! You won't be able to upload new files until you delete some existing ones or upgrade your plan.`;
    default:
      return 'Your storage space is running low.';
  }
}

/**
 * Map database usage record to StorageUsage interface
 */
function mapUsageToStorageUsage(usage: any, spaceId: string): StorageUsage {
  // Get tier and calculate limit
  // Note: This is a simplified version - in production you'd fetch the actual space's subscription tier
  const limitBytes = getStorageLimitBytes('free'); // Default to free, should be dynamic

  return {
    spaceId,
    totalBytes: usage.total_bytes || 0,
    fileCount: usage.file_count || 0,
    limitBytes,
    percentageUsed: limitBytes > 0 ? (usage.total_bytes / limitBytes) * 100 : 0,
    lastCalculated: new Date(usage.last_calculated_at),
  };
}

