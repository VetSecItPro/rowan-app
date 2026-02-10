'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Mail, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic client-side validation
    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      // Use our custom API route which uses Resend for emails
      const response = await csrfFetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email. Please try again.');
      } else {
        setEmailSent(true);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <motion.div
          className="w-full max-w-md bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-800/50"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div className="flex items-center justify-center mb-8" variants={itemVariants}>
            <div className="w-20 h-20 bg-emerald-900/20 rounded-full flex items-center justify-center shadow-inner">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
          </motion.div>
          <motion.h2 className="text-3xl font-extrabold text-center text-white mb-3" variants={itemVariants}>
            Check Your Email
          </motion.h2>
          <motion.p className="text-center text-gray-400 mb-8 text-lg" variants={itemVariants}>
            We&apos;ve sent a password reset link to <span className="font-bold text-emerald-400">{email}</span>
          </motion.p>
          <motion.p className="text-center text-sm text-gray-500 mb-8 leading-relaxed" variants={itemVariants}>
            Didn&apos;t receive the email? Check your spam folder or try again with a different email address.
          </motion.p>
          <motion.div className="flex justify-center" variants={itemVariants}>
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 text-md font-bold flex items-center gap-2 group transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-inter">
      <motion.div
        className="w-full max-w-md bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-800/50"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div className="flex items-center justify-center mb-8" variants={itemVariants}>
          <div className="w-20 h-20 bg-emerald-900/20 rounded-full flex items-center justify-center shadow-inner">
            <Mail className="w-10 h-10 text-emerald-400" />
          </div>
        </motion.div>

        <motion.h2 className="text-3xl font-extrabold text-center text-white mb-3 tracking-tight" variants={itemVariants}>
          Forgot Password?
        </motion.h2>
        <motion.p className="text-center text-gray-400 mb-10 text-lg leading-relaxed" variants={itemVariants}>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </motion.p>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-5 bg-red-900/10 border border-red-800/50 rounded-2xl overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-200">Error</p>
                  <p className="text-sm text-red-300 mt-1 leading-relaxed font-medium">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <motion.div variants={itemVariants}>
            <label htmlFor="email" className="block text-sm font-bold text-gray-300 mb-3 ml-1">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none text-white placeholder-gray-400 transition-all duration-300 text-base md:text-sm shadow-sm"
                placeholder="john@example.com"
                required
                autoComplete="email"
              />
            </div>
          </motion.div>

          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-gray-900 transform hover:-translate-y-0.5 mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending Reset Email...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Send Reset Email
              </>
            )}
          </motion.button>
        </form>

        {/* Back to Login */}
        <motion.div className="mt-10 text-center" variants={itemVariants}>
          <Link
            href="/login"
            className="text-gray-400 hover:text-emerald-400 font-bold flex items-center justify-center gap-2 group transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
