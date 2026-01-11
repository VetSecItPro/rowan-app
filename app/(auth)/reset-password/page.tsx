'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useValidatedSearchParams, AuthCallbackParamsSchema } from '@/lib/hooks/useValidatedSearchParams';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

// Password strength calculator
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  requirements: { label: string; met: boolean }[];
} {
  const requirements = [
    { label: 'At least 10 characters', met: password.length >= 10 },
    { label: 'At least 12 characters (recommended)', met: password.length >= 12 },
    { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Number (0-9)', met: /\d/.test(password) },
    { label: 'Special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  // Calculate score based on requirements met
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  // Bonus for length
  if (password.length >= 16) score += 1;

  // Determine label and color based on score
  let label: string;
  let color: string;
  let bgColor: string;

  if (score <= 2) {
    label = 'Weak';
    color = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-500';
  } else if (score <= 4) {
    label = 'Fair';
    color = 'text-orange-600 dark:text-orange-400';
    bgColor = 'bg-orange-500';
  } else if (score <= 5) {
    label = 'Good';
    color = 'text-yellow-600 dark:text-yellow-400';
    bgColor = 'bg-yellow-500';
  } else {
    label = 'Strong';
    color = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-500';
  }

  return { score: Math.min(score, 7), label, color, bgColor, requirements };
}

// Password Strength Meter Component
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Password Strength</span>
          <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${strength.bgColor} transition-all duration-300 ease-out`}
            style={{ width: `${(strength.score / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 gap-1.5">
        {strength.requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-xs transition-colors ${req.met
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-400 dark:text-gray-500'
              }`}
          >
            {req.met ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const { params, error: validationError } = useValidatedSearchParams(AuthCallbackParamsSchema);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if we have the necessary tokens/session
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Check for validation errors first
      if (validationError) {
        setError('Invalid reset link format');
        setIsCheckingSession(false);
        return;
      }

      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      // Check if user came here from a password reset link (Supabase native)
      const accessToken = params?.access_token;
      const refreshToken = params?.refresh_token;

      // Check if user came here from our custom reset link
      const customToken = params?.token;

      if (accessToken && refreshToken) {
        // User clicked Supabase native password reset link
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else {
            setHasValidSession(true);
          }
        } catch (err) {
          setError('Failed to validate reset link. Please try again.');
        }
      } else if (customToken) {
        // User clicked our custom reset link - validate the token
        try {
          const response = await fetch(`/api/auth/password-reset/verify?token=${customToken}`);
          const data = await response.json();

          if (data.valid) {
            setHasValidSession(true);
          } else {
            setError(data.error || 'Invalid or expired reset link. Please request a new password reset.');
          }
        } catch (err) {
          setError('Failed to validate reset link. Please try again.');
        }
      } else if (session) {
        // User is already logged in
        setHasValidSession(true);
      } else {
        setError('No valid reset session found. Please request a new password reset.');
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [params, validationError]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];

    if (pwd.length < 10) {
      errors.push('Password must be at least 10 characters long');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(pwd)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('. '));
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const customToken = params?.token;

      if (customToken) {
        // Use our custom password reset API
        const response = await fetch('/api/auth/password-reset/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: customToken,
            password: password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to update password. Please try again.');
          return;
        }
      } else {
        // Use Supabase's built-in password update (for native reset links)
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          setError('Failed to update password. Please try again.');
          return;
        }
      }

      setSuccess(true);

      // Redirect to sign-in page after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Verifying your link...</p>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 p-4">
        <motion.div
          className="max-w-md w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 dark:border-gray-800/50 text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div className="w-20 h-20 bg-green-100/50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner" variants={itemVariants}>
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </motion.div>
          <motion.h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight" variants={itemVariants}>
            Password Updated!
          </motion.h1>
          <motion.p className="text-gray-600 dark:text-gray-400 mb-8 text-lg" variants={itemVariants}>
            Your password has been successfully updated. Redirecting you to login...
          </motion.p>
          <motion.div className="flex justify-center" variants={itemVariants}>
            <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 p-4">
        <motion.div
          className="max-w-md w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 dark:border-gray-800/50 text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div className="w-20 h-20 bg-red-100/50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner" variants={itemVariants}>
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </motion.div>
          <motion.h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight" variants={itemVariants}>
            Invalid Link
          </motion.h1>
          <motion.p className="text-gray-600 dark:text-gray-400 mb-10 text-lg leading-relaxed" variants={itemVariants}>
            {error || 'This password reset link is invalid or has expired. Please request a new one.'}
          </motion.p>
          <motion.div variants={itemVariants}>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl hover:from-red-600 hover:to-rose-700 transition-all font-bold shadow-lg shadow-red-500/20 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Sign In
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 p-4">
      <motion.div
        className="max-w-md w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 dark:border-gray-800/50"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div className="text-center mb-10" variants={itemVariants}>
          <div className="w-20 h-20 bg-purple-100/50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Create a secure new password for your account
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/50 rounded-2xl overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Password */}
          <motion.div variants={itemVariants}>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-14 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300 text-base md:text-sm shadow-sm"
                placeholder="Enter your new password"
                required
                minLength={10}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            <PasswordStrengthMeter password={password} />
          </motion.div>

          {/* Confirm Password */}
          <motion.div variants={itemVariants}>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
              Confirm New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-24 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300 text-base md:text-sm shadow-sm"
                placeholder="Confirm your new password"
                required
                minLength={10}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {confirmPassword && password && confirmPassword === password && (
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Match
                  </span>
                )}
                {confirmPassword && password && confirmPassword !== password && (
                  <span className="text-xs font-bold text-red-500 dark:text-red-400">
                    No match
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full px-4 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-bold hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transform hover:-translate-y-0.5"
          >
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Update Password
              </>
            )}
          </motion.button>
        </form>

        {/* Back to Sign In */}
        <motion.div className="mt-10 text-center" variants={itemVariants}>
          <Link
            href="/login"
            className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 font-bold flex items-center justify-center gap-2 group transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Sign In
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
