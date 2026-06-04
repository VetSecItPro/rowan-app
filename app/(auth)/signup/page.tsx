'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileBrandHeader, DesktopBrandPanel } from './BrandPanel';
import { PasswordStrength, validatePassword } from './PasswordStrength';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Derive a default display name from the email local-part. The user can edit
 * this in onboarding / settings later. Keeps the signup form essentials-only
 * while still satisfying the server-side `name` requirement on /api/auth/signup.
 */
function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'New User';
  // Replace separators, then title-case the first segment.
  const cleaned = local.replace(/[._\-+]+/g, ' ').trim();
  if (!cleaned) return 'New User';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function SignUpPage() {
  const { signUp, signOut } = useAuthWithSpaces();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get invite token from URL params (for users invited to a space)
  const inviteToken = searchParams.get('invite_token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  // Age gate (COPPA): user must affirm 13+ to submit. Persists nothing; gate-only.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  // ToS / Privacy agreement — required before submit.
  const [tosAgreed, setTosAgreed] = useState(false);

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Frontend validation matching backend requirements
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    // Age gate: must affirm 13+ before submitting (COPPA posture)
    if (!ageConfirmed) {
      setError('You must confirm you are 13 years of age or older to create an account.');
      return;
    }

    // Terms / Privacy agreement is required.
    if (!tosAgreed) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);

    // Auto-derive the name + space_name so the form can stay essentials-only.
    // The /api/auth/signup Zod schema requires both fields server-side; the user
    // can rename themselves in onboarding/settings and rename their space anytime.
    // Color theme defaults to Rowan brand emerald — customizable in Settings later.
    const derivedName = deriveNameFromEmail(email);
    const derivedSpaceName = inviteToken
      ? 'My Space' // invited users join the inviter's space; this is just their personal default
      : `${derivedName.split(' ')[0]}'s Space`;

    const { error } = await signUp(
      email,
      password,
      {
        name: derivedName,
        space_name: derivedSpaceName,
        color_theme: 'emerald',
        marketing_emails_enabled: false,
      },
      inviteToken || undefined
    );

    if (error) {
      // Handle specific error cases with user-friendly messages
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setError('An account with this email already exists');
      } else if (error.message.includes('Service temporarily unavailable')) {
        setError('Service temporarily unavailable. Please try again in a few minutes.');
      } else if (error.message.includes('Connection problem')) {
        setError('Connection problem. Please check your internet and try again.');
      } else if (error.message.includes('Too many requests')) {
        setError('Too many signup attempts. Please try again later.');
      } else if (error.message.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else {
        // Show the actual error message from the API (Supabase errors are already user-friendly)
        setError(error.message);
      }
      setIsLoading(false);
    } else {
      // Show success message
      setAccountCreated(true);

      // Wait 2 seconds before redirecting
      setTimeout(async () => {
        // Sign out the user to force them to log in again (bot prevention)
        await signOut();

        // If user signed up via invitation, redirect to login with a hint to accept invitation.
        // The invitation will be accepted after they log in.
        // NOTE: The redirect URL must be URL-encoded to preserve the token parameter.
        if (inviteToken) {
          const redirectUrl = `/invitations/accept?token=${encodeURIComponent(inviteToken)}`;
          router.push(`/login?registered=true&redirect=${encodeURIComponent(redirectUrl)}`);
        } else {
          // Regular signup - just go to login
          router.push('/login?registered=true');
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row transition-all duration-500">
      <MobileBrandHeader mounted={mounted} />
      <DesktopBrandPanel mounted={mounted} />

      {/* Right side - Sign up form */}
      <div className="flex-1 lg:w-1/2 bg-gray-950 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <motion.div
          className="w-full max-w-md py-10 bg-gray-900/95 p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-800/50 my-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div className="mb-8" variants={itemVariants}>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              {accountCreated ? 'Welcome to Rowan!' : 'Create Account'}
            </h2>
            <p className="text-gray-400 text-lg">
              {accountCreated
                ? 'Redirecting you to login...'
                : 'Just the essentials — you can personalize everything later.'}
            </p>
          </motion.div>

          {/* Sign up form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 bg-red-900/10 border border-red-800/50 text-red-400 px-4 py-3 rounded-2xl text-sm leading-relaxed overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  data-testid="signup-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="alex@example.com"
                  disabled={isLoading}
                  autoFocus
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  data-testid="signup-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                  className="w-full pl-12 pr-14 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors p-2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </motion.div>

            {/* Age Gate (13+) — COPPA posture, required */}
            <motion.div
              variants={itemVariants}
              className="flex items-start gap-4 p-5 bg-gray-800/40 border border-gray-700/60 rounded-2xl"
            >
              <input
                type="checkbox"
                id="ageConfirmed"
                data-testid="signup-age-checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                disabled={isLoading}
                required
                className="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-emerald-500/50 transition-all duration-200 mt-1 cursor-pointer"
              />
              <label htmlFor="ageConfirmed" className="text-sm text-gray-200 cursor-pointer leading-relaxed">
                <span className="font-bold">I am 13 years of age or older</span>
                <p className="text-gray-400 mt-1.5">
                  Rowan is intended for users 13+. Parents and guardians may create child sub-profiles within their household. See our{' '}
                  <Link href="/privacy#childrens-privacy" className="text-emerald-400 underline">
                    Privacy Policy
                  </Link>{' '}
                  for details.
                </p>
              </label>
            </motion.div>

            {/* ToS / Privacy agreement — required */}
            <motion.div
              variants={itemVariants}
              className="flex items-start gap-4 p-5 bg-gray-800/40 border border-gray-700/60 rounded-2xl"
            >
              <input
                type="checkbox"
                id="tosAgreed"
                data-testid="signup-tos-checkbox"
                checked={tosAgreed}
                onChange={(e) => setTosAgreed(e.target.checked)}
                disabled={isLoading}
                required
                className="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-emerald-500/50 transition-all duration-200 mt-1 cursor-pointer"
              />
              <label htmlFor="tosAgreed" className="text-sm text-gray-200 cursor-pointer leading-relaxed">
                <span className="font-bold">I agree to the Terms and Privacy Policy</span>
                <p className="text-gray-400 mt-1.5">
                  By creating an account you accept our{' '}
                  <Link href="/terms" className="text-emerald-400 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-emerald-400 underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </label>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              variants={itemVariants}
              type="submit"
              data-testid="signup-submit-button"
              disabled={isLoading || !ageConfirmed || !tosAgreed}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-gray-900 transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Your Account
                </>
              )}
            </motion.button>
          </form>

          {/* Sign in link */}
          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-gray-400 text-md font-medium">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-all duration-200 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
