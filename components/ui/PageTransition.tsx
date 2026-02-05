'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Page transition wrapper that adds a subtle fade-in on mount.
 *
 * Wrap each page's content with this component for a polished entrance.
 * Uses a fast, lightweight animation (150ms) that avoids layout shift.
 *
 * Usage in a page.tsx:
 *   import { PageTransition } from '@/components/ui/PageTransition';
 *   export default function MyPage() {
 *     return <PageTransition>...content...</PageTransition>;
 *   }
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
