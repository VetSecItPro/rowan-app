'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  Bug,
  Lightbulb,
  Palette,
  Zap,
  MoreHorizontal,
  Flag,
  ExternalLink
} from 'lucide-react';

interface FeedbackFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

type FeedbackCategory = 'bug' | 'feature_request' | 'ui_ux' | 'performance' | 'other';
type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low';
type FeedbackPriority = 'must_have' | 'should_have' | 'could_have' | 'wont_have';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'ui_ux', label: 'UI/UX Feedback', icon: Palette, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'performance', label: 'Performance', icon: Zap, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-gray-600 bg-gray-50 border-gray-200' }
];

const SEVERITIES = [
  { value: 'critical', label: 'Critical', description: 'App crashes, data loss, security issues', color: 'text-red-600' },
  { value: 'high', label: 'High', description: 'Feature doesn\'t work, blocks main workflows', color: 'text-orange-600' },
  { value: 'medium', label: 'Medium', description: 'Minor functionality issues, UI glitches', color: 'text-yellow-600' },
  { value: 'low', label: 'Low', description: 'Cosmetic issues, nice-to-have improvements', color: 'text-green-600' }
];

const PRIORITIES = [
  { value: 'must_have', label: 'Must Have', description: 'Essential for launch' },
  { value: 'should_have', label: 'Should Have', description: 'Important for user experience' },
  { value: 'could_have', label: 'Could Have', description: 'Nice additions for future versions' },
  { value: 'wont_have', label: 'Won\'t Have', description: 'Not planned for current version' }
];

export function FeedbackForm({ onSubmit, onCancel }: FeedbackFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as FeedbackCategory | '',
    severity: '' as FeedbackSeverity | '',
    priority: 'should_have' as FeedbackPriority,
    page_url: typeof window !== 'undefined' ? window.location.href : ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.category || !formData.severity) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      // Gather browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        url: window.location.href
      };

      const response = await csrfFetch('/api/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          browser_info: browserInfo
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      // Success!
      if (onSubmit) {
        onSubmit();
      } else {
        // Reload the page to show the new feedback
        router.refresh();
      }

    } catch (error) {
      logger.error('Feedback submission error:', error, { component: 'FeedbackForm', action: 'component_action' });
      setError(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of your feedback..."
          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={200}
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          {formData.title.length}/200 characters
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setFormData({ ...formData, category: category.value })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  formData.category === category.value
                    ? category.color + ' border-opacity-100'
                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{category.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Severity Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Severity <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {SEVERITIES.map((severity) => (
            <label
              key={severity.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                formData.severity === severity.value
                  ? 'bg-blue-900/20 border-blue-700'
                  : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
              }`}
            >
              <input
                type="radio"
                name="severity"
                value={severity.value}
                checked={formData.severity === severity.value}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as FeedbackSeverity })}
                className="mt-1"
                required
              />
              <div>
                <div className={`font-medium ${severity.color}`}>
                  {severity.label}
                </div>
                <div className="text-sm text-gray-400">
                  {severity.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
          Priority
        </label>
        <select
          id="priority"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as FeedbackPriority })}
          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRIORITIES.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label} - {priority.description}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Please provide detailed feedback..."
          rows={5}
          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
          maxLength={2000}
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          {formData.description.length}/2000 characters
        </p>
      </div>

      {/* Page URL */}
      <div>
        <label htmlFor="page_url" className="block text-sm font-medium text-gray-300 mb-2">
          Page URL (Optional)
        </label>
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-gray-400" />
          <input
            id="page_url"
            type="url"
            value={formData.page_url}
            onChange={(e) => setFormData({ ...formData, page_url: e.target.value })}
            placeholder="https://..."
            className="flex-1 px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          URL where you encountered the issue (auto-filled)
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <>
              <Flag className="w-4 h-4" />
              Submit Feedback
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default FeedbackForm;
