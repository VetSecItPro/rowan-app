'use client';

/**
 * Payment Canceled Page
 * Shown when user cancels Stripe checkout
 */

import Link from 'next/link';
import { XCircle, ArrowLeft, CreditCard, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentCanceledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Canceled Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        >
          <XCircle className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
        >
          No worries!
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 dark:text-gray-400 mb-8"
        >
          Your payment was canceled. No charges were made to your account.
        </motion.p>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8 text-left"
        >
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">What happened?</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The checkout process was canceled before completion. This could happen if:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>You closed the payment window</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>You clicked the back button</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>There was a connection issue</span>
            </li>
          </ul>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-white font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
          >
            <CreditCard className="h-4 w-4" />
            <span>Try Again</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue with Free Plan</span>
          </Link>
        </motion.div>

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-xs text-gray-400 dark:text-gray-500"
        >
          Questions? Contact us at{' '}
          <a href="mailto:support@rowanapp.com" className="text-emerald-600 hover:underline">
            support@rowanapp.com
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
