'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/**
 * Sticky bottom CTA bar that appears on mobile after scrolling past
 * the hero section. Fades in/out smoothly and provides a persistent
 * "Start Free" button + sign-in link so the user never has to scroll
 * back up to take action.
 */
export function MobileStickyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const SHOW_THRESHOLD = 600; // px scrolled before bar appears

    const handleScroll = () => {
      setVisible(window.scrollY > SHOW_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-50 md:hidden"
        >
          {/* Gradient fade into bar */}
          <div className="h-6 bg-gradient-to-t from-gray-950 to-transparent" />

          <div className="bg-gray-950/95 backdrop-blur-lg border-t border-gray-800/50 px-4 pb-[env(safe-area-inset-bottom,12px)] pt-3">
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              <Link
                href="/signup"
                className="flex-1 text-center py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] transition-all"
              >
                Start Free
              </Link>
              <Link
                href="/login"
                className="py-3 px-5 rounded-xl font-medium text-sm text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
