'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Grid3X3,
  Users,
  Rocket,
  ChevronRight,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'onboarding_completed';

interface OnboardingCarouselProps {
  onComplete: () => void;
}

interface SlideContent {
  icon: React.ElementType | null;
  title: string;
  subtitle: string;
  showLogo: boolean;
  showCta: boolean;
}

const slides: SlideContent[] = [
  {
    icon: null,
    title: 'Welcome to Rowan',
    subtitle: 'Your household, finally in sync',
    showLogo: true,
    showCta: false,
  },
  {
    icon: LayoutGrid,
    title: 'Your Command Center',
    subtitle: 'See tasks, events, meals, and more \u2014 all in one dashboard',
    showLogo: false,
    showCta: false,
  },
  {
    icon: Grid3X3,
    title: '9 Features, One App',
    subtitle:
      'Tasks, calendar, reminders, messages, shopping, meals, budget, goals, and daily check-ins',
    showLogo: false,
    showCta: false,
  },
  {
    icon: Users,
    title: 'Better Together',
    subtitle: 'Invite your household to stay in sync in real-time',
    showLogo: false,
    showCta: false,
  },
  {
    icon: Rocket,
    title: "You're All Set!",
    subtitle: "Let's get your household organized",
    showLogo: false,
    showCta: true,
  },
];

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

/** Renders a step-by-step onboarding carousel introducing app features. */
export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  // Lazy initializer checks localStorage once — avoids setState in effect
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const markComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const goToNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  }, [currentSlide]);

  const goToPrevious = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  const handleSkip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const handleGetStarted = useCallback(() => {
    markComplete();
  }, [markComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, handleSkip]);

  if (!isVisible) return null;

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const SlideIcon = slide.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Skip button */}
        {!isLastSlide && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            aria-label="Skip onboarding"
          >
            Skip
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Slide content */}
        <div className="relative h-80 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8"
            >
              {/* Icon or logo area */}
              {slide.showLogo ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-900/40"
                >
                  <span className="text-3xl font-bold text-white tracking-tight">
                    R
                  </span>
                </motion.div>
              ) : SlideIcon ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-6 shadow-lg"
                >
                  <SlideIcon className="w-10 h-10 text-purple-400" />
                </motion.div>
              ) : null}

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold text-white text-center mb-3"
              >
                {slide.title}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-gray-400 text-center max-w-xs leading-relaxed"
              >
                {slide.subtitle}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div className="px-8 pb-8 pt-2">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentSlide ? 1 : -1);
                  setCurrentSlide(index);
                }}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-6 bg-purple-500'
                    : 'w-2 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevious}
              disabled={currentSlide === 0}
              className={`text-sm font-medium transition-colors ${
                currentSlide === 0
                  ? 'text-gray-700 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-label="Previous slide"
            >
              Back
            </button>

            {isLastSlide ? (
              <button
                onClick={handleGetStarted}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-900/30 transition-all active:scale-95"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={goToNext}
                className="flex items-center gap-1 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors active:scale-95"
                aria-label="Next slide"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
