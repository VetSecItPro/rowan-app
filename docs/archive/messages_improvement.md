# Messages Feature - Comprehensive Enhancements

> **Last Updated:** January 15, 2025
> **Status:** Enhancement Specification Document
> **Priority:** HIGH - Core Collaboration Feature

---

## Executive Summary

This document outlines 15 comprehensive enhancements to transform the Rowan Messages feature into a best-in-class family collaboration messaging platform. Based on analysis of the current implementation and research into leading family communication apps (Cozi, OurHome, Life360, JusTalk, WhatsApp, Signal) and team collaboration platforms (Slack, Discord, Microsoft Teams), these enhancements will dramatically improve real-time collaboration, user engagement, and the overall messaging experience.

**Current Implementation:**
- Basic text messaging with single conversation view
- Simple emoji picker (30 emojis)
- Edit/Delete own messages
- Read receipts (basic)
- Search functionality
- Stats dashboard
- Attachment UI (not functional)

**Research Findings:**
Leading family messaging and collaboration apps emphasize:
- **Real-time updates** across all devices
- **Rich media support** (images, videos, voice messages)
- **Threaded conversations** for organized discussions
- **Interactive elements** (reactions, stickers, @mentions)
- **Voice & video communication** for deeper connection
- **Safety & security** (encryption, parental controls)
- **Seamless file sharing** with preview capabilities
- **Gamification elements** to engage families (especially kids)

---

## Enhancement Overview

| # | Enhancement | Complexity | Priority | Impact | Estimated Time |
|---|-------------|------------|----------|--------|----------------|
| 1 | Real-Time Messaging with Supabase Realtime | Medium | HIGH | 🔥🔥🔥 Critical | 2-3 days |
| 2 | Rich Media File Uploads (Images, Videos, Documents) | High | HIGH | 🔥🔥🔥 Critical | 4-5 days |
| 3 | Message Threading & Replies | High | HIGH | 🔥🔥🔥 Critical | 5-6 days |
| 4 | Message Reactions (Emoji Reactions) | Low | HIGH | 🔥🔥 High | 2-3 days |
| 5 | Typing Indicators | Low | HIGH | 🔥🔥 High | 1-2 days |
| 6 | Voice Messages | Medium | MEDIUM | 🔥🔥 High | 3-4 days |
| 7 | @Mentions with Smart Notifications | Medium | HIGH | 🔥🔥🔥 Critical | 3-4 days |
| 8 | Message Pinning | Low | MEDIUM | 🔥 Medium | 1-2 days |
| 9 | Multiple Conversations with Sidebar UI | Medium | HIGH | 🔥🔥 High | 4-5 days |
| 10 | Rich Text Formatting | Medium | MEDIUM | 🔥🔥 High | 3-4 days |
| 11 | Message Forwarding | Low | LOW | 🔥 Medium | 2 days |
| 12 | Enhanced Read Receipts (Per-User Tracking) | Medium | MEDIUM | 🔥 Medium | 2-3 days |
| 13 | Push Notifications Integration | High | HIGH | 🔥🔥🔥 Critical | 5-6 days |
| 14 | Advanced Search with Filters | Medium | MEDIUM | 🔥🔥 High | 2-3 days |
| 15 | Stickers & GIF Support | Low | LOW | 🔥🔥 High | 2-3 days |

**Total Estimated Development Time:** 6-8 weeks (single developer)

---

## 🔥 Enhancement 1: Real-Time Messaging with Supabase Realtime

### Problem Statement
Currently, users must manually refresh to see new messages. This breaks the natural flow of conversation and creates a poor user experience for family collaboration.

### Solution
Implement Supabase Realtime subscriptions to automatically update messages, conversations, and read receipts across all connected clients in real-time.

### User Benefits
- **Instant communication** - Messages appear immediately without refresh
- **Live collaboration** - See updates from family members in real-time
- **Modern experience** - Matches expectations from WhatsApp, Slack, Discord
- **Better engagement** - Natural conversation flow increases usage

### Technical Implementation

#### 1. Database Schema (No Changes Required)
Current schema already supports real-time subscriptions.

#### 2. Service Layer Enhancement

**lib/services/messages-service.ts**

```typescript
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  space_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  read_at?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface MessageSubscriptionCallbacks {
  onInsert?: (message: Message) => void;
  onUpdate?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

export const messagesService = {
  // ... existing methods ...

  /**
   * Subscribe to real-time message updates for a conversation
   */
  subscribeToMessages(
    conversationId: string,
    callbacks: MessageSubscriptionCallbacks
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (callbacks.onInsert) {
            callbacks.onInsert(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (callbacks.onUpdate) {
            callbacks.onUpdate(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (callbacks.onDelete) {
            callbacks.onDelete(payload.old.id);
          }
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversation(
    conversationId: string,
    onUpdate: (conversation: Conversation) => void
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          onUpdate(payload.new as Conversation);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Unsubscribe from channel (cleanup)
   */
  unsubscribe(channel: RealtimeChannel): void {
    const supabase = createClient();
    supabase.removeChannel(channel);
  },
};
```

#### 3. Front-End Integration

**app/(main)/messages/page.tsx**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { messagesService, Message } from '@/lib/services/messages-service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/lib/contexts/auth-context';

export default function MessagesPage() {
  const { currentSpace, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Real-time subscription cleanup ref
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    const messagesData = await messagesService.getMessages(conversationId);
    setMessages(messagesData);
  }, [conversationId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to real-time updates
    const channel = messagesService.subscribeToMessages(conversationId, {
      onInsert: (newMessage) => {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Show notification for new messages from others
        if (newMessage.sender_id !== user?.id) {
          showNotification('New message', newMessage.content);
        }

        // Auto-scroll to bottom
        scrollToBottom();
      },
      onUpdate: (updatedMessage) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
        );
      },
      onDelete: (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
    });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        messagesService.unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user?.id]);

  // ... rest of component
}
```

#### 4. Optimistic UI Updates

```typescript
const handleSendMessage = async (content: string) => {
  if (!conversationId || !user) return;

  // Optimistic update - show message immediately
  const tempMessage: Message = {
    id: crypto.randomUUID(),
    space_id: currentSpace!.id,
    conversation_id: conversationId,
    sender_id: user.id,
    content,
    read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    attachments: [],
  };

  setMessages((prev) => [...prev, tempMessage]);
  scrollToBottom();

  try {
    // Send to server
    const savedMessage = await messagesService.createMessage({
      space_id: currentSpace!.id,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });

    // Replace temp message with server message
    setMessages((prev) =>
      prev.map((m) => (m.id === tempMessage.id ? savedMessage : m))
    );
  } catch (error) {
    // Remove temp message on error
    setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    console.error('Failed to send message:', error);
    showError('Failed to send message. Please try again.');
  }
};
```

### Testing Checklist
- [ ] Messages appear instantly across multiple browser tabs
- [ ] New messages from other users appear without refresh
- [ ] Message edits/deletes update in real-time
- [ ] Subscription cleanup prevents memory leaks
- [ ] Optimistic UI provides instant feedback
- [ ] Error handling works when send fails
- [ ] Notifications show for new messages from others
- [ ] Auto-scroll to bottom works on new messages

---

## 🖼️ Enhancement 2: Rich Media File Uploads (Images, Videos, Documents)

### Problem Statement
Current attachment buttons are UI-only and don't actually upload files. Users cannot share photos, videos, or documents with family members, limiting the usefulness of the messaging feature.

### Solution
Implement full file upload functionality using Supabase Storage with image/video preview, document support, and proper security controls.

### User Benefits
- **Share memories** - Upload family photos and videos
- **Document sharing** - Share important documents (PDFs, receipts, forms)
- **Visual communication** - Images enhance family conversations
- **File organization** - All shared files in one secure location

### Technical Implementation

#### 1. Database Schema Changes

**supabase/migrations/[timestamp]_add_message_attachments.sql**

```sql
-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'document'
  file_size BIGINT NOT NULL, -- bytes
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT, -- For videos and large images
  width INTEGER, -- For images/videos
  height INTEGER, -- For images/videos
  duration INTEGER, -- For videos (seconds)
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_message_attachments_uploaded_by ON message_attachments(uploaded_by);

-- RLS Policies
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in their space conversations"
ON message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_attachments.message_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload attachments to their messages"
ON message_attachments FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_attachments.message_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own attachments"
ON message_attachments FOR DELETE
USING (
  uploaded_by = auth.uid()
);
```

#### 2. Supabase Storage Bucket Setup

**Storage Configuration:**
```typescript
// Run this via Supabase dashboard or migration script
// Bucket: message-attachments
// Public: false
// File size limit: 50 MB
// Allowed MIME types:
//   - Images: image/jpeg, image/png, image/gif, image/webp
//   - Videos: video/mp4, video/quicktime, video/webm
//   - Documents: application/pdf, application/msword,
//                application/vnd.openxmlformats-officedocument.wordprocessingml.document,
//                application/vnd.ms-excel,
//                application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

// Storage policies (RLS)
CREATE POLICY "Users can upload to their space folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM spaces s
    INNER JOIN space_members sm ON sm.space_id = s.id
    WHERE sm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can read files from their spaces"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM spaces s
    INNER JOIN space_members sm ON sm.space_id = s.id
    WHERE sm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = owner
);
```

#### 3. Service Layer

**lib/services/file-upload-service.ts** (NEW FILE)

```typescript
import { createClient } from '@/lib/supabase/client';

export interface FileUploadResult {
  id: string;
  file_name: string;
  file_type: 'image' | 'video' | 'document';
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
];

export const fileUploadService = {
  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
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
    ];

    if (!allAllowed.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed: ${file.type}`,
      };
    }

    return { valid: true };
  },

  /**
   * Determine file type from MIME type
   */
  getFileType(mimeType: string): 'image' | 'video' | 'document' {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
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
   * Upload file to Supabase Storage
   */
  async uploadFile(
    file: File,
    spaceId: string,
    messageId: string,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    const supabase = createClient();

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileType = this.getFileType(file.type);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${spaceId}/${messageId}/${fileName}`;

    // Upload main file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
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
      const dimensions = await this.getImageDimensions(file);
      width = dimensions.width;
      height = dimensions.height;

      // Generate and upload thumbnail
      try {
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
        console.error('Failed to generate thumbnail:', error);
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
        console.error('Failed to get video metadata:', error);
      }
    }

    // Save attachment record to database
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
      console.error('Failed to delete from storage:', storageError);
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
```

#### 4. Updated Messages Service

**lib/services/messages-service.ts** (UPDATE)

```typescript
export interface MessageWithAttachments extends Message {
  attachments_data?: FileUploadResult[];
}

export const messagesService = {
  // ... existing methods ...

  /**
   * Get messages with attachment data
   */
  async getMessagesWithAttachments(conversationId: string): Promise<MessageWithAttachments[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        attachments_data:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
```

#### 5. Front-End Component

**components/messages/AttachmentUploader.tsx** (NEW FILE)

```typescript
'use client';

import { useState, useRef } from 'react';
import { Image as ImageIcon, Video, FileText, X, Upload, Loader2 } from 'lucide-react';
import { fileUploadService, FileUploadResult } from '@/lib/services/file-upload-service';

interface AttachmentUploaderProps {
  messageId: string;
  spaceId: string;
  onUploadComplete: (attachment: FileUploadResult) => void;
  onError: (error: string) => void;
}

export function AttachmentUploader({
  messageId,
  spaceId,
  onUploadComplete,
  onError,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = fileUploadService.validateFile(file);
    if (!validation.valid) {
      onError(validation.error || 'Invalid file');
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
    } catch (error: any) {
      onError(error.message || 'Upload failed');
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
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
        ) : (
          <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {uploading && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
```

**components/messages/AttachmentPreview.tsx** (NEW FILE)

```typescript
'use client';

import { Image as ImageIcon, Video, FileText, Download, X } from 'lucide-react';
import { FileUploadResult } from '@/lib/services/file-upload-service';

interface AttachmentPreviewProps {
  attachment: FileUploadResult;
  onDelete?: () => void;
  compact?: boolean;
}

export function AttachmentPreview({ attachment, onDelete, compact = false }: AttachmentPreviewProps) {
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

  if (attachment.file_type === 'image') {
    return (
      <div className="relative group">
        <img
          src={attachment.thumbnail_url || attachment.public_url}
          alt={attachment.file_name}
          className={`rounded-lg object-cover ${
            compact ? 'w-20 h-20' : 'max-w-sm max-h-96 w-full'
          }`}
          loading="lazy"
        />
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <a
          href={attachment.public_url}
          download={attachment.file_name}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 p-1 bg-gray-900/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
          src={attachment.public_url}
          controls
          className={`rounded-lg ${compact ? 'w-40 h-24' : 'max-w-lg w-full'}`}
          preload="metadata"
        />
        {attachment.duration && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-gray-900/70 text-white text-xs rounded">
            {formatDuration(attachment.duration)}
          </div>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Document
  return (
    <div className="relative group">
      <a
        href={attachment.public_url}
        download={attachment.file_name}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          compact ? 'w-48' : 'w-full max-w-sm'
        }`}
      >
        <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {attachment.file_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(attachment.file_size)}
          </p>
        </div>
        <Download className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
      </a>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
```

### Testing Checklist
- [ ] Upload images (JPEG, PNG, GIF, WebP)
- [ ] Upload videos (MP4, MOV, WebM)
- [ ] Upload documents (PDF, Word, Excel, PowerPoint, TXT)
- [ ] File size validation (50MB limit)
- [ ] MIME type validation
- [ ] Thumbnail generation for images
- [ ] Video metadata extraction
- [ ] Progress indicator during upload
- [ ] Error handling for failed uploads
- [ ] Delete attachments
- [ ] View/download attachments
- [ ] Attachment preview in chat
- [ ] Storage RLS policies work correctly
- [ ] Mobile responsiveness

---

## 💬 Enhancement 3: Message Threading & Replies

### Problem Statement
As conversations grow, important discussions get lost in the flow of messages. Families need a way to respond to specific messages and keep related conversations organized.

### Solution
Implement threaded conversations where users can reply to specific messages, creating organized sub-conversations within the main chat.

### User Benefits
- **Organized discussions** - Keep related messages grouped together
- **Context preservation** - See what message someone is responding to
- **Less confusion** - Clear which messages belong to which conversation
- **Better collaboration** - Multiple topics can be discussed simultaneously

### Technical Implementation

#### 1. Database Schema Changes

**supabase/migrations/[timestamp]_add_message_threading.sql**

```sql
-- Add threading columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS thread_reply_count INTEGER DEFAULT 0;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);

-- Update thread_reply_count when replies are added/removed
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_message_id IS NOT NULL THEN
      UPDATE messages
      SET thread_reply_count = thread_reply_count + 1
      WHERE id = NEW.parent_message_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_message_id IS NOT NULL THEN
      UPDATE messages
      SET thread_reply_count = GREATEST(thread_reply_count - 1, 0)
      WHERE id = OLD.parent_message_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_thread_reply_count ON messages;
CREATE TRIGGER trigger_update_thread_reply_count
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_reply_count();
```

#### 2. Service Layer Enhancement

**lib/services/messages-service.ts** (UPDATE)

```typescript
export interface MessageWithReplies extends Message {
  parent_message?: Message;
  replies?: Message[];
  thread_reply_count?: number;
}

export const messagesService = {
  // ... existing methods ...

  /**
   * Get messages with threading information
   */
  async getMessagesWithThreads(conversationId: string): Promise<MessageWithReplies[]> {
    const supabase = createClient();

    // Get top-level messages (not replies)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        attachments_data:message_attachments(*),
        parent_message:messages!parent_message_id(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get replies for a specific message (thread)
   */
  async getThreadReplies(parentMessageId: string): Promise<Message[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        attachments_data:message_attachments(*)
      `)
      .eq('parent_message_id', parentMessageId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a reply to a message
   */
  async createReply(input: CreateMessageInput & { parent_message_id: string }): Promise<Message> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ...input,
        read: false,
      }])
      .select()
      .single();

    if (error) throw error;

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', input.conversation_id);

    return data;
  },
};
```

#### 3. Front-End Components

**components/messages/ThreadView.tsx** (NEW FILE)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, CornerDownRight, Send } from 'lucide-react';
import { messagesService, Message } from '@/lib/services/messages-service';
import { MessageCard } from './MessageCard';
import { useAuth } from '@/lib/contexts/auth-context';

interface ThreadViewProps {
  parentMessage: Message;
  conversationId: string;
  onClose: () => void;
}

export function ThreadView({ parentMessage, conversationId, onClose }: ThreadViewProps) {
  const { user, currentSpace } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadReplies();
  }, [parentMessage.id]);

  const loadReplies = async () => {
    try {
      setLoading(true);
      const repliesData = await messagesService.getThreadReplies(parentMessage.id);
      setReplies(repliesData);
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || sending || !user || !currentSpace) return;

    setSending(true);
    try {
      await messagesService.createReply({
        space_id: currentSpace.id,
        conversation_id: conversationId,
        sender_id: user.id,
        content: replyInput,
        parent_message_id: parentMessage.id,
      });

      setReplyInput('');
      loadReplies();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-gray-50 dark:bg-gray-800 w-full h-[90vh] sm:h-[80vh] sm:max-w-2xl sm:rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CornerDownRight className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Thread ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Parent Message */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-900/50">
          <MessageCard
            message={parentMessage}
            onEdit={() => {}}
            onDelete={() => {}}
            onMarkRead={() => {}}
            isOwn={parentMessage.sender_id === user?.id}
            currentUserId={user?.id || ''}
            compact
          />
        </div>

        {/* Replies */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <CornerDownRight className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No replies yet. Be the first to respond!
              </p>
            </div>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="pl-4 border-l-2 border-purple-200 dark:border-purple-700">
                <MessageCard
                  message={reply}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onMarkRead={() => {}}
                  isOwn={reply.sender_id === user?.id}
                  currentUserId={user?.id || ''}
                />
              </div>
            ))
          )}
        </div>

        {/* Reply Input */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Reply in thread..."
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={!replyInput.trim() || sending}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Update MessageCard.tsx to show reply button and thread indicator:**

```typescript
// Add to MessageCard.tsx
interface MessageCardProps {
  // ... existing props ...
  onReply?: (message: Message) => void;
  showThreadButton?: boolean;
}

// In the component:
{showThreadButton && (
  <button
    onClick={() => onReply?.(message)}
    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
  >
    <CornerDownRight className="w-3 h-3" />
    {message.thread_reply_count > 0 ? (
      <span>{message.thread_reply_count} {message.thread_reply_count === 1 ? 'reply' : 'replies'}</span>
    ) : (
      <span>Reply</span>
    )}
  </button>
)}
```

### Testing Checklist
- [ ] Reply to message opens thread view
- [ ] Thread shows parent message at top
- [ ] All replies displayed in thread
- [ ] Send reply from thread view
- [ ] Reply count updates on parent message
- [ ] Real-time updates in threads
- [ ] Thread view on mobile
- [ ] Close thread view
- [ ] Nested threading (optional)

---

## 🎯 Enhancement 4: Message Reactions (Emoji Reactions)

### Problem Statement
Users want quick, lightweight ways to respond to messages without typing full responses. Reactions are essential for modern messaging apps and increase engagement.

### Solution
Implement emoji reactions that users can add to any message, similar to Slack, Discord, WhatsApp, and iMessage.

### User Benefits
- **Quick responses** - React with a single click
- **Emotional expression** - Show approval, love, laughter, etc.
- **Reduced noise** - No need to send "👍" or "OK" messages
- **Engagement boost** - Fun, interactive way to participate

### Technical Implementation

#### 1. Database Schema

**supabase/migrations/[timestamp]_add_message_reactions.sql**

```sql
-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Indexes
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- RLS Policies
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their space conversations"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_reactions.message_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions to messages"
ON message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages
    INNER JOIN conversations ON conversations.id = messages.conversation_id
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE messages.id = message_reactions.message_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own reactions"
ON message_reactions FOR DELETE
USING (user_id = auth.uid());
```

#### 2. Service Layer

**lib/services/message-reactions-service.ts** (NEW FILE)

```typescript
import { createClient } from '@/lib/supabase/client';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  user_ids: string[];
  hasReacted: boolean;
}

export const messageReactionsService = {
  /**
   * Get reactions for a message
   */
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Group reactions by emoji
   */
  summarizeReactions(reactions: MessageReaction[], currentUserId: string): ReactionSummary[] {
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          user_ids: [],
          hasReacted: false,
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].user_ids.push(reaction.user_id);
      if (reaction.user_id === currentUserId) {
        acc[reaction.emoji].hasReacted = true;
      }
      return acc;
    }, {} as Record<string, ReactionSummary>);

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  },

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
    const supabase = createClient();

    // First, check if user already reacted with this emoji
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Already reacted, return existing
      return existing;
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        emoji,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('emoji', emoji);

    if (error) throw error;
  },

  /**
   * Toggle reaction (add if not present, remove if present)
   */
  async toggleReaction(messageId: string, emoji: string): Promise<'added' | 'removed'> {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await this.removeReaction(messageId, emoji);
      return 'removed';
    } else {
      await this.addReaction(messageId, emoji);
      return 'added';
    }
  },
};
```

#### 3. Front-End Component

**components/messages/ReactionPicker.tsx** (NEW FILE)

```typescript
'use client';

import { useState } from 'react';
import { Smile, Plus } from 'lucide-react';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🎉', '🙏', '🔥'];

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
}

export function ReactionPicker({ onSelectReaction }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="React"
      >
        <Smile className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 z-20 flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSelectReaction(emoji);
                  setShowPicker(false);
                }}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-2xl transition-all hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

**components/messages/MessageReactions.tsx** (NEW FILE)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { messageReactionsService, ReactionSummary } from '@/lib/services/message-reactions-service';

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
}

export function MessageReactions({ messageId, currentUserId }: MessageReactionsProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);

  useEffect(() => {
    loadReactions();
  }, [messageId]);

  const loadReactions = async () => {
    const reactionsData = await messageReactionsService.getMessageReactions(messageId);
    const summary = messageReactionsService.summarizeReactions(reactionsData, currentUserId);
    setReactions(summary);
  };

  const handleToggleReaction = async (emoji: string) => {
    await messageReactionsService.toggleReaction(messageId, emoji);
    loadReactions();
  };

  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleToggleReaction(reaction.emoji)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
            reaction.hasReacted
              ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
              : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
          }`}
          title={`${reaction.count} ${reaction.count === 1 ? 'person' : 'people'} reacted`}
        >
          <span>{reaction.emoji}</span>
          <span className={`text-xs font-medium ${
            reaction.hasReacted
              ? 'text-purple-700 dark:text-purple-300'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {reaction.count}
          </span>
        </button>
      ))}
    </div>
  );
}
```

**Update MessageCard.tsx to include reactions:**

```typescript
import { ReactionPicker } from './ReactionPicker';
import { MessageReactions } from './MessageReactions';

// In MessageCard component:
<div className="relative group">
  <div className="message-bubble">
    {/* ... message content ... */}
  </div>

  {/* Reaction Picker */}
  <div className="absolute -bottom-2 right-2">
    <ReactionPicker
      onSelectReaction={(emoji) => handleAddReaction(message.id, emoji)}
    />
  </div>

  {/* Reactions Display */}
  <MessageReactions messageId={message.id} currentUserId={currentUserId} />
</div>
```

### Testing Checklist
- [ ] Add reaction to message
- [ ] Remove reaction from message
- [ ] Toggle reaction (add/remove)
- [ ] Multiple users can react
- [ ] Reaction counts update correctly
- [ ] Current user's reactions highlighted
- [ ] Reaction picker shows/hides
- [ ] Quick reactions work
- [ ] Real-time reaction updates
- [ ] Mobile responsiveness

---

## ⌨️ Enhancement 5: Typing Indicators

### Problem Statement
Users don't know if someone is responding to their message, leading to duplicate messages and confusion. Typing indicators provide real-time feedback that someone is composing a response.

### Solution
Show "Partner is typing..." indicator when someone is actively typing a message, similar to WhatsApp, Messenger, and iMessage.

### User Benefits
- **Real-time feedback** - Know when someone is responding
- **Reduced duplication** - Wait for response instead of sending multiple messages
- **Better conversation flow** - More natural interaction
- **Active presence** - Feel connected to family members

### Technical Implementation

#### 1. Database Schema

**supabase/migrations/[timestamp]_add_typing_indicators.sql**

```sql
-- Create typing_indicators table (short-lived data)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_typed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Index for faster lookups
CREATE INDEX idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_last_typed_at ON typing_indicators(last_typed_at);

-- RLS Policies
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing indicators in their conversations"
ON typing_indicators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    INNER JOIN space_members ON space_members.space_id = conversations.space_id
    WHERE conversations.id = typing_indicators.conversation_id
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own typing status"
ON typing_indicators FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to clean up old typing indicators (> 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE last_typed_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run every minute via cron or app)
```

#### 2. Service Layer

**lib/services/typing-indicators-service.ts** (NEW FILE)

```typescript
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  last_typed_at: string;
}

export const typingIndicatorsService = {
  /**
   * Update user's typing status
   */
  async updateTypingStatus(conversationId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        last_typed_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id,user_id',
      });

    if (error) console.error('Failed to update typing status:', error);
  },

  /**
   * Remove user's typing status
   */
  async removeTypingStatus(conversationId: string): Promise<void> {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { error } = await supabase
      .from('typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) console.error('Failed to remove typing status:', error);
  },

  /**
   * Get active typers for a conversation (excluding current user)
   */
  async getActiveTypers(conversationId: string, excludeUserId: string): Promise<TypingIndicator[]> {
    const supabase = createClient();

    // Get indicators from last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    const { data, error } = await supabase
      .from('typing_indicators')
      .select('*')
      .eq('conversation_id', conversationId)
      .neq('user_id', excludeUserId)
      .gte('last_typed_at', tenSecondsAgo);

    if (error) {
      console.error('Failed to get active typers:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Subscribe to typing indicator changes
   */
  subscribeToTypingIndicators(
    conversationId: string,
    onTypingChange: (typers: TypingIndicator[]) => void
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          // Fetch latest typers when change detected
          const userId = (await supabase.auth.getUser()).data.user?.id;
          if (!userId) return;

          const typers = await this.getActiveTypers(conversationId, userId);
          onTypingChange(typers);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Unsubscribe from typing indicators
   */
  unsubscribe(channel: RealtimeChannel): void {
    const supabase = createClient();
    supabase.removeChannel(channel);
  },
};
```

#### 3. React Hook for Typing Indicators

**lib/hooks/useTypingIndicator.ts** (NEW FILE)

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { typingIndicatorsService } from '@/lib/services/typing-indicators-service';

interface UseTypingIndicatorOptions {
  conversationId: string;
  enabled: boolean;
}

export function useTypingIndicator({ conversationId, enabled }: UseTypingIndicatorOptions) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypedRef = useRef<number>(0);

  const handleTyping = useCallback(() => {
    if (!enabled || !conversationId) return;

    const now = Date.now();

    // Throttle updates to every 2 seconds
    if (now - lastTypedRef.current < 2000) {
      return;
    }

    lastTypedRef.current = now;
    typingIndicatorsService.updateTypingStatus(conversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Remove typing status after 5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      typingIndicatorsService.removeTypingStatus(conversationId);
    }, 5000);
  }, [conversationId, enabled]);

  const handleStopTyping = useCallback(() => {
    if (!enabled || !conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingIndicatorsService.removeTypingStatus(conversationId);
  }, [conversationId, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (enabled && conversationId) {
        typingIndicatorsService.removeTypingStatus(conversationId);
      }
    };
  }, [conversationId, enabled]);

  return {
    handleTyping,
    handleStopTyping,
  };
}
```

#### 4. Front-End Component

**components/messages/TypingIndicator.tsx** (NEW FILE)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { typingIndicatorsService, TypingIndicator as TypingIndicatorType } from '@/lib/services/typing-indicators-service';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
}

export function TypingIndicator({ conversationId, currentUserId }: TypingIndicatorProps) {
  const [typers, setTypers] = useState<TypingIndicatorType[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Load initial typers
    loadTypers();

    // Subscribe to changes
    const newChannel = typingIndicatorsService.subscribeToTypingIndicators(
      conversationId,
      (updatedTypers) => setTypers(updatedTypers)
    );
    setChannel(newChannel);

    return () => {
      if (newChannel) {
        typingIndicatorsService.unsubscribe(newChannel);
      }
    };
  }, [conversationId, currentUserId]);

  const loadTypers = async () => {
    const activeTypers = await typingIndicatorsService.getActiveTypers(
      conversationId,
      currentUserId
    );
    setTypers(activeTypers);
  };

  if (typers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {typers.length === 1
          ? 'Partner is typing...'
          : `${typers.length} people are typing...`}
      </span>
    </div>
  );
}
```

#### 5. Integration in Messages Page

**app/(main)/messages/page.tsx** (UPDATE)

```typescript
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/messages/TypingIndicator';

export default function MessagesPage() {
  // ... existing code ...

  const { handleTyping, handleStopTyping } = useTypingIndicator({
    conversationId: conversationId || '',
    enabled: !!conversationId,
  });

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleTyping(); // Update typing status
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    handleStopTyping(); // Stop typing indicator
    // ... rest of send logic ...
  };

  return (
    // ... existing JSX ...
    <div className="chat-area">
      {/* Messages */}
      <div className="messages-list">
        {/* ... messages ... */}
      </div>

      {/* Typing Indicator */}
      {conversationId && user && (
        <TypingIndicator conversationId={conversationId} currentUserId={user.id} />
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage}>
        <input
          onChange={handleMessageInputChange}
          onBlur={handleStopTyping}
          // ... other props ...
        />
      </form>
    </div>
  );
}
```

### Testing Checklist
- [ ] Typing indicator appears when user types
- [ ] Typing indicator disappears after 5 seconds of inactivity
- [ ] Typing indicator disappears when message sent
- [ ] Multiple users typing shows correct count
- [ ] Real-time updates across devices
- [ ] Throttling works (updates every 2 seconds max)
- [ ] Cleanup on unmount
- [ ] Mobile responsiveness
- [ ] Typing indicator doesn't show for current user

---

**[DOCUMENT CONTINUES WITH 10 MORE ENHANCEMENTS...]**

Due to length limits, I've provided the first 5 enhancements in complete detail. The document would continue with:

6. Voice Messages
7. @Mentions with Smart Notifications
8. Message Pinning
9. Multiple Conversations with Sidebar UI
10. Rich Text Formatting
11. Message Forwarding
12. Enhanced Read Receipts (Per-User Tracking)
13. Push Notifications Integration
14. Advanced Search with Filters
15. Stickers & GIF Support

Each enhancement follows the same comprehensive format with:
- Problem Statement
- Solution
- User Benefits
- Technical Implementation (Database, Service Layer, Front-end)
- Testing Checklist

Would you like me to continue with the remaining 10 enhancements?

---

## Implementation Roadmap

### Phase 1: Core Real-Time Features (2-3 weeks)
- Enhancement 1: Real-Time Messaging ✅
- Enhancement 2: Rich Media File Uploads ✅
- Enhancement 5: Typing Indicators ✅

### Phase 2: Conversation Organization (2-3 weeks)
- Enhancement 3: Message Threading ✅
- Enhancement 4: Message Reactions ✅
- Enhancement 9: Multiple Conversations ✅

### Phase 3: Advanced Communication (2-3 weeks)
- Enhancement 6: Voice Messages ✅
- Enhancement 7: @Mentions ✅
- Enhancement 13: Push Notifications ✅

### Phase 4: Enhanced UX (1-2 weeks)
- Enhancement 8: Message Pinning ✅
- Enhancement 10: Rich Text Formatting ✅
- Enhancement 12: Enhanced Read Receipts ✅

### Phase 5: Polish & Extras (1-2 weeks)
- Enhancement 11: Message Forwarding ✅
- Enhancement 14: Advanced Search ✅
- Enhancement 15: Stickers & GIFs ✅

---

## Competitive Analysis Summary

### Leading Family Apps
- **Cozi**: Calendar, lists, recipes, meal planning integration
- **OurHome**: Gamification, chores, real-time updates, in-app chat
- **Life360**: Location sharing, messaging, safety alerts

### Messaging Leaders
- **WhatsApp**: Real-time, voice messages, file sharing, reactions
- **Signal**: Privacy-focused, encrypted, secure
- **Telegram**: Large groups, channels, stickers, bots

### Collaboration Platforms
- **Slack**: Threads, reactions, channels, file sharing, integrations
- **Discord**: Voice/video, community features, rich presence
- **Microsoft Teams**: Enterprise features, integration, collaboration

### Key Takeaways
1. **Real-time is mandatory** - All modern apps have instant updates
2. **Media-rich communication** - Images, videos, voice are expected
3. **Organization matters** - Threads, channels, pins keep things tidy
4. **Quick interactions** - Reactions, @mentions, quick replies
5. **Family-specific needs** - Safety, simplicity, engagement (gamification)

---

## Success Metrics

### User Engagement
- **Messages per day per user** (Target: 10+)
- **Active conversations** (Target: 80% of spaces have daily messages)
- **Feature adoption** (Target: 60%+ use reactions, 40%+ use threads)

### Performance
- **Message delivery time** (Target: <500ms)
- **File upload success rate** (Target: >98%)
- **Real-time sync accuracy** (Target: 100%)

### User Satisfaction
- **Feature usefulness rating** (Target: 4.5+/5)
- **Ease of use rating** (Target: 4.5+/5)
- **Would recommend** (Target: 80%+)

---

## Conclusion

These 15 enhancements will transform Rowan's Messages feature from a basic text chat into a comprehensive family collaboration platform. The phased approach allows for iterative development while delivering value at each stage.

**Priority recommendations:**
1. **START WITH:** Real-time messaging, file uploads, typing indicators (Phase 1)
2. **THEN ADD:** Threading, reactions, multiple conversations (Phase 2)
3. **ENHANCE WITH:** Voice messages, @mentions, push notifications (Phase 3)
4. **POLISH WITH:** Remaining features (Phases 4-5)

This strategy balances technical complexity, user value, and development time to create a best-in-class family messaging experience.

---

# 📋 COMPREHENSIVE IMPLEMENTATION TODO LIST

> **Status:** In Progress
> **Started:** January 15, 2025
> **Target Completion:** 6-8 weeks

---

## 🔧 PHASE 0: Prerequisites & Setup (Day 1)

### Environment & Dependencies
- [ ] Install required npm packages for file uploads (@supabase/storage-js)
- [ ] Install audio recording package (react-media-recorder or similar)
- [ ] Install rich text editor package (@tiptap/react, @tiptap/starter-kit)
- [ ] Install GIF picker package (@giphy/react-components, @giphy/js-fetch-api)
- [ ] Verify Supabase Realtime is enabled in project
- [ ] Set up Supabase Storage bucket configuration
- [ ] Configure environment variables for API keys

### Code Audit & Backup
- [ ] Create git branch: `feature/messages-enhancements`
- [ ] Audit current messages-service.ts implementation
- [ ] Document current API endpoints
- [ ] Backup current messages page component
- [ ] Review current database schema
- [ ] Test current functionality to establish baseline

---

## 🔥 PHASE 1: Enhancement 1 - Real-Time Messaging (Days 2-3)

### Service Layer Updates
- [ ] Update lib/services/messages-service.ts with RealtimeChannel types
- [ ] Implement subscribeToMessages() method
- [ ] Implement subscribeToConversation() method
- [ ] Implement unsubscribe() cleanup method
- [ ] Add error handling for subscription failures
- [ ] Add reconnection logic for dropped connections

### Component Updates
- [ ] Update app/(main)/messages/page.tsx with real-time subscription
- [ ] Add useEffect hook for subscription lifecycle
- [ ] Implement cleanup on unmount
- [ ] Add optimistic UI updates for sending messages
- [ ] Implement auto-scroll to bottom on new messages
- [ ] Add notification sound/toast for new messages from others

### Testing & Optimization
- [ ] Test real-time updates across multiple browser tabs
- [ ] Test subscription cleanup prevents memory leaks
- [ ] Test optimistic UI rollback on send failure
- [ ] Mobile: Test real-time on iOS Safari
- [ ] Mobile: Test real-time on Android Chrome
- [ ] Test with slow network conditions
- [ ] Add loading states for subscription initialization

---

## 📁 PHASE 2: Enhancement 2 - Rich Media File Uploads (Days 4-8)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_message_attachments.sql
- [ ] Create message_attachments table
- [ ] Add indexes for performance
- [ ] Add RLS policies for attachments
- [ ] Test migration locally
- [ ] Push migration to Supabase: `npx supabase db push`

### Supabase Storage Setup
- [ ] Create 'message-attachments' bucket in Supabase dashboard
- [ ] Configure bucket: public=false, file size limit=50MB
- [ ] Set allowed MIME types (images, videos, documents)
- [ ] Create storage RLS policies for upload
- [ ] Create storage RLS policies for read
- [ ] Create storage RLS policies for delete
- [ ] Test storage policies with sample upload

### Service Layer - File Upload
- [ ] Create lib/services/file-upload-service.ts
- [ ] Implement validateFile() method
- [ ] Implement getFileType() method
- [ ] Implement generateImageThumbnail() method
- [ ] Implement getImageDimensions() method
- [ ] Implement getVideoMetadata() method
- [ ] Implement uploadFile() method with progress tracking
- [ ] Implement deleteFile() method with rollback
- [ ] Add error handling for all file operations

### Service Layer - Messages Update
- [ ] Update messages-service.ts with attachment support
- [ ] Create MessageWithAttachments interface
- [ ] Implement getMessagesWithAttachments() method
- [ ] Update createMessage() to handle attachments
- [ ] Update deleteMessage() to cascade delete attachments

### React Components - Upload UI
- [ ] Create components/messages/AttachmentUploader.tsx
- [ ] Add file input with validation
- [ ] Add upload progress indicator
- [ ] Add drag-and-drop support for desktop
- [ ] Mobile: Optimize file picker for mobile cameras
- [ ] Add preview before upload
- [ ] Add cancel upload functionality

### React Components - Preview UI
- [ ] Create components/messages/AttachmentPreview.tsx
- [ ] Implement image preview with thumbnail
- [ ] Implement video preview with play controls
- [ ] Implement document preview with icon and metadata
- [ ] Add download button
- [ ] Add delete button (for uploader only)
- [ ] Mobile: Optimize preview for small screens
- [ ] Add fullscreen image viewer on tap
- [ ] Add pinch-to-zoom for images on mobile

### Integration
- [ ] Update MessageCard.tsx to display attachments
- [ ] Update NewMessageModal.tsx with attachment support
- [ ] Update messages page with inline attachment upload
- [ ] Add attachment indicator to message list
- [ ] Mobile: Add bottom sheet for attachment options

### Testing
- [ ] Test upload: JPEG, PNG, GIF, WebP images
- [ ] Test upload: MP4, MOV, WebM videos
- [ ] Test upload: PDF, Word, Excel, PowerPoint, TXT documents
- [ ] Test file size validation (50MB limit)
- [ ] Test MIME type validation
- [ ] Test thumbnail generation
- [ ] Test video metadata extraction
- [ ] Test multiple attachments per message
- [ ] Test delete attachments
- [ ] Test storage cleanup on message delete
- [ ] Mobile: Test camera integration
- [ ] Mobile: Test photo library access
- [ ] Mobile: Test orientation handling for images
- [ ] Performance: Test with large files (40-50MB)

---

## 💬 PHASE 3: Enhancement 3 - Message Threading (Days 9-14)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_message_threading.sql
- [ ] Add parent_message_id column to messages table
- [ ] Add thread_reply_count column to messages table
- [ ] Add index on parent_message_id
- [ ] Create update_thread_reply_count() function
- [ ] Create trigger for auto-updating reply counts
- [ ] Test migration locally
- [ ] Push migration: `npx supabase db push`

### Service Layer
- [ ] Update messages-service.ts with threading support
- [ ] Create MessageWithReplies interface
- [ ] Implement getMessagesWithThreads() method
- [ ] Implement getThreadReplies() method
- [ ] Implement createReply() method
- [ ] Add real-time subscription for thread updates

### React Components
- [ ] Create components/messages/ThreadView.tsx
- [ ] Add thread header with close button
- [ ] Display parent message at top
- [ ] Display replies list
- [ ] Add reply input form
- [ ] Add loading states
- [ ] Add empty state for no replies
- [ ] Mobile: Make thread view fullscreen on mobile
- [ ] Mobile: Add swipe-down to close gesture

### Component Updates
- [ ] Update MessageCard.tsx with reply button
- [ ] Add thread reply count badge
- [ ] Add visual indicator for threaded messages
- [ ] Add onClick handler to open thread
- [ ] Update messages page to show ThreadView modal

### Testing
- [ ] Test create reply to message
- [ ] Test thread view opens correctly
- [ ] Test reply count updates
- [ ] Test real-time updates in threads
- [ ] Test nested threading (replies to replies) if implemented
- [ ] Test thread view on mobile portrait
- [ ] Test thread view on mobile landscape
- [ ] Mobile: Test keyboard handling in thread input
- [ ] Performance: Test threads with 50+ replies

---

## 🎯 PHASE 4: Enhancement 4 - Message Reactions (Days 15-17)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_message_reactions.sql
- [ ] Create message_reactions table
- [ ] Add unique constraint (message_id, user_id, emoji)
- [ ] Add indexes for performance
- [ ] Add RLS policies
- [ ] Test migration locally
- [ ] Push migration: `npx supabase db push`

### Service Layer
- [ ] Create lib/services/message-reactions-service.ts
- [ ] Create MessageReaction interface
- [ ] Create ReactionSummary interface
- [ ] Implement getMessageReactions() method
- [ ] Implement summarizeReactions() method
- [ ] Implement addReaction() method
- [ ] Implement removeReaction() method
- [ ] Implement toggleReaction() method
- [ ] Add real-time subscription for reactions

### React Components
- [ ] Create components/messages/ReactionPicker.tsx
- [ ] Add quick reactions (8 common emojis)
- [ ] Add emoji picker UI
- [ ] Mobile: Optimize picker for touch input
- [ ] Create components/messages/MessageReactions.tsx
- [ ] Display reaction summary bubbles
- [ ] Highlight current user's reactions
- [ ] Add animation on reaction toggle

### Component Integration
- [ ] Update MessageCard.tsx with reaction picker
- [ ] Add reactions display below message
- [ ] Show reaction picker on hover (desktop) or long-press (mobile)
- [ ] Mobile: Add haptic feedback on reaction toggle

### Testing
- [ ] Test add reaction
- [ ] Test remove reaction
- [ ] Test toggle reaction
- [ ] Test multiple users reacting
- [ ] Test reaction count accuracy
- [ ] Test real-time reaction updates
- [ ] Mobile: Test touch targets (minimum 44x44px)
- [ ] Mobile: Test reaction picker accessibility
- [ ] Performance: Test messages with 20+ different reactions

---

## ⌨️ PHASE 5: Enhancement 5 - Typing Indicators (Days 18-19)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_typing_indicators.sql
- [ ] Create typing_indicators table
- [ ] Add unique constraint (conversation_id, user_id)
- [ ] Add indexes for performance
- [ ] Add RLS policies
- [ ] Create cleanup_old_typing_indicators() function
- [ ] Test migration locally
- [ ] Push migration: `npx supabase db push`

### Service Layer
- [ ] Create lib/services/typing-indicators-service.ts
- [ ] Create TypingIndicator interface
- [ ] Implement updateTypingStatus() method
- [ ] Implement removeTypingStatus() method
- [ ] Implement getActiveTypers() method
- [ ] Implement subscribeToTypingIndicators() method
- [ ] Implement unsubscribe() method
- [ ] Add throttling (update max every 2 seconds)

### React Hooks
- [ ] Create lib/hooks/useTypingIndicator.ts
- [ ] Implement handleTyping() with throttling
- [ ] Implement handleStopTyping() with timeout
- [ ] Add cleanup on unmount
- [ ] Add ref for timeout management

### React Components
- [ ] Create components/messages/TypingIndicator.tsx
- [ ] Add animated dots (3 dots bouncing)
- [ ] Display typer names or count
- [ ] Mobile: Ensure indicator doesn't overlap input

### Component Integration
- [ ] Update messages page with useTypingIndicator hook
- [ ] Add typing indicator below messages area
- [ ] Connect to message input onChange
- [ ] Remove indicator on message send
- [ ] Remove indicator on blur

### Testing
- [ ] Test typing indicator appears
- [ ] Test typing indicator disappears after 5s
- [ ] Test multiple users typing
- [ ] Test real-time updates
- [ ] Test throttling works
- [ ] Mobile: Test keyboard visibility handling
- [ ] Performance: Test with rapid typing

---

## 🎤 PHASE 6: Enhancement 6 - Voice Messages (Days 20-23)

### Dependencies
- [ ] Install react-media-recorder: `npm install react-media-recorder`
- [ ] Install audio waveform library: `npm install wavesurfer.js`
- [ ] Test browser audio recording permissions

### Database Schema
- [ ] Voice messages stored as attachments with type='audio'
- [ ] Add duration field to message_attachments (already exists)
- [ ] Add waveform_data JSONB field for visualization

### Service Layer
- [ ] Update file-upload-service.ts with audio support
- [ ] Add audio MIME types (audio/webm, audio/mp4, audio/mpeg)
- [ ] Implement getAudioDuration() method
- [ ] Implement generateWaveform() method (optional)
- [ ] Update uploadFile() to handle audio

### React Components
- [ ] Create components/messages/VoiceRecorder.tsx
- [ ] Add record button with animation
- [ ] Add recording timer
- [ ] Add waveform visualization during recording
- [ ] Add cancel/send buttons
- [ ] Mobile: Add vibration on start/stop recording
- [ ] Create components/messages/VoiceMessagePlayer.tsx
- [ ] Add play/pause button
- [ ] Add progress bar
- [ ] Add playback speed controls (1x, 1.5x, 2x)
- [ ] Add duration display

### Component Integration
- [ ] Add voice recorder to message input
- [ ] Update MessageCard to display voice messages
- [ ] Mobile: Optimize recording UI for one-handed use

### Testing
- [ ] Test record audio
- [ ] Test play audio
- [ ] Test pause/resume
- [ ] Test playback speed
- [ ] Test duration accuracy
- [ ] Test browser permissions handling
- [ ] Mobile: Test in background/foreground
- [ ] Mobile: Test with phone calls interruption
- [ ] Performance: Test with long recordings (5+ minutes)

---

## 🏷️ PHASE 7: Enhancement 7 - @Mentions (Days 24-27)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_mentions.sql
- [ ] Create message_mentions table
- [ ] Add mentioned_user_id, message_id columns
- [ ] Add indexes for performance
- [ ] Add RLS policies
- [ ] Add trigger to create notification on mention
- [ ] Test migration locally
- [ ] Push migration: `npx supabase db push`

### Service Layer
- [ ] Create lib/services/mentions-service.ts
- [ ] Implement extractMentions() to parse @username from text
- [ ] Implement createMentions() to save to database
- [ ] Implement getMentionsForMessage() method
- [ ] Implement getUnreadMentions() method
- [ ] Update messages-service.ts to handle mentions on create

### React Components
- [ ] Create components/messages/MentionInput.tsx
- [ ] Add autocomplete dropdown for @mentions
- [ ] Fetch space members for autocomplete
- [ ] Highlight @mentions in input
- [ ] Mobile: Optimize autocomplete for small screens
- [ ] Create components/messages/MentionHighlight.tsx
- [ ] Highlight @mentions in message display
- [ ] Make mentions clickable (show user profile)

### Notifications Integration
- [ ] Create notification when user is mentioned
- [ ] Send in-app notification
- [ ] Send push notification (if enabled)
- [ ] Add mention badge to messages icon in nav

### Component Integration
- [ ] Replace standard input with MentionInput
- [ ] Update MessageCard to render mentions
- [ ] Add mention count to stats dashboard

### Testing
- [ ] Test @mention autocomplete
- [ ] Test mention creation
- [ ] Test mention highlighting
- [ ] Test mention notifications
- [ ] Test multiple mentions in one message
- [ ] Mobile: Test autocomplete keyboard navigation
- [ ] Performance: Test with 10+ mentions in message

---

## 📌 PHASE 8: Enhancement 8 - Message Pinning (Days 28-29)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_message_pinning.sql
- [ ] Add is_pinned BOOLEAN column to messages table
- [ ] Add pinned_at TIMESTAMPTZ column
- [ ] Add pinned_by UUID column
- [ ] Add index on is_pinned
- [ ] Test migration locally
- [ ] Push migration: `npx supabase db push`

### Service Layer
- [ ] Update messages-service.ts with pinning methods
- [ ] Implement pinMessage(messageId) method
- [ ] Implement unpinMessage(messageId) method
- [ ] Implement getPinnedMessages(conversationId) method
- [ ] Add real-time subscription for pinned messages

### React Components
- [ ] Create components/messages/PinnedMessages.tsx
- [ ] Display pinned messages at top of chat
- [ ] Add unpin button for pinned messages
- [ ] Add collapse/expand for multiple pins
- [ ] Mobile: Make pinned section swipeable
- [ ] Update MessageCard with pin/unpin button
- [ ] Add pin icon indicator

### Component Integration
- [ ] Add PinnedMessages section to messages page
- [ ] Update message dropdown menu with pin/unpin option
- [ ] Add pin count to conversation metadata

### Testing
- [ ] Test pin message
- [ ] Test unpin message
- [ ] Test pinned messages display
- [ ] Test multiple pinned messages
- [ ] Test real-time pin updates
- [ ] Mobile: Test pinned section scrolling
- [ ] Permissions: Ensure only authorized users can pin

---

## 💬 PHASE 9: Enhancement 9 - Multiple Conversations (Days 30-34)

### Database Schema Review
- [ ] Review existing conversations table schema
- [ ] Ensure all needed fields exist
- [ ] Verify RLS policies are correct
- [ ] Add conversation_type field (direct, group, general)
- [ ] Add last_message_preview TEXT field
- [ ] Add is_archived BOOLEAN field

### Service Layer Enhancement
- [ ] Update messages-service.ts for multiple conversations
- [ ] Implement getConversationsList() method
- [ ] Implement createConversation() method
- [ ] Implement archiveConversation() method
- [ ] Implement updateConversationMetadata() method
- [ ] Add real-time subscription for conversation list

### React Components - Sidebar
- [ ] Create components/messages/ConversationSidebar.tsx
- [ ] Display list of conversations
- [ ] Show unread count per conversation
- [ ] Show last message preview
- [ ] Add search conversations
- [ ] Add "New Conversation" button
- [ ] Mobile: Make sidebar slide-in drawer
- [ ] Add conversation avatars/icons
- [ ] Add active conversation highlight

### React Components - Conversation Management
- [ ] Create components/messages/NewConversationModal.tsx
- [ ] Add conversation name input
- [ ] Add participant selection
- [ ] Add conversation type selection
- [ ] Mobile: Fullscreen modal on mobile
- [ ] Create components/messages/ConversationSettings.tsx
- [ ] Add rename conversation
- [ ] Add archive conversation
- [ ] Add delete conversation
- [ ] Add participant management

### Layout Redesign
- [ ] Update app/(main)/messages/page.tsx layout
- [ ] Add sidebar (desktop) or drawer (mobile)
- [ ] Add main conversation area
- [ ] Add conversation header with title and settings
- [ ] Mobile: Add hamburger menu to toggle sidebar
- [ ] Mobile: Add swipe right to open sidebar
- [ ] Responsive: Test on tablet sizes

### Testing
- [ ] Test create new conversation
- [ ] Test switch between conversations
- [ ] Test conversation list updates
- [ ] Test unread counts
- [ ] Test archive conversation
- [ ] Mobile: Test sidebar drawer animation
- [ ] Mobile: Test swipe gestures
- [ ] Performance: Test with 20+ conversations

---

## ✍️ PHASE 10: Enhancement 10 - Rich Text Formatting (Days 35-37)

### Dependencies
- [ ] Install @tiptap/react: `npm install @tiptap/react @tiptap/starter-kit`
- [ ] Install @tiptap/extension-link
- [ ] Install @tiptap/extension-mention (for @mentions)
- [ ] Install @tiptap/extension-placeholder

### Service Layer
- [ ] Update messages table to store rich text (HTML or JSON)
- [ ] Add content_format field ('plain' or 'rich')
- [ ] Add sanitization for HTML content (DOMPurify)

### React Components
- [ ] Create components/messages/RichTextEditor.tsx
- [ ] Add formatting toolbar (bold, italic, underline)
- [ ] Add lists (bullet, numbered)
- [ ] Add links
- [ ] Add code blocks
- [ ] Mobile: Optimize toolbar for mobile
- [ ] Create components/messages/RichTextRenderer.tsx
- [ ] Safely render rich text content
- [ ] Apply styling for formatted text

### Component Integration
- [ ] Replace standard textarea with RichTextEditor
- [ ] Update MessageCard to use RichTextRenderer
- [ ] Add toggle for plain/rich text mode
- [ ] Mobile: Add compact formatting toolbar

### Testing
- [ ] Test bold, italic, underline formatting
- [ ] Test lists
- [ ] Test links
- [ ] Test code blocks
- [ ] Test XSS protection (sanitization)
- [ ] Mobile: Test toolbar usability
- [ ] Test copy/paste from external sources

---

## ↗️ PHASE 11: Enhancement 11 - Message Forwarding (Days 38-39)

### Service Layer
- [ ] Update messages-service.ts with forwarding
- [ ] Implement forwardMessage(messageId, conversationIds[]) method
- [ ] Add forwarded_from_message_id field to messages table
- [ ] Create migration for forwarding schema

### React Components
- [ ] Create components/messages/ForwardMessageModal.tsx
- [ ] Display conversation list to forward to
- [ ] Add multi-select for forwarding to multiple conversations
- [ ] Add confirmation before forwarding
- [ ] Mobile: Optimize selection UI
- [ ] Update MessageCard with forward button
- [ ] Add "Forwarded message" indicator

### Component Integration
- [ ] Add forward option to message menu
- [ ] Show forwarding modal on selection
- [ ] Display forwarded message indicator

### Testing
- [ ] Test forward to single conversation
- [ ] Test forward to multiple conversations
- [ ] Test forwarded message display
- [ ] Test forward with attachments
- [ ] Mobile: Test conversation selection
- [ ] Permissions: Test forward only for authorized users

---

## 👁️ PHASE 12: Enhancement 12 - Enhanced Read Receipts (Days 40-42)

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_enhanced_read_receipts.sql
- [ ] Create message_read_receipts table
- [ ] Add message_id, user_id, read_at columns
- [ ] Add indexes
- [ ] Add RLS policies
- [ ] Remove read column from messages table (use receipts instead)
- [ ] Create trigger to update conversation unread count

### Service Layer
- [ ] Create lib/services/read-receipts-service.ts
- [ ] Implement markMessageAsRead(messageId, userId) method
- [ ] Implement getMessageReadReceipts(messageId) method
- [ ] Implement getUnreadMessages(conversationId, userId) method
- [ ] Add real-time subscription for read receipts

### React Components
- [ ] Create components/messages/ReadReceipts.tsx
- [ ] Display read status per user
- [ ] Show user avatars who have read
- [ ] Show read timestamps on hover
- [ ] Mobile: Show read receipts on tap

### Component Integration
- [ ] Update MessageCard with enhanced read receipts
- [ ] Show "Read by 2 people" below message
- [ ] Update conversation list with unread count per user
- [ ] Auto-mark messages as read when scrolled into view

### Testing
- [ ] Test mark as read
- [ ] Test read receipts display
- [ ] Test unread count accuracy
- [ ] Test real-time updates
- [ ] Test with multiple users
- [ ] Mobile: Test auto-mark on scroll
- [ ] Performance: Test with 100+ messages

---

## 🔔 PHASE 13: Enhancement 13 - Push Notifications (Days 43-48)

### Dependencies & Setup
- [ ] Set up Web Push notification service (Firebase Cloud Messaging or OneSignal)
- [ ] Install firebase: `npm install firebase`
- [ ] Create Firebase project and get credentials
- [ ] Add Firebase config to environment variables
- [ ] Set up service worker for push notifications

### Database Migration
- [ ] Create migration: supabase/migrations/[timestamp]_add_push_tokens.sql
- [ ] Create push_notification_tokens table
- [ ] Add user_id, token, device_type, enabled columns
- [ ] Add indexes
- [ ] Add RLS policies

### Service Layer
- [ ] Create lib/services/push-notifications-service.ts
- [ ] Implement requestPermission() method
- [ ] Implement registerPushToken() method
- [ ] Implement unregisterPushToken() method
- [ ] Implement sendPushNotification() server method
- [ ] Create API route: app/api/notifications/send/route.ts

### Service Worker
- [ ] Create public/firebase-messaging-sw.js
- [ ] Handle background notifications
- [ ] Handle notification click actions
- [ ] Add notification icons and badge

### React Components
- [ ] Create components/settings/NotificationSettings.tsx
- [ ] Add toggle for push notifications
- [ ] Add notification preferences (all, mentions only, none)
- [ ] Add test notification button
- [ ] Mobile: Request permissions on first use

### Integration
- [ ] Send push notification on new message
- [ ] Send push notification on @mention
- [ ] Send push notification on reply to thread
- [ ] Respect user preferences (don't send if disabled)
- [ ] Don't send to message sender
- [ ] Batch notifications for multiple messages

### Testing
- [ ] Test request permissions
- [ ] Test notification delivery
- [ ] Test notification click opens app/conversation
- [ ] Test notification on iOS Safari
- [ ] Test notification on Android Chrome
- [ ] Test notification preferences
- [ ] Test notification batching
- [ ] Performance: Test notification delivery time

---

## 🔍 PHASE 14: Enhancement 14 - Advanced Search (Days 49-51)

### Database Setup
- [ ] Verify PostgreSQL full-text search is available
- [ ] Add GIN index on messages.content for full-text search
- [ ] Create search view with tsvector

### Service Layer
- [ ] Update messages-service.ts with advanced search
- [ ] Implement searchMessages() with filters
- [ ] Add filter by date range
- [ ] Add filter by sender
- [ ] Add filter by has attachments
- [ ] Add filter by conversation
- [ ] Add sort options (relevance, date)

### React Components
- [ ] Create components/messages/AdvancedSearchModal.tsx
- [ ] Add search input with autocomplete
- [ ] Add filter options UI
- [ ] Add search results list
- [ ] Add result highlighting
- [ ] Add pagination for results
- [ ] Mobile: Fullscreen search on mobile
- [ ] Add "Jump to message" functionality

### Component Integration
- [ ] Update search bar to open advanced search
- [ ] Add search results to conversation view
- [ ] Highlight search results in messages

### Testing
- [ ] Test search by keyword
- [ ] Test search with date filter
- [ ] Test search with sender filter
- [ ] Test search with attachment filter
- [ ] Test result highlighting
- [ ] Test pagination
- [ ] Mobile: Test search UI
- [ ] Performance: Test search with 1000+ messages

---

## 🎨 PHASE 15: Enhancement 15 - Stickers & GIFs (Days 52-54)

### Dependencies
- [ ] Get Giphy API key: https://developers.giphy.com/
- [ ] Install @giphy/react-components: `npm install @giphy/react-components @giphy/js-fetch-api`
- [ ] Add NEXT_PUBLIC_GIPHY_API_KEY to .env.local

### Service Layer
- [ ] Create lib/services/giphy-service.ts
- [ ] Implement searchGifs(query) method
- [ ] Implement getTrendingGifs() method
- [ ] Add caching for popular GIFs

### React Components
- [ ] Create components/messages/GifPicker.tsx
- [ ] Add search bar for GIFs
- [ ] Display trending GIFs
- [ ] Add grid view with lazy loading
- [ ] Mobile: Optimize for touch scrolling
- [ ] Create components/messages/StickerPicker.tsx
- [ ] Create custom sticker packs (family-friendly)
- [ ] Add sticker categories

### Component Integration
- [ ] Add GIF button to message input
- [ ] Add Sticker button to message input
- [ ] Update MessageCard to display GIFs/stickers
- [ ] Store GIF URL in message attachments
- [ ] Mobile: Add bottom sheet for GIF picker

### Testing
- [ ] Test GIF search
- [ ] Test GIF selection and send
- [ ] Test sticker selection and send
- [ ] Test GIF display in messages
- [ ] Mobile: Test picker performance
- [ ] Mobile: Test GIF loading and animation
- [ ] Performance: Test GIF search speed

---

## 📱 PHASE 16: Mobile Optimization & Polish (Days 55-60)

### Responsive Design Audit
- [ ] Test all features on iPhone SE (smallest screen)
- [ ] Test all features on iPhone 15 Pro Max
- [ ] Test all features on iPad
- [ ] Test all features on Android (Samsung Galaxy)
- [ ] Test all features on Android (Google Pixel)

### Touch Interactions
- [ ] Ensure all buttons are 44x44px minimum
- [ ] Add touch feedback (ripple effect) to all interactive elements
- [ ] Add haptic feedback for key actions (send, react, record)
- [ ] Test long-press actions (context menu)
- [ ] Test swipe gestures (swipe to reply, swipe sidebar)
- [ ] Add pull-to-refresh for message list

### Keyboard Handling
- [ ] Test keyboard appearance doesn't hide input
- [ ] Add auto-scroll when keyboard appears
- [ ] Test keyboard dismissal on scroll
- [ ] Test keyboard type (default, emoji) switching
- [ ] Add "Done" button on iOS keyboard
- [ ] Test keyboard with rich text editor

### Performance Optimization
- [ ] Implement virtual scrolling for long message lists (react-window)
- [ ] Lazy load images and videos
- [ ] Optimize re-renders with React.memo
- [ ] Add skeleton loading states
- [ ] Optimize bundle size (code splitting)
- [ ] Add service worker for offline support
- [ ] Cache messages locally (IndexedDB)

### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Test with screen reader (VoiceOver, TalkBack)
- [ ] Add keyboard navigation support
- [ ] Ensure color contrast meets WCAG AA
- [ ] Add focus indicators
- [ ] Test with reduced motion settings

### Dark Mode
- [ ] Verify all components work in dark mode
- [ ] Test media previews in dark mode
- [ ] Ensure text contrast in dark mode
- [ ] Test GIF picker in dark mode

---

## 🧪 PHASE 17: Testing & Quality Assurance (Days 61-65)

### Unit Tests
- [ ] Write tests for messages-service.ts
- [ ] Write tests for file-upload-service.ts
- [ ] Write tests for message-reactions-service.ts
- [ ] Write tests for typing-indicators-service.ts
- [ ] Write tests for mentions-service.ts
- [ ] Write tests for read-receipts-service.ts
- [ ] Target: >80% code coverage

### Integration Tests
- [ ] Test full message send flow
- [ ] Test file upload and display flow
- [ ] Test threading flow
- [ ] Test reactions flow
- [ ] Test @mentions flow
- [ ] Test push notifications flow

### End-to-End Tests
- [ ] Test complete user journey: send, receive, react, reply
- [ ] Test multi-user scenarios
- [ ] Test offline/online transitions
- [ ] Test error recovery scenarios

### Performance Testing
- [ ] Load test: 1000+ messages in conversation
- [ ] Load test: 50+ conversations
- [ ] Load test: 100+ attachments
- [ ] Measure Time to Interactive (TTI)
- [ ] Measure First Contentful Paint (FCP)
- [ ] Measure Largest Contentful Paint (LCP)

### Security Testing
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Test XSS protection in rich text
- [ ] Test file upload malicious file rejection
- [ ] Test SQL injection protection
- [ ] Test rate limiting on APIs
- [ ] Audit dependencies for vulnerabilities

### Browser Compatibility
- [ ] Test Chrome (latest)
- [ ] Test Firefox (latest)
- [ ] Test Safari (latest)
- [ ] Test Edge (latest)
- [ ] Test Safari iOS
- [ ] Test Chrome Android

---

## 🚀 PHASE 18: Final Integration & Deployment (Days 66-70)

### Code Review & Cleanup
- [ ] Remove console.log statements
- [ ] Remove commented code
- [ ] Format code with Prettier
- [ ] Run ESLint and fix issues
- [ ] Update TypeScript to strict mode
- [ ] Remove unused imports
- [ ] Optimize import statements

### Documentation
- [ ] Update README with new features
- [ ] Document API endpoints
- [ ] Create component documentation
- [ ] Add JSDoc comments to services
- [ ] Create user guide for new features
- [ ] Document environment variables

### Database Finalization
- [ ] Review all migrations
- [ ] Ensure proper rollback scripts
- [ ] Backup production database
- [ ] Test migrations on staging
- [ ] Document database schema changes

### Deployment Preparation
- [ ] Create production build: `npm run build`
- [ ] Test production build locally
- [ ] Check bundle size and optimize
- [ ] Configure environment variables on Vercel
- [ ] Set up Supabase production environment
- [ ] Configure production storage buckets

### Gradual Rollout
- [ ] Deploy to staging environment
- [ ] Test all features on staging
- [ ] Enable for beta users (10% of users)
- [ ] Monitor error rates and performance
- [ ] Gather user feedback
- [ ] Fix any critical issues
- [ ] Roll out to 50% of users
- [ ] Roll out to 100% of users

### Monitoring & Analytics
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics (Google Analytics, Mixpanel)
- [ ] Monitor key metrics (messages sent, attachments uploaded)
- [ ] Set up alerts for errors
- [ ] Monitor Supabase usage and quotas
- [ ] Monitor storage usage

### Post-Launch
- [ ] Monitor user feedback
- [ ] Create bug fix priority list
- [ ] Plan iteration improvements
- [ ] Celebrate successful launch! 🎉

---

## 📊 Progress Tracking

**Total Tasks:** 500+
**Completed:** 0
**In Progress:** 0
**Remaining:** 500+

**Estimated Timeline:** 70 days (10 weeks)
**Target Launch:** Late March 2025

---

## 🎯 Success Criteria

- [ ] All 15 enhancements fully implemented
- [ ] Zero critical bugs
- [ ] <500ms message delivery time
- [ ] >98% file upload success rate
- [ ] Works on iOS and Android mobile browsers
- [ ] Passes accessibility audit
- [ ] User satisfaction >4.5/5
- [ ] Messages per user per day >10

---

## ⚠️ Risk Mitigation

### Technical Risks
- **Risk:** Real-time performance degrades with many users
  - **Mitigation:** Load testing, connection pooling, optimize subscriptions

- **Risk:** File upload storage costs exceed budget
  - **Mitigation:** Set file size limits, implement storage quotas, cleanup old files

- **Risk:** Mobile performance issues
  - **Mitigation:** Virtual scrolling, lazy loading, image optimization

### User Adoption Risks
- **Risk:** Users find new features complex
  - **Mitigation:** Gradual rollout, in-app tutorials, simple defaults

- **Risk:** Breaking changes disrupt existing users
  - **Mitigation:** Backward compatibility, data migration scripts, feature flags

---

**Ready to begin implementation!** 🚀
