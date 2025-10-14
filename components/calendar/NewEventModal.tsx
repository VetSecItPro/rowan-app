'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Smile, Image as ImageIcon, Paperclip, Calendar, ChevronDown, Palette } from 'lucide-react';
import { CreateEventInput, CalendarEvent } from '@/lib/services/calendar-service';
import { eventAttachmentsService } from '@/lib/services/event-attachments-service';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CreateEventInput) => Promise<CalendarEvent | void>;
  editEvent?: CalendarEvent | null;
  spaceId: string;
}

// Family-friendly universal emojis (20 total)
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
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
];

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip'];

export function NewEventModal({ isOpen, onClose, onSave, editEvent, spaceId }: NewEventModalProps) {
  const [formData, setFormData] = useState<CreateEventInput>({
    space_id: spaceId,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    is_recurring: false,
    location: '',
    category: 'personal',
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState<number[]>([]);
  const [dateError, setDateError] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predefined color palette
  const colorPalette = [
    { name: 'Purple', value: '#9333ea' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Orange', value: '#f97316' },
  ];

  useEffect(() => {
    if (editEvent) {
      setFormData({
        space_id: spaceId,
        title: editEvent.title,
        description: editEvent.description || '',
        start_time: editEvent.start_time,
        end_time: editEvent.end_time || '',
        is_recurring: editEvent.is_recurring,
        location: editEvent.location || '',
        category: editEvent.category || 'personal',
      });
      setCustomColor((editEvent as any).custom_color || '');
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        is_recurring: false,
        location: '',
        category: 'personal',
      });
      setCustomColor('');
    }
    // Reset attachments when modal opens/closes
    setAttachedImages([]);
    setAttachedFiles([]);
    setShowEmojiPicker(false);
    setDateError('');
  }, [editEvent, spaceId, isOpen]);

  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate end time is not before start time
    if (formData.start_time && formData.end_time) {
      const startDate = new Date(formData.start_time);
      const endDate = new Date(formData.end_time);

      if (endDate < startDate) {
        setDateError('End date & time cannot be before start date & time');
        return;
      }
    }

    // Clear any previous errors
    setDateError('');
    setUploading(true);

    try {
      // Clean up the form data - remove empty strings
      const cleanedData: CreateEventInput = {
        space_id: formData.space_id,
        title: formData.title,
        description: formData.description || undefined,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
        is_recurring: formData.is_recurring,
        location: formData.location || undefined,
        category: formData.category,
        custom_color: customColor || undefined,
      };

      // Save the event and get the created event back
      const createdEvent = await onSave(cleanedData);

      // Upload attachments if we have an event ID and files to upload
      if (createdEvent?.id && (attachedImages.length > 0 || attachedFiles.length > 0)) {
        const allFiles = [...attachedImages, ...attachedFiles];

        for (const file of allFiles) {
          try {
            await eventAttachmentsService.uploadAttachment({
              event_id: createdEvent.id,
              file
            });
          } catch (error) {
            console.error('Failed to upload attachment:', file.name, error);
            // Continue uploading other files even if one fails
          }
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      setDateError('Failed to save event. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  const validateImageFile = (file: File): boolean => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return false;
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return false;
    return true;
  };

  const validateDocumentFile = (file: File): boolean => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) return false;
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) return false;
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
      alert(`Invalid image file(s):\n${invalidFiles.join('\n')}\n\nOnly JPG, PNG, GIF, and WebP images are allowed.`);
    }

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
      alert(`Invalid file(s):\n${invalidFiles.join('\n')}\n\nOnly PDF, Word, Excel, PowerPoint, TXT, CSV, and ZIP files are allowed.`);
    }

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <h2 className="text-2xl font-bold">
                {editEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Team meeting"
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 grid grid-cols-5 gap-2 z-10 min-w-[240px]">
                    {EMOJIS.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-2xl transition-all hover:scale-110"
                        title="Click to add emoji"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add event details..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
            <div className="flex items-center gap-2 mt-2">
              {/* Image Attachment Button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Attach images"
              >
                <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* File Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Attach files"
              >
                <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Attached Images */}
          {attachedImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attached Images ({attachedImages.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {attachedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      {img.name}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="ml-1 hover:text-red-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attached Files ({attachedFiles.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <div className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.start_time ? formData.start_time.slice(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const newStartTime = new Date(e.target.value).toISOString();
                    setFormData({ ...formData, start_time: newStartTime });

                    // Re-validate if end time is already set
                    if (formData.end_time) {
                      const startDate = new Date(newStartTime);
                      const endDate = new Date(formData.end_time);

                      if (endDate < startDate) {
                        setDateError('End date & time cannot be before start date & time');
                      } else {
                        setDateError('');
                      }
                    }
                  }
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.end_time ? formData.end_time.slice(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const newEndTime = new Date(e.target.value).toISOString();
                    setFormData({ ...formData, end_time: newEndTime });

                    // Validate end time is not before start time
                    if (formData.start_time) {
                      const startDate = new Date(formData.start_time);
                      const endDate = new Date(newEndTime);

                      if (endDate < startDate) {
                        setDateError('End date & time cannot be before start date & time');
                      } else {
                        setDateError('');
                      }
                    }
                  } else {
                    setFormData({ ...formData, end_time: '' });
                    setDateError('');
                  }
                }}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white ${
                  dateError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {dateError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="font-medium">⚠</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Add location..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring event</span>
            </label>
          </div>

          {/* Recurring Frequency Panel */}
          {formData.is_recurring && (
            <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency
                </label>
                <div className="relative">
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none"
                    style={{ paddingRight: '2.5rem' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Day Selection for Weekly */}
              {recurringFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Days of Week
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedDaysOfWeek(prev =>
                            prev.includes(index)
                              ? prev.filter(d => d !== index)
                              : [...prev, index]
                          );
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDaysOfWeek.includes(index)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day Selection for Monthly */}
              {recurringFrequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Days of Month
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedDaysOfMonth(prev =>
                            prev.includes(day)
                              ? prev.filter(d => d !== day)
                              : [...prev, day]
                          );
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDaysOfMonth.includes(day)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Custom Color (Optional)
            </label>
            <div className="space-y-3">
              {/* Predefined colors */}
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCustomColor(color.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      customColor === color.value
                        ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-purple-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                {customColor && !colorPalette.find(c => c.value === customColor) && (
                  <button
                    type="button"
                    onClick={() => setCustomColor('')}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Clear custom color"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Custom color input */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor || '#9333ea'}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="Enter hex color (e.g., #9333ea)"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                />
                {customColor && (
                  <button
                    type="button"
                    onClick={() => setCustomColor('')}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Custom color overrides category color
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Category
            </label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { value: 'work', label: 'Work', icon: '💼', color: 'bg-blue-500' },
                { value: 'personal', label: 'Personal', icon: '👤', color: 'bg-purple-500' },
                { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', color: 'bg-pink-500' },
                { value: 'health', label: 'Health', icon: '💪', color: 'bg-green-500' },
                { value: 'social', label: 'Social', icon: '🎉', color: 'bg-orange-500' },
              ].map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: category.value as any })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    formData.category === category.value
                      ? `${category.color} border-transparent text-white`
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-xs font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!dateError || uploading}
              className={`flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl transition-all shadow-lg font-medium ${
                dateError || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {uploading ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>

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
      </div>
    </div>
  );
}
