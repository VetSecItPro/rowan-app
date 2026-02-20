'use client';

/**
 * AIOnboardingModal — Multi-step intro to Rowan AI
 *
 * One-time modal that introduces users to AI capabilities.
 * Shows 3 slides with capabilities and example prompts.
 * Only shown once per user (localStorage: rowan_ai_onboarding_seen).
 *
 * @task #45 from launch readiness list
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckSquare,
  ChefHat,
  Calendar,
  ShoppingCart,
  Target,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface AIOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}

const SLIDES = [
  {
    id: 'intro',
    title: 'Meet Rowan, your AI assistant',
    description: 'Rowan can help you manage your household through natural conversation.',
    icon: Sparkles,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  {
    id: 'capabilities',
    title: 'What Rowan can do',
    description: 'Rowan helps with all aspects of household management',
    capabilities: [
      {
        icon: CheckSquare,
        label: 'Create and manage tasks',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
      },
      {
        icon: ChefHat,
        label: 'Plan meals and recipes',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
      },
      {
        icon: Calendar,
        label: 'Organize your calendar',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
      },
      {
        icon: ShoppingCart,
        label: 'Track shopping lists',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
      },
      {
        icon: Target,
        label: 'Set goals and budgets',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
      },
    ],
  },
  {
    id: 'try-it',
    title: 'Try it now',
    description: 'Here are some examples to get you started',
    examples: [
      "Add 'buy groceries' to my tasks",
      "What's for dinner this week?",
      'Show me my calendar for tomorrow',
    ],
  },
];

/** Renders a multi-step onboarding modal introducing the AI assistant. */
export function AIOnboardingModal({ isOpen, onClose, onOpenChat }: AIOnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const prevOpenRef = useRef(isOpen);

  // Reset to first slide when modal opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setCurrentSlide(0);
      setDirection(0);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === SLIDES.length - 1;
  const currentSlideData = SLIDES[currentSlide];

  const handleNext = () => {
    if (!isLastSlide) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstSlide) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleDotClick = (index: number) => {
    if (index !== currentSlide) {
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
    }
  };

  const handleOpenChat = () => {
    onOpenChat();
    onClose();
  };

  const handleMaybeLater = () => {
    onClose();
  };

  // Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80"
            onClick={handleMaybeLater}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-onboarding-title"
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full sm:max-w-lg bg-gradient-to-b from-gray-800 to-gray-900 border-t border-x sm:border border-gray-700/50 rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleMaybeLater}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
              aria-label="Close onboarding"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content area with fixed height for smooth transitions */}
            <div className="px-6 pt-8 pb-6 min-h-[420px] flex flex-col">
              {/* Slide container */}
              <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentSlide}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    className="absolute inset-0"
                  >
                    {/* Slide 1: Intro */}
                    {currentSlideData.id === 'intro' && (
                      <div className="flex flex-col items-center text-center h-full justify-center">
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                          className={`w-20 h-20 rounded-2xl ${currentSlideData.iconBg} flex items-center justify-center mb-5 shadow-xl shadow-blue-600/10`}
                        >
                          <Sparkles className={`w-10 h-10 ${currentSlideData.iconColor}`} />
                        </motion.div>
                        <h2
                          id="ai-onboarding-title"
                          className="text-2xl font-bold text-white mb-3"
                        >
                          {currentSlideData.title}
                        </h2>
                        <p className="text-base text-gray-400 leading-relaxed max-w-md">
                          {currentSlideData.description}
                        </p>
                      </div>
                    )}

                    {/* Slide 2: Capabilities */}
                    {currentSlideData.id === 'capabilities' && (
                      <div className="h-full flex flex-col">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-white mb-2">
                            {currentSlideData.title}
                          </h2>
                          <p className="text-sm text-gray-400">
                            {currentSlideData.description}
                          </p>
                        </div>
                        <div className="space-y-3 flex-1">
                          {currentSlideData.capabilities?.map((cap, idx) => {
                            const Icon = cap.icon;
                            return (
                              <motion.div
                                key={idx}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.08 }}
                                className="flex items-center gap-3 bg-gray-900/50 rounded-xl p-3.5 border border-gray-700/30"
                              >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${cap.bg} flex items-center justify-center`}>
                                  <Icon className={`w-5 h-5 ${cap.color}`} />
                                </div>
                                <span className="text-sm font-medium text-white">
                                  {cap.label}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Slide 3: Try it */}
                    {currentSlideData.id === 'try-it' && (
                      <div className="h-full flex flex-col">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-white mb-2">
                            {currentSlideData.title}
                          </h2>
                          <p className="text-sm text-gray-400">
                            {currentSlideData.description}
                          </p>
                        </div>
                        <div className="space-y-2.5 flex-1 mb-6">
                          {currentSlideData.examples?.map((example, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.08 }}
                              className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3.5"
                            >
                              <p className="text-sm text-blue-200 font-medium">
                                &ldquo;{example}&rdquo;
                              </p>
                            </motion.div>
                          ))}
                        </div>
                        <div className="space-y-2.5">
                          <button
                            onClick={handleOpenChat}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-98"
                          >
                            <Sparkles className="w-5 h-5" />
                            Open Chat
                          </button>
                          <button
                            onClick={handleMaybeLater}
                            className="w-full px-5 py-3 text-gray-400 hover:text-gray-300 text-sm font-medium transition-colors"
                          >
                            Maybe Later
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-2 mt-6 mb-4">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleDotClick(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? 'bg-blue-500 w-8'
                        : 'bg-gray-600 w-2 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === currentSlide ? 'true' : 'false'}
                  />
                ))}
              </div>

              {/* Navigation buttons (hidden on last slide) */}
              {!isLastSlide && (
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={handleBack}
                    disabled={isFirstSlide}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      isFirstSlide
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                    }`}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95"
                    aria-label="Next slide"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
