'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FirstUseTooltipProps {
  id: string;
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const STORAGE_PREFIX = 'tooltip_seen_';
const AUTO_DISMISS_MS = 5_000;

const slideVariants = {
  top: { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } },
  bottom: { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 } },
  left: { initial: { opacity: 0, x: 6 }, animate: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 } },
};

const positionStyles: Record<string, React.CSSProperties> = {
  top: {
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 10,
  },
  bottom: {
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: 10,
  },
  left: {
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginRight: 10,
  },
  right: {
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: 10,
  },
};

// Arrow pointing toward the target element
const arrowStyles: Record<string, string> = {
  top: 'left-1/2 top-full -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-700',
  bottom: 'left-1/2 bottom-full -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-700',
  left: 'top-1/2 left-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-700',
  right: 'top-1/2 right-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-700',
};

/** Displays a one-time tooltip hint on first use of a feature. */
export default function FirstUseTooltip({
  id,
  content,
  children,
  position = 'top',
  delay = 1000,
}: FirstUseTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, 'true');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [id]);

  useEffect(() => {
    // Already seen
    if (localStorage.getItem(`${STORAGE_PREFIX}${id}`) === 'true') return;

    delayTimerRef.current = setTimeout(() => {
      setVisible(true);
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    }, delay);

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, delay, dismiss]);

  const variant = slideVariants[position];

  return (
    <div className="relative inline-flex" onClick={visible ? dismiss : undefined}>
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={variant.initial}
            animate={variant.animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 w-56"
            style={positionStyles[position]}
          >
            <div className="relative rounded-lg bg-gray-700 px-3 py-2.5 shadow-xl">
              {/* Arrow */}
              <div
                className={`absolute h-0 w-0 border-[6px] ${arrowStyles[position]}`}
              />

              <p className="text-sm leading-snug text-white">{content}</p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                className="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
