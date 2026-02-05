'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Pause } from 'lucide-react';

export interface DemoStep {
  label: string;
  content: React.ReactNode;
  duration?: number;
}

export interface AnimatedFeatureDemoProps {
  featureName: string;
  colorScheme: {
    primary: string;
    secondary: string;
    gradient: string;
  };
  steps: DemoStep[];
  className?: string;
}

export function AnimatedFeatureDemo({
  featureName,
  colorScheme,
  steps,
  className = ""
}: AnimatedFeatureDemoProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-100px" });

  const currentStep = steps[currentStepIndex];
  const stepDuration = currentStep?.duration || 3000;

  // Cleanup function for interval
  const clearCurrentInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Step cycling logic
  useEffect(() => {
    // Only run animation when visible and not paused
    if (!isInView || isPaused || steps.length === 0) {
      clearCurrentInterval();
      return;
    }

    clearCurrentInterval();

    intervalRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % steps.length);
    }, stepDuration);

    return () => {
      clearCurrentInterval();
    };
  }, [currentStepIndex, stepDuration, isPaused, isInView, steps.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentInterval();
    };
  }, []);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`rounded-2xl bg-gray-900/80 border border-gray-800 overflow-hidden relative ${className}`}
    >
      <div className="p-5">
        {/* Step Label */}
        <div className="mb-2 min-h-[16px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStepIndex}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-gray-500"
            >
              {currentStep.label}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Demo Content Area */}
        <div className="relative min-h-[200px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {currentStep.content}
            </motion.div>
          </AnimatePresence>

          {/* Pause Indicator */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute top-2 right-2"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <Pause className="w-3 h-3 text-gray-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 justify-center mt-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStepIndex(index)}
              className="group cursor-pointer"
              aria-label={`Go to step ${index + 1}`}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: currentStepIndex === index ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  currentStepIndex === index
                    ? 'bg-white'
                    : 'bg-gray-700 group-hover:bg-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
