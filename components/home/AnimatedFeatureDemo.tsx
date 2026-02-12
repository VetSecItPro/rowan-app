'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig, useInView, useReducedMotion } from 'framer-motion';
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
  const prefersReducedMotion = useReducedMotion();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-100px" });

  const currentStep = steps[currentStepIndex];
  const stepDuration = currentStep?.duration || 6000;

  const clearCurrentInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCurrentInterval();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleTouchStart = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    resumeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setIsPaused(false);
    }, 5000);
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`rounded-2xl bg-gray-900/80 border border-gray-800 overflow-hidden relative ${className}`}
    >
      <div className="p-5">
        <div className="mb-2 min-h-[16px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStepIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
              className="text-xs text-gray-500"
            >
              {currentStep.label}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="relative h-[320px] flex items-start justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
              className="w-full"
            >
              <MotionConfig reducedMotion="user">
                {currentStep.content}
              </MotionConfig>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {isPaused && (
              <>
                <div aria-live="polite" className="sr-only">Animation paused</div>
                <motion.div
                  initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.8 }}
                  transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
                  className="absolute top-2 right-2"
                >
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <Pause className="w-3 h-3 text-gray-400" />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-0 justify-center mt-4">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => setCurrentStepIndex(index)}
              className="group cursor-pointer p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
              aria-label={`Go to step ${index + 1}: ${step.label}`}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: prefersReducedMotion ? 1 : (currentStepIndex === index ? 1.2 : 1),
                }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
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
