'use client';

import { useState, useEffect, useRef } from 'react';
import { Smile, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import { CreateMessageInput, Message } from '@/lib/services/messages-service';
import { Modal } from '@/components/ui/Modal';
import { showWarning } from '@/lib/utils/toast';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: CreateMessageInput) => void;
  editMessage?: Message | null;
  spaceId: string;
  conversationId: string | null;
}

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

// Allowed image formats (excluding SVG for security)
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Allowed document formats (safe formats only)
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
];

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip'];

/** Renders a modal form for composing and sending a new message. */
export function NewMessageModal({ isOpen, onClose, onSave, editMessage, spaceId, conversationId }: NewMessageModalProps) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editMessage) {
      setContent(editMessage.content);
    } else {
      setContent('');
    }
    // Reset attachments when modal opens/closes
    setAttachedImages([]);
    setAttachedFiles([]);
    setShowEmojiPicker(false);
  }, [editMessage, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      space_id: spaceId,
      conversation_id: conversationId,
      content,
    });
    setContent('');
    setAttachedImages([]);
    setAttachedFiles([]);
    onClose();
  };

  const handleEmojiClick = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const validateImageFile = (file: File): boolean => {
    // Check MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return false;
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      return false;
    }

    return true;
  };

  const validateDocumentFile = (file: File): boolean => {
    // Check MIME type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return false;
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      return false;
    }

    return true;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach(file => {
      if (validateImageFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      setAttachedImages(prev => [...prev, ...validFiles]);
    }

    if (invalidFiles.length > 0) {
      showWarning(`Invalid image file(s): ${invalidFiles.join(', ')}. Only JPG, PNG, GIF, and WebP images are allowed.`);
    }

    // Reset input
    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach(file => {
      if (validateDocumentFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }

    if (invalidFiles.length > 0) {
      showWarning(`Invalid file(s): ${invalidFiles.join(', ')}. Only PDF, Word, Excel, PowerPoint, TXT, CSV, and ZIP files are allowed.`);
    }

    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const footerContent = (
    <div className="flex items-center justify-between gap-3">
      {/* Left side buttons */}
      <div className="flex items-center gap-2">
        {/* Emoji Picker Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add emoji"
            className="p-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors"
          >
            <Smile className="w-5 h-5 text-gray-400" />
          </button>

          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 z-10 w-full sm:w-80 max-w-[calc(100vw-2rem)]">
              <h4 className="text-base sm:text-sm font-medium text-gray-300 mb-3">Select an emoji</h4>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                {EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="btn-touch w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors active-press"
                    title="Click to add emoji"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Image Attachment Button */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          title="Attach image"
          className="p-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-400" />
        </button>

        {/* File Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          className="p-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors"
        >
          <Paperclip className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="new-message-form"
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:opacity-90 transition-all shadow-lg"
        >
          {editMessage ? 'Save Changes' : 'Send Message'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editMessage ? 'Edit Message' : 'New Message'}
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-green-500 to-emerald-600"
      footer={footerContent}
    >
      <form id="new-message-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Message Content */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Message *
            </label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              rows={6}
              className="w-full input-mobile bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white resize-none"
            />
          </div>

          {/* Attached Images */}
          {attachedImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Attached Images ({attachedImages.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {attachedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg text-sm flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      {img.name}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="ml-1 hover:text-red-500 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Attached Files ({attachedFiles.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <div className="px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-lg text-sm flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="ml-1 hover:text-red-500 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
      </form>
    </Modal>
  );
}
