'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { Bug, Lightbulb, MessageCircle, Send, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeedbackCategory, UserFeedback } from '@/lib/types';

const CATEGORIES: { id: FeedbackCategory; label: string; icon: typeof Bug; color: string }[] = [
  { id: 'bug_report', label: 'Bug Report', icon: Bug, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'general', label: 'General', icon: MessageCircle, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  done: { label: 'Done', className: 'bg-green-500/10 text-green-400 border border-green-500/30' },
};

export default function FeedbackPage() {
  const { user, loading: authLoading } = useAuthWithSpaces();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<FeedbackCategory>('bug_report');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Fetch user's feedback history
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery<{ success: boolean; data: UserFeedback[] }>({
    queryKey: ['user-feedback'],
    queryFn: async () => {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('Failed to fetch feedback');
      return res.json();
    },
    enabled: !!user,
  });

  // Submit feedback mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: { category: FeedbackCategory; title: string; description: string }) => {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit feedback');
      }
      return res.json();
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    submitMutation.mutate({ category, title: title.trim(), description: description.trim() });
  };

  const submissions = feedbackData?.data ?? [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-2">You must be logged in to submit feedback.</p>
          <a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Send Feedback</h1>
          <p className="text-gray-400 text-sm">
            Help us improve Rowan. Report bugs, request features, or share your thoughts.
          </p>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-green-400 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Thank you! Your feedback has been submitted.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 sm:p-6 mb-10">
          {/* Category picker */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isActive = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? cat.color
                        : 'text-gray-400 bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-1.5">
              <label htmlFor="fb-title" className="text-sm font-medium text-gray-300">Title</label>
              <span className={`text-xs ${title.length > 100 ? 'text-red-400' : 'text-gray-500'}`}>
                {title.length}/100
              </span>
            </div>
            <input
              id="fb-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Brief summary of your feedback"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <div className="flex justify-between items-baseline mb-1.5">
              <label htmlFor="fb-desc" className="text-sm font-medium text-gray-300">Description</label>
              <span className={`text-xs ${description.length > 2000 ? 'text-red-400' : 'text-gray-500'}`}>
                {description.length}/2000
              </span>
            </div>
            <textarea
              id="fb-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder={
                category === 'bug_report'
                  ? 'What happened? What did you expect? Steps to reproduce...'
                  : category === 'feature_request'
                    ? 'Describe the feature and how it would help you...'
                    : 'Share your thoughts...'
              }
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors resize-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitMutation.isPending || title.trim().length < 3 || description.trim().length < 10}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Feedback
          </button>

          {submitMutation.isError && (
            <p className="mt-3 text-sm text-red-400">
              {submitMutation.error instanceof Error ? submitMutation.error.message : 'Something went wrong'}
            </p>
          )}
        </form>

        {/* Submission History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Submissions</h2>

          {feedbackLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 rounded-xl bg-gray-800/30 border border-gray-800">
              <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(item => {
                const catConfig = CATEGORIES.find(c => c.id === item.category);
                const CatIcon = catConfig?.icon ?? MessageCircle;
                const badge = STATUS_BADGE[item.status];

                return (
                  <div
                    key={item.id}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CatIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                      </div>
                      {badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
