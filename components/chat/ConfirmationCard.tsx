/**
 * ConfirmationCard — Action approval card shown inline in chat
 *
 * Displays what the AI wants to do and lets the user confirm or cancel.
 * Color-coded by feature type.
 */

'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { ConfirmationEvent, FeatureType } from '@/lib/types/chat';

interface ConfirmationCardProps {
  confirmation: ConfirmationEvent;
  onConfirm: (confirmed: boolean) => void;
}

const FEATURE_BORDER_COLORS: Record<FeatureType, string> = {
  task: 'border-blue-500/40',
  chore: 'border-amber-500/40',
  event: 'border-purple-500/40',
  reminder: 'border-pink-500/40',
  shopping: 'border-emerald-500/40',
  meal: 'border-orange-500/40',
  goal: 'border-indigo-500/40',
  expense: 'border-red-500/40',
  budget: 'border-green-500/40',
  project: 'border-cyan-500/40',
  reward: 'border-yellow-500/40',
  message: 'border-green-500/40',
  general: 'border-gray-500/40',
};

const FEATURE_BADGE_COLORS: Record<FeatureType, string> = {
  task: 'bg-blue-500/20 text-blue-300',
  chore: 'bg-amber-500/20 text-amber-300',
  event: 'bg-purple-500/20 text-purple-300',
  reminder: 'bg-pink-500/20 text-pink-300',
  shopping: 'bg-emerald-500/20 text-emerald-300',
  meal: 'bg-orange-500/20 text-orange-300',
  goal: 'bg-indigo-500/20 text-indigo-300',
  expense: 'bg-red-500/20 text-red-300',
  budget: 'bg-green-500/20 text-green-300',
  project: 'bg-cyan-500/20 text-cyan-300',
  reward: 'bg-yellow-500/20 text-yellow-300',
  message: 'bg-green-500/20 text-green-300',
  general: 'bg-gray-500/20 text-gray-300',
};

/** Displays a confirmation prompt card for AI-suggested actions. */
export default function ConfirmationCard({
  confirmation,
  onConfirm,
}: ConfirmationCardProps) {
  const { featureType, previewText } = confirmation;
  const borderColor = FEATURE_BORDER_COLORS[featureType] ?? FEATURE_BORDER_COLORS.general;
  const badgeColor = FEATURE_BADGE_COLORS[featureType] ?? FEATURE_BADGE_COLORS.general;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`w-full rounded-xl border ${borderColor} bg-gray-800/80 p-3`}
    >
      {/* Feature badge */}
      <span
        className={`inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor} mb-2`}
      >
        {featureType}
      </span>

      {/* Preview text */}
      <p className="text-sm text-gray-200 mb-3">{previewText}</p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(true)}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          Confirm
        </button>
        <button
          onClick={() => onConfirm(false)}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
