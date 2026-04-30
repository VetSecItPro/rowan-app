'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, User as UserIcon, Home } from 'lucide-react';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { logger } from '@/lib/logger';

interface WelcomeFormProps {
  /** Pre-filled display name (auto-derived from email at signup). */
  initialName: string;
  /**
   * Pre-filled household name. NULL when the user does not own a space
   * (e.g. an invited partner who landed here directly) — we hide the
   * household field in that case rather than letting them try to rename
   * someone else's space.
   */
  initialSpaceName: string | null;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

/**
 * One-screen post-signup confirmation form. The user can:
 *   - Edit display name + household name and submit
 *   - Click "Skip" — both values stay as the auto-derived defaults but
 *     welcome_completed_at is still stamped so they don't get bounced again.
 */
export function WelcomeForm({ initialName, initialSpaceName }: WelcomeFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [spaceName, setSpaceName] = useState(initialSpaceName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishAndRedirect = () => {
    // router.refresh() forces the (main) layout to re-read welcome_completed_at
    // on the next navigation, so the dashboard render isn't gated on stale data.
    router.refresh();
    router.push('/dashboard');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (initialSpaceName !== null && !spaceName.trim()) {
      setError('Please enter a household name.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await csrfFetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          spaceName: (spaceName.trim() || trimmedName + "'s Space"),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      finishAndRedirect();
    } catch (err) {
      logger.error('Welcome submit failed', err, {
        component: 'WelcomeForm',
        action: 'submit',
      });
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const response = await csrfFetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip: true }),
      });
      if (!response.ok) {
        // Even if the stamp fails we don't want to block the user — but show
        // an error so they know to try again from Settings if it sticks.
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Could not save. Please try again.');
        setSubmitting(false);
        return;
      }
      finishAndRedirect();
    } catch (err) {
      logger.error('Welcome skip failed', err, {
        component: 'WelcomeForm',
        action: 'skip',
      });
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 sm:p-8">
      <motion.div
        className="w-full max-w-md bg-gray-900/95 p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-800/50"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="mb-8" variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
            Welcome to Rowan
          </h1>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
            We guessed a couple of things from your email. Take a second to confirm,
            or skip if it looks right.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 bg-red-900/10 border border-red-800/50 text-red-400 px-4 py-3 rounded-2xl text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={itemVariants}>
            <label
              htmlFor="welcome-name"
              className="block text-sm font-semibold text-gray-300 mb-2 ml-1"
            >
              Your name
            </label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                id="welcome-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
                maxLength={100}
                autoFocus
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base md:text-sm"
                placeholder="Alex Rivera"
              />
            </div>
          </motion.div>

          {initialSpaceName !== null && (
            <motion.div variants={itemVariants}>
              <label
                htmlFor="welcome-space"
                className="block text-sm font-semibold text-gray-300 mb-2 ml-1"
              >
                Household name
              </label>
              <div className="relative group">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  id="welcome-space"
                  type="text"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  disabled={submitting}
                  required
                  maxLength={100}
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base md:text-sm"
                  placeholder="The Rivera Household"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-1">
                You can rename this anytime in Settings.
              </p>
            </motion.div>
          )}

          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-gray-900"
          >
            {submitting ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>

          <motion.div variants={itemVariants} className="text-center pt-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors disabled:opacity-40"
            >
              Skip — looks good
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
