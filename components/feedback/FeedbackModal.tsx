'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { FeedbackType } from '@/lib/types';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURE_OPTIONS = [
  'Tasks',
  'Calendar',
  'Shopping',
  'Meals',
  'Goals',
  'Messages',
  'Household',
  'Reminders',
  'Dashboard',
  'Settings',
  'Other',
];

const FEEDBACK_TYPE_OPTIONS = [
  { value: FeedbackType.BUG, label: 'Bug Report' },
  { value: FeedbackType.FEATURE_REQUEST, label: 'Feature Request' },
  { value: FeedbackType.UI_UX, label: 'UI/UX Issue' },
  { value: FeedbackType.GENERAL, label: 'General Feedback' },
];

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const { currentSpace } = useSpaces();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const [feedbackType, setFeedbackType] = useState<FeedbackType | ''>('');
  const [featureName, setFeatureName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-populate page URL and scroll to top
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      setPageUrl(window.location.href);
      // Scroll modal content to top when opened
      if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setFeedbackType('');
      setFeatureName('');
      setPageUrl('');
      setDescription('');
      setScreenshot(null);
      setPreviewUrl(null);
      setError('');
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setScreenshot(file);
    setError('');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeScreenshot = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setScreenshot(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getBrowserInfo = () => {
    if (typeof window === 'undefined') return {};

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to submit feedback');
      return;
    }

    if (description.trim().length < 10) {
      setError('Please provide at least 10 characters in your description');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      if (currentSpace) formData.append('space_id', currentSpace.id);
      if (feedbackType) formData.append('feedback_type', feedbackType);
      if (featureName) formData.append('feature_name', featureName);
      if (pageUrl) formData.append('page_url', pageUrl);
      formData.append('description', description);
      if (screenshot) formData.append('screenshot', screenshot);
      formData.append('browser_info', JSON.stringify(getBrowserInfo()));

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      toast.success('Feedback submitted successfully!', {
        description: 'Thank you for helping us improve Rowan.',
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });

      onClose();
    } catch (err: any) {
      logger.error('Error submitting feedback:', err, { component: 'FeedbackModal', action: 'component_action' });
      setError(err.message || 'Failed to submit feedback. Please try again.');
      toast.error('Failed to submit feedback', {
        description: 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-hidden">
      <div
        ref={modalContentRef}
        className="w-full max-h-[100dvh] sm:h-auto sm:max-h-[80vh] sm:max-w-2xl bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 bg-blue-600">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Send Feedback</h2>
            <p className="text-sm text-blue-100 mt-1">Help us improve Rowan by sharing your thoughts</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container - layout wrapper */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feedback Type <span className="text-red-500">*</span>
              </label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                required
                className="w-full pl-4 pr-12 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 appearance-none bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
                }}
              >
                <option value="">Select type...</option>
                {FEEDBACK_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Feature/Page */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feature/Page <span className="text-red-500">*</span>
              </label>
              <select
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                required
                className="w-full pl-4 pr-12 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 appearance-none bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
                }}
              >
                <option value="">Select feature...</option>
                {FEATURE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Page URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page URL <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="url"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
                rows={6}
                placeholder="Please describe your feedback in detail..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description.length}/10 minimum characters
              </p>
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Screenshot <span className="text-gray-400">(optional)</span>
              </label>

              {!screenshot ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload image (PNG, JPG, GIF, WebP - Max 5MB)
                  </span>
                </button>
              ) : (
                <div className="relative border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <img
                    src={previewUrl!}
                    alt="Screenshot preview"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute top-6 right-6 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Footer - Sticky Actions */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || description.trim().length < 10}
              className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
