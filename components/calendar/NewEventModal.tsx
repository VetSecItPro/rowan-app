'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Smile, Image as ImageIcon, Paperclip, Calendar, ChevronDown, ShoppingCart, Trash2, Timer } from 'lucide-react';
import { CreateEventInput, CalendarEvent } from '@/lib/services/calendar-service';
import { eventAttachmentsService } from '@/lib/services/event-attachments-service';
import { shoppingService, ShoppingList } from '@/lib/services/shopping-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { toDateTimeLocalValue, fromDateTimeLocalValue, fromUTC, toUTC } from '@/lib/utils/timezone-utils';
import { Dropdown } from '@/components/ui/Dropdown';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CreateEventInput) => Promise<CalendarEvent | void>;
  onDelete?: (eventId: string) => void;
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

export function NewEventModal({ isOpen, onClose, onSave, onDelete, editEvent, spaceId }: NewEventModalProps) {
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
  const [linkToShopping, setLinkToShopping] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

      // Parse recurrence pattern if it exists
      if (editEvent.recurrence_pattern) {
        const pattern = editEvent.recurrence_pattern;
        if (pattern === 'daily') {
          setRecurringFrequency('daily');
        } else if (pattern.startsWith('weekly:')) {
          setRecurringFrequency('weekly');
          const days = pattern.split(':')[1].split(',').map(Number);
          setSelectedDaysOfWeek(days);
        } else if (pattern.startsWith('monthly:')) {
          setRecurringFrequency('monthly');
          const days = pattern.split(':')[1].split(',').map(Number);
          setSelectedDaysOfMonth(days);
        }
      } else {
        setRecurringFrequency('weekly');
        setSelectedDaysOfWeek([]);
        setSelectedDaysOfMonth([]);
      }

      // Set countdown fields
      setShowCountdown(editEvent.show_countdown || false);
      setCountdownLabel(editEvent.countdown_label || '');
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
      setRecurringFrequency('weekly');
      setSelectedDaysOfWeek([]);
      setSelectedDaysOfMonth([]);
    }
    // Reset attachments, shopping link, and countdown when modal opens/closes
    setAttachedImages([]);
    setAttachedFiles([]);
    setShowEmojiPicker(false);
    setDateError('');
    setLinkToShopping(false);
    setSelectedListId('');
    if (!editEvent) {
      setShowCountdown(false);
      setCountdownLabel('');
    }
  }, [editEvent, spaceId, isOpen]);

  // Load shopping lists on mount
  useEffect(() => {
    if (isOpen && spaceId) {
      loadShoppingLists();
    }
  }, [isOpen, spaceId]);

  const loadShoppingLists = async () => {
    try {
      const lists = await shoppingService.getLists(spaceId);
      // Only show active shopping lists
      const activeLists = lists.filter(list => list.status === 'active');
      setShoppingLists(activeLists);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    }
  };

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
      // Build recurrence pattern string if recurring
      let recurrencePattern: string | undefined;
      if (formData.is_recurring) {
        if (recurringFrequency === 'daily') {
          recurrencePattern = 'daily';
        } else if (recurringFrequency === 'weekly' && selectedDaysOfWeek.length > 0) {
          recurrencePattern = `weekly:${selectedDaysOfWeek.sort((a, b) => a - b).join(',')}`;
        } else if (recurringFrequency === 'monthly' && selectedDaysOfMonth.length > 0) {
          recurrencePattern = `monthly:${selectedDaysOfMonth.sort((a, b) => a - b).join(',')}`;
        }
      }

      // Clean up the form data - remove empty strings
      const cleanedData: CreateEventInput = {
        space_id: formData.space_id,
        title: formData.title,
        description: formData.description || undefined,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
        is_recurring: formData.is_recurring,
        recurrence_pattern: recurrencePattern,
        location: formData.location || undefined,
        category: formData.category,
        show_countdown: showCountdown,
        countdown_label: showCountdown && countdownLabel ? countdownLabel : undefined,
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
              space_id: cleanedData.space_id,
              file
            });
          } catch (error) {
            console.error('Failed to upload attachment:', file.name, error);
            // Continue uploading other files even if one fails
          }
        }
      }

      // Link to shopping list if selected
      if (createdEvent?.id && linkToShopping && selectedListId) {
        try {
          await shoppingIntegrationService.linkToCalendar(selectedListId, createdEvent.id);
        } catch (error) {
          console.error('Failed to link shopping list:', error);
          // Don't fail the whole operation if linking fails
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

  // Helper functions for dropdown options
  const getFrequencyOptions = () => {
    return [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];
  };

  const getShoppingListOptions = () => {
    const options = [{ value: '', label: 'Choose a list...' }];
    shoppingLists.forEach((list) => {
      options.push({
        value: list.id,
        label: `${list.title} (${list.items?.length || 0} items)`
      });
    });
    return options;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-3xl sm:h-[90vh] sm:rounded-2xl overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <h2 className="text-lg sm:text-xl font-bold">
                {editEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
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
                  className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3 z-50 w-full sm:w-80 max-w-[calc(100vw-2rem)]">
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-10 h-10 text-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Click to add emoji"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
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
                        className="ml-1 hover:text-red-500 transition-colors"
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
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
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
                        className="ml-1 hover:text-red-500 transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <DateTimePicker
                label="Start Date & Time *"
                value={formData.start_time ? toDateTimeLocalValue(formData.start_time) : ''}
                onChange={(value) => {
                  if (value) {
                    // Convert from datetime-local (user's local time) to UTC for storage
                    const newStartTime = fromDateTimeLocalValue(value);
                    setFormData({ ...formData, start_time: newStartTime });

                    // Re-validate if end time is already set
                    if (formData.end_time) {
                      const startDate = fromUTC(newStartTime);
                      const endDate = fromUTC(formData.end_time);

                      if (endDate < startDate) {
                        setDateError('End date & time cannot be before start date & time');
                      } else {
                        setDateError('');
                      }
                    }
                  }
                }}
                placeholder="Select start date and time..."
                className={dateError ? 'border-red-500 dark:border-red-500' : ''}
              />
            </div>

            <div>
              <DateTimePicker
                label="End Date & Time"
                value={formData.end_time ? toDateTimeLocalValue(formData.end_time) : ''}
                onChange={(value) => {
                  if (value) {
                    // Convert from datetime-local (user's local time) to UTC for storage
                    const newEndTime = fromDateTimeLocalValue(value);
                    setFormData({ ...formData, end_time: newEndTime });

                    // Validate end time is not before start time
                    if (formData.start_time) {
                      const startDate = fromUTC(formData.start_time);
                      const endDate = fromUTC(newEndTime);

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
                placeholder="Select end date and time..."
                className={dateError ? 'border-red-500 dark:border-red-500' : ''}
              />
              {dateError && (
                <p className="mt-2 text-base md:text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="font-medium">⚠</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="field-7" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
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
            <label htmlFor="field-8" className="flex items-center gap-2 cursor-pointer">
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
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
              <div>
                <label htmlFor="field-9" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Frequency
                </label>
                <Dropdown
                  value={recurringFrequency}
                  onChange={(value) => setRecurringFrequency(value as any)}
                  options={getFrequencyOptions()}
                  placeholder="Select frequency..."
                />
              </div>

              {/* Day Selection for Weekly */}
              {recurringFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    Select Days of Week
                  </label>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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
                  <label htmlFor="field-11" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 cursor-pointer">
                    Select Days of Month
                  </label>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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

          {/* Shopping List Integration */}
          <div>
            <label htmlFor="field-12" className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={linkToShopping}
                onChange={(e) => setLinkToShopping(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Link to Shopping List
              </span>
            </label>
          </div>

          {/* Shopping List Selection */}
          {linkToShopping && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
              <div>
                <label htmlFor="field-13" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Select Shopping List
                </label>
                {shoppingLists.length > 0 ? (
                  <Dropdown
                    value={selectedListId}
                    onChange={setSelectedListId}
                    options={getShoppingListOptions()}
                    placeholder="Choose a list..."
                  />
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No active shopping lists found. Create a shopping list first to link it to this event.
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-3 border border-emerald-300 dark:border-emerald-700">
                <p className="text-xs text-emerald-900 dark:text-emerald-100">
                  <strong>Tip:</strong> Linking a shopping list helps you coordinate your shopping trip with this event. The list will appear in your event details.
                </p>
              </div>
            </div>
          )}

          {/* Countdown Widget Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCountdown}
                onChange={(e) => setShowCountdown(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Show as Countdown
              </span>
            </label>
            <p className="ml-6 mt-1 text-xs text-gray-500 dark:text-gray-400">
              Display a countdown to this event on your dashboard
            </p>
          </div>

          {/* Countdown Label Input */}
          {showCountdown && (
            <div className="space-y-3 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Countdown Label (Optional)
                </label>
                <input
                  type="text"
                  value={countdownLabel}
                  onChange={(e) => setCountdownLabel(e.target.value)}
                  placeholder="e.g., Birthday!, Vacation, Wedding Day"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  A custom label to display instead of the event title. Leave empty to use the event title.
                </p>
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
              Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
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
                  className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-colors ${
                    formData.category === category.value
                      ? `${category.color} border-transparent text-white`
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{category.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Delete button - only shown when editing */}
            {editEvent && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${editEvent.title}"? This event will be moved to trash.`)) {
                    onDelete(editEvent.id);
                    onClose();
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!dateError || uploading}
              className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg transition-colors font-medium ${
                dateError || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-600 hover:to-purple-700'
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
