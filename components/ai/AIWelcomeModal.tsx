'use client';

/**
 * AIWelcomeModal — One-time welcome modal introducing Rowan AI
 *
 * Shows on first visit when ai_onboarding_seen === false.
 * Highlights 3 core capabilities, then marks onboarding as seen.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  MessageSquare,
  Calendar,
  ShoppingCart,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

interface AIWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryIt: () => void;
}

const CAPABILITIES = [
  {
    icon: MessageSquare,
    title: 'Ask Anything',
    description: "What's for dinner? Who has soccer practice? Just ask and Rowan will find the answer from your household data.",
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Calendar,
    title: 'Manage Your Schedule',
    description: 'Add tasks, create events, and set reminders — all through natural conversation.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: ShoppingCart,
    title: 'Simplify Your Lists',
    description: '"Add milk and eggs to the grocery list." Rowan handles it instantly.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
];

/** Renders a welcome modal introducing the AI companion and its capabilities. */
export function AIWelcomeModal({ isOpen, onClose, onTryIt }: AIWelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === CAPABILITIES.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onTryIt();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/85"
            onClick={handleSkip}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-welcome-title"
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full sm:max-w-md bg-gray-800 border-t border-x sm:border border-gray-700/50 rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with AI branding */}
            <div className="pt-8 pb-4 px-6 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20"
              >
                <Bot className="w-9 h-9 text-white" />
              </motion.div>

              <h2
                id="ai-welcome-title"
                className="text-xl font-bold text-white mb-1"
              >
                Meet Rowan AI
              </h2>
              <p className="text-sm text-gray-400">
                Your personal household assistant
              </p>
            </div>

            {/* Capability cards — step through */}
            <div className="px-6 pb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30"
                >
                  {(() => {
                    const cap = CAPABILITIES[currentStep];
                    const Icon = cap.icon;
                    return (
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${cap.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${cap.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">
                            {cap.title}
                          </h3>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {cap.description}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {CAPABILITIES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === currentStep
                        ? 'bg-blue-500 w-6'
                        : 'bg-gray-600 w-1.5 hover:bg-gray-500'
                    }`}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Privacy notice */}
            <p className="px-6 text-[11px] text-gray-400 leading-relaxed text-center">
              Rowan AI uses Google Gemini. First names and household data (tasks, events, lists) are shared with Google to personalize responses. Passwords and financial accounts are never shared.
            </p>

            {/* Footer actions */}
            <div className="px-6 pb-6 pt-2 flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95"
              >
                {isLastStep ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Try It Now
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
