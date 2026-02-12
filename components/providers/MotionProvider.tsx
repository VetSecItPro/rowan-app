'use client';

import { MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Global Framer Motion configuration provider
 * Respects user's prefers-reduced-motion system preference
 *
 * When user has reduced motion enabled:
 * - All animations use minimal/instant durations
 * - Spring animations are converted to basic transitions
 * - Complex animations are simplified
 *
 * Works in conjunction with globals.css reduced motion rules
 * for comprehensive accessibility support across CSS and JS animations
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
